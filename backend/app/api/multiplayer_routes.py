import json
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.multiplayer_runtime import multiplayer_runtime
from app.services.multiplayer_store import multiplayer_store

router = APIRouter()


class PlayerBootstrapRequest(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    player_id: str | None = None


class AdminLoginRequest(BaseModel):
    password: str


class UpdateGameOrderRequest(BaseModel):
    password: str
    game_order: list[Literal["blitz", "rapid", "powers", "knockout"]]


class AdminUpdatePlayerRequest(BaseModel):
    password: str
    player_id: str
    points: int | None = Field(default=None, ge=0)
    harmony_tokens: int | None = Field(default=None, ge=0, le=3)


class AdminPlayerAccessRequest(BaseModel):
    password: str
    player_id: str
    allow: bool


class AdminTimeControlRequest(BaseModel):
    password: str
    format: Literal["blitz", "rapid", "powers", "knockout"]
    time_seconds: int = Field(ge=60, le=7200)
    increment: int = Field(ge=0, le=60)


class CompleteSessionRequest(BaseModel):
    winner_color: Literal["w", "b"] | None = None
    is_draw: bool = False


class AdminPairRoundRequest(BaseModel):
    password: str


@router.post("/api/v1/player/bootstrap")
async def bootstrap_player(payload: PlayerBootstrapRequest):
    player = multiplayer_store.bootstrap_player(payload.name, payload.player_id)
    return {"player": player}


@router.get("/api/v1/leaderboard")
async def leaderboard():
    return {"players": multiplayer_store.get_leaderboard()}


@router.get("/api/v1/round/state")
async def public_round_state():
    return multiplayer_store.get_public_round_state()


@router.get("/api/v1/session/{session_id}")
async def get_session(session_id: str):
    session = multiplayer_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": session}


@router.post("/api/v1/session/{session_id}/complete")
async def complete_session(session_id: str, payload: CompleteSessionRequest):
    session = multiplayer_store.complete_session(session_id, payload.winner_color, payload.is_draw)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": session, "leaderboard": multiplayer_store.get_leaderboard()}


@router.post("/api/v1/admin/login")
async def admin_login(payload: AdminLoginRequest):
    if payload.password != settings.ADMIN_PANEL_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"ok": True}

@router.get("/api/v1/admin/state")
async def admin_state(password: str = Query(...)):
    if password != settings.ADMIN_PANEL_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    await multiplayer_runtime.resolve_stale_ongoing_sessions(stale_seconds=120)
    multiplayer_store.resolve_orphan_sessions()
    state = multiplayer_store.admin_state()
    state["waiting_players"] = await multiplayer_runtime.get_waiting_players()
    return state

@router.post("/api/v1/admin/pair-round")
async def admin_pair_round(payload: AdminPairRoundRequest):
    if payload.password != settings.ADMIN_PANEL_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    result = await multiplayer_runtime.pair_waiting_round()
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return {"format": result["format"], "sessions": result["sessions"], "count": len(result["sessions"])}


@router.put("/api/v1/admin/game-order")
async def update_game_order(payload: UpdateGameOrderRequest):
    if payload.password != settings.ADMIN_PANEL_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    try:
        order = multiplayer_store.set_game_order(payload.game_order)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"game_order": order}


@router.put("/api/v1/admin/time-control")
async def update_time_control(payload: AdminTimeControlRequest):
    if payload.password != settings.ADMIN_PANEL_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    try:
        controls = multiplayer_store.set_time_control(payload.format, payload.time_seconds, payload.increment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"time_controls": controls}


@router.put("/api/v1/admin/player")
async def update_player_admin(payload: AdminUpdatePlayerRequest):
    if payload.password != settings.ADMIN_PANEL_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    try:
        player = multiplayer_store.update_player_admin(payload.player_id, payload.points, payload.harmony_tokens)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"player": player}


@router.put("/api/v1/admin/player-access")
async def update_player_access(payload: AdminPlayerAccessRequest):
    if payload.password != settings.ADMIN_PANEL_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    try:
        player = multiplayer_store.set_player_access(payload.player_id, payload.allow)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"player": player}


@router.websocket("/ws/multiplayer/waiting-room")
async def waiting_room_socket(websocket: WebSocket):
    await websocket.accept()
    player_id: str | None = None

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            message_type = message.get("type")

            if message_type == "join_waiting_room":
                player_id = str(message.get("player_id", "")).strip()
                player_name = str(message.get("player_name", "")).strip()
                if not player_id or not player_name:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Missing player details."}))
                    continue
                if not multiplayer_store.can_participate(player_id):
                    await websocket.send_text(
                        json.dumps({"type": "error", "message": "You are not eligible for the ready queue right now."})
                    )
                    continue
                await multiplayer_runtime.add_waiting(websocket, player_id, player_name)
                await websocket.send_text(
                    json.dumps({"type": "waiting", "message": "You are in queue. We will match you with someone new soon."})
                )
            elif message_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        if player_id:
            await multiplayer_runtime.remove_waiting(player_id, lock_player=False, websocket=websocket)


@router.websocket("/ws/multiplayer/game/{session_id}")
async def game_socket(websocket: WebSocket, session_id: str, player_id: str = Query(...)):
    session = multiplayer_store.get_session(session_id)
    if not session:
        await websocket.close(code=1008, reason="Session not found")
        return

    valid_players = {session["white_player_id"], session["black_player_id"]}
    if player_id not in valid_players:
        await websocket.close(code=1008, reason="Unauthorized player")
        return

    await websocket.accept()
    await multiplayer_runtime.connect_game(websocket, session_id, player_id)
    await websocket.send_text(json.dumps({"type": "session_snapshot", "session": session}))

    try:
        while True:
            raw = await websocket.receive_text()
            message: dict[str, Any] = json.loads(raw)
            message_type = message.get("type")

            if message_type == "state_sync":
                patch = message.get("state", {})
                updated = multiplayer_store.save_session_state(session_id, patch)
                if not updated:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Session missing."}))
                    continue

                await multiplayer_runtime.broadcast_to_opponent(
                    session_id,
                    player_id,
                    {
                        "type": "state_sync",
                        "state": {
                            "fen": updated.get("fen", "start"),
                            "current_turn": updated.get("current_turn", "w"),
                            "white_time": updated.get("white_time", 0),
                            "black_time": updated.get("black_time", 0),
                            "white_harmony_tokens": updated.get("white_harmony_tokens", 0),
                            "black_harmony_tokens": updated.get("black_harmony_tokens", 0),
                            "used_powers": updated.get("used_powers", {}),
                            "moves": updated.get("moves", []),
                        },
                        "session_id": session_id,
                    },
                )
            elif message_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif message_type == "game_over":
                winner_color = message.get("winner_color")
                is_draw = bool(message.get("is_draw", False))
                multiplayer_store.complete_session(session_id, winner_color, is_draw)
                await multiplayer_runtime.broadcast_to_session(
                    session_id,
                    {
                        "type": "game_over",
                        "winner_color": winner_color,
                        "is_draw": is_draw,
                        "leaderboard": multiplayer_store.get_leaderboard(),
                    },
                )
            elif message_type in {"move", "special_move", "token_used", "power_used", "surrender"}:
                # Transient action messages are intentionally ignored; state_sync is authoritative.
                continue
    except WebSocketDisconnect:
        # Reload/temporary disconnect should not auto-forfeit the match.
        # Session stays ongoing and player can reconnect using the same session_id.
        await multiplayer_runtime.disconnect_game(session_id, player_id, lock_player=False, websocket=websocket)



