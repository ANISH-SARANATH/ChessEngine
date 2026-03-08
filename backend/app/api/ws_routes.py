from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.services.ws_manager import ws_manager
from app.services.game_service import GameService
from app.core.database import teams_collection, games_collection
from app.models.schemas import GameStateUpdate
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/ws/game/{game_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    game_id: str,
    team_name: str = Query(...), 
    passcode: str = Query(...)
):
    # --- SECURITY CHECK 1: Verify Team Credentials ---
    team = await teams_collection.find_one({"team_name": team_name})
    if not team or team.get("passcode") != passcode:
        # Reject connection with a standard policy violation code
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid credentials")
        logger.warning(f"Unauthorized WS attempt for team: {team_name}")
        return

    # --- SECURITY CHECK 2: Verify Game Exists & Is Active ---
    game = await games_collection.find_one({"game_id": game_id})
    if not game:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Game not found")
        return
        
    # Reject late connections if the game is already over (Zombie fix)
    if game.get("status") == "completed":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Game already completed")
        logger.warning(f"Rejected late connection to completed game: {game_id}")
        return

    # --- SECURITY CHECK 3: Verify Team Belongs to this Game ---
    if game.get("team_a") != team_name and game.get("team_b") != team_name:
        # Team provided correct passcode, but they aren't playing in this specific match
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Not your match")
        logger.warning(f"Team {team_name} tried to join a game they aren't part of: {game_id}")
        return

    # --- Connection Accepted ---
    await ws_manager.connect(websocket, game_id)
    try:
        while True:
            # Wait for data from the client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue # Ignore malformed data silently

            # Broadcast the move/action to the opponent immediately
            await ws_manager.broadcast_to_game(game_id, message, sender=websocket)
            
            # Intercept Clock Drain events so they don't trigger the database save logic
            event_type = message.get("type", "move")
            if event_type == "clock_drain":
                logger.info(f"Clock drain executed in {game_id} against {message.get('target_team')}")
                continue
            
            # Save game state every 15 moves to prevent data loss on disconnects
            if "fen_string" in message and "move_count" in message:
                try:
                    state_data = GameStateUpdate(**message)
                    await GameService.save_game_state(state_data)
                except Exception as e:
                    logger.error(f"Failed to save game state: {e}")
                
    except WebSocketDisconnect:
        # Clean up the connection when the player drops or is kicked
        ws_manager.disconnect(websocket, game_id)