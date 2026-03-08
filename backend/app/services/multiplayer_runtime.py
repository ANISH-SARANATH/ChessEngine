import asyncio
import json
import random
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import WebSocket

from app.services.multiplayer_store import multiplayer_store


@dataclass
class WaitingClient:
    websocket: WebSocket
    player_id: str
    player_name: str


class MultiplayerRuntime:
    def __init__(self) -> None:
        self._waiting: dict[str, WaitingClient] = {}
        self._session_connections: dict[str, dict[str, WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def add_waiting(self, websocket: WebSocket, player_id: str, player_name: str) -> None:
        async with self._lock:
            existing = self._waiting.get(player_id)
            if existing:
                try:
                    await existing.websocket.close(code=1000, reason="Reconnected")
                except Exception:
                    pass
            self._waiting[player_id] = WaitingClient(websocket=websocket, player_id=player_id, player_name=player_name)

    async def remove_waiting(self, player_id: str, lock_player: bool = True, websocket: WebSocket | None = None) -> None:
        removed = False
        async with self._lock:
            existing = self._waiting.get(player_id)
            if not existing:
                removed = False
            elif websocket is not None and existing.websocket is not websocket:
                removed = False
            else:
                self._waiting.pop(player_id, None)
                removed = True
        if lock_player and removed:
            multiplayer_store.mark_player_disconnected(player_id)

    async def get_waiting_players(self) -> list[dict[str, str]]:
        async with self._lock:
            waiting = list(self._waiting.values())
            return [{"player_id": e.player_id, "player_name": e.player_name} for e in waiting]

    @staticmethod
    def _parse_iso(ts: str | None) -> datetime | None:
        if not ts:
            return None
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except ValueError:
            return None

    async def resolve_stale_ongoing_sessions(self, stale_seconds: int = 120) -> int:
        active_sessions = multiplayer_store.admin_state().get("active_sessions", [])
        async with self._lock:
            connected_session_ids = {sid for sid, peers in self._session_connections.items() if peers}

        cutoff = datetime.now(timezone.utc).timestamp() - stale_seconds
        resolved = 0
        for session in active_sessions:
            session_id = str(session.get("id", ""))
            if not session_id or session_id in connected_session_ids:
                continue

            updated = self._parse_iso(session.get("updated_at")) or self._parse_iso(session.get("created_at"))
            if not updated or updated.timestamp() > cutoff:
                continue

            completed = multiplayer_store.expire_session(session_id)
            if completed:
                resolved += 1

        return resolved

    def _non_repeating_pairs(self, player_ids: list[str], format_name: str) -> list[tuple[str, str]]:
        if len(player_ids) < 2:
            return []

        ids = player_ids[:]
        for _ in range(150):
            random.shuffle(ids)
            candidate: list[tuple[str, str]] = []
            ok = True
            for i in range(0, len(ids) - 1, 2):
                a = ids[i]
                b = ids[i + 1]
                if multiplayer_store.pair_used_in_format(a, b, format_name):
                    ok = False
                    break
                candidate.append((a, b))
            if ok:
                return candidate

        random.shuffle(ids)
        fallback: list[tuple[str, str]] = []
        for i in range(0, len(ids) - 1, 2):
            fallback.append((ids[i], ids[i + 1]))
        return fallback

    async def pair_waiting_round(self) -> dict:
        await self.resolve_stale_ongoing_sessions(stale_seconds=120)

        format_name = multiplayer_store.get_current_format()
        multiplayer_store.resolve_orphan_sessions()

        if multiplayer_store.has_active_sessions():
            return {"format": format_name, "sessions": [], "error": "Active games still running."}

        async with self._lock:
            waiting_ids = [pid for pid in self._waiting.keys() if multiplayer_store.can_participate(pid)]
            pairs = self._non_repeating_pairs(waiting_ids, format_name)

            if not pairs:
                return {"format": format_name, "sessions": []}

            selected: list[tuple[WaitingClient, WaitingClient]] = []
            for player_a, player_b in pairs:
                client_a = self._waiting.get(player_a)
                client_b = self._waiting.get(player_b)
                if not client_a or not client_b:
                    continue
                selected.append((client_a, client_b))

            for client_a, client_b in selected:
                self._waiting.pop(client_a.player_id, None)
                self._waiting.pop(client_b.player_id, None)

        sessions: list[dict] = []
        for client_a, client_b in selected:
            session = multiplayer_store.create_session(client_a.player_id, client_b.player_id, format_name)
            sessions.append(session)

            a_color = "w" if session["white_player_id"] == client_a.player_id else "b"
            b_color = "w" if session["white_player_id"] == client_b.player_id else "b"

            payload_a = {"type": "paired", "session": session, "player_id": client_a.player_id, "player_color": a_color}
            payload_b = {"type": "paired", "session": session, "player_id": client_b.player_id, "player_color": b_color}

            await client_a.websocket.send_text(json.dumps(payload_a))
            await client_b.websocket.send_text(json.dumps(payload_b))

            await client_a.websocket.close(code=1000, reason="Paired")
            await client_b.websocket.close(code=1000, reason="Paired")

        multiplayer_store.advance_format()
        return {"format": format_name, "sessions": sessions}

    async def connect_game(self, websocket: WebSocket, session_id: str, player_id: str) -> None:
        async with self._lock:
            self._session_connections.setdefault(session_id, {})[player_id] = websocket

    async def disconnect_game(
        self,
        session_id: str,
        player_id: str,
        lock_player: bool = True,
        websocket: WebSocket | None = None,
    ) -> None:
        removed = False
        async with self._lock:
            if session_id in self._session_connections:
                current = self._session_connections[session_id].get(player_id)
                if current and (websocket is None or current is websocket):
                    self._session_connections[session_id].pop(player_id, None)
                    removed = True
                if not self._session_connections[session_id]:
                    self._session_connections.pop(session_id, None)
        if lock_player and removed:
            multiplayer_store.mark_player_disconnected(player_id)

    async def broadcast_to_opponent(self, session_id: str, sender_player_id: str, payload: dict) -> None:
        async with self._lock:
            targets = self._session_connections.get(session_id, {})
            recipients = [ws for pid, ws in targets.items() if pid != sender_player_id]

        for ws in recipients:
            await ws.send_text(json.dumps(payload))

    async def broadcast_to_session(self, session_id: str, payload: dict) -> None:
        async with self._lock:
            targets = list(self._session_connections.get(session_id, {}).values())
        for ws in targets:
            await ws.send_text(json.dumps(payload))


multiplayer_runtime = MultiplayerRuntime()

