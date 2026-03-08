from fastapi import WebSocket
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_games: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, game_id: str):
        await websocket.accept()
        if game_id not in self.active_games:
            self.active_games[game_id] = []
        self.active_games[game_id].append(websocket)
        logger.info(f"Client connected to {game_id}. Total: {len(self.active_games[game_id])}")

    def disconnect(self, websocket: WebSocket, game_id: str):
        if game_id in self.active_games and websocket in self.active_games[game_id]:
            self.active_games[game_id].remove(websocket)
            if not self.active_games[game_id]:
                del self.active_games[game_id]
        logger.info(f"Client disconnected from {game_id}.")

    # --- NEW: Make sender optional so the server can broadcast system messages ---
    async def broadcast_to_game(self, game_id: str, message: dict, sender: WebSocket = None):
        if game_id in self.active_games:
            for connection in self.active_games[game_id]:
                if sender is None or connection != sender:
                    try:
                        await connection.send_text(json.dumps(message))
                    except Exception as e:
                        logger.error(f"Error broadcasting to client in {game_id}: {e}")
                        self.disconnect(connection, game_id)

    # --- NEW: Aggressive disconnect to kill zombie connections ---
    async def force_disconnect_game(self, game_id: str):
        """Forcefully disconnects all players when a game officially ends."""
        if game_id in self.active_games:
            # Create a copy of the list to iterate over since we are modifying it
            connections = self.active_games[game_id].copy()
            for connection in connections:
                try:
                    # 1000 is the standard code for normal closure
                    await connection.close(code=1000, reason="Game Completed")
                except Exception:
                    pass
            
            if game_id in self.active_games:
                del self.active_games[game_id]
            logger.info(f"Force closed all connections for completed game {game_id}")

ws_manager = ConnectionManager()