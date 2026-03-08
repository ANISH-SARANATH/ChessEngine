import json
import os
import random
import threading
import uuid
import time
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings

FORMAT_CONFIG: dict[str, dict[str, Any]] = {
    "blitz": {"time": 5 * 60, "increment": 3, "tokens": 0},
    "rapid": {"time": 10 * 60, "increment": 0, "tokens": 0},
    "powers": {"time": 10 * 60, "increment": 0, "tokens": 0},
    "knockout": {"time": 10 * 60, "increment": 3, "tokens": 3},
}

DEFAULT_GAME_ORDER = ["blitz", "rapid", "powers", "knockout"]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _pair_key(player_a: str, player_b: str) -> str:
    low, high = sorted([player_a, player_b])
    return f"{low}::{high}"


class MultiplayerStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._path = settings.STATE_FILE
        self._state: dict[str, Any] = self._load_or_create()
        self._last_persist_monotonic = 0.0
        self._persist_interval_seconds = 0.35

    def _default_state(self) -> dict[str, Any]:
        return {
            "players": {},
            "sessions": {},
            "game_order": DEFAULT_GAME_ORDER.copy(),
            "current_format_index": 0,
            "time_controls": deepcopy(FORMAT_CONFIG),
            "pair_history_by_format": {fmt: [] for fmt in DEFAULT_GAME_ORDER},
            "pair_history_global": [],
            "updated_at": _utc_now(),
        }

    def _load_or_create(self) -> dict[str, Any]:
        os.makedirs(os.path.dirname(self._path), exist_ok=True)
        if not os.path.exists(self._path):
            state = self._default_state()
            self._write_state(state)
            return state

        with open(self._path, "r", encoding="utf-8") as f:
            data = json.load(f)

        defaults = self._default_state()
        for key, default in defaults.items():
            data.setdefault(key, default)

        for fmt in DEFAULT_GAME_ORDER:
            data["pair_history_by_format"].setdefault(fmt, [])
            data["time_controls"].setdefault(fmt, deepcopy(FORMAT_CONFIG[fmt]))

        for player in data.get("players", {}).values():
            player.setdefault("included_in_event", True)
            player.setdefault("status", "active")
            player.setdefault("queue_bucket", "ready")

        return data

    def _write_state(self, state: dict[str, Any]) -> None:
        state["updated_at"] = _utc_now()
        with open(self._path, "w", encoding="utf-8") as f:
            json.dump(state, f, separators=(',', ':'))

    def _persist(self) -> None:
        self._write_state(self._state)

    def _persist_throttled(self, force: bool = False) -> None:
        now = time.monotonic()
        if force or now - self._last_persist_monotonic >= self._persist_interval_seconds:
            self._persist()
            self._last_persist_monotonic = now

    def get_current_format(self) -> str:
        order = self._state.get("game_order", DEFAULT_GAME_ORDER)
        idx = int(self._state.get("current_format_index", 0))
        return order[idx % len(order)]

    def advance_format(self) -> None:
        self._state["current_format_index"] = int(self._state.get("current_format_index", 0)) + 1

    def get_time_controls(self) -> dict[str, dict[str, Any]]:
        with self._lock:
            return deepcopy(self._state["time_controls"])

    def set_time_control(self, format_name: str, time_seconds: int, increment: int) -> dict[str, dict[str, Any]]:
        if format_name not in DEFAULT_GAME_ORDER:
            raise ValueError("Invalid format")
        if time_seconds < 60 or time_seconds > 7200:
            raise ValueError("Time must be between 60 and 7200 seconds")
        if increment < 0 or increment > 60:
            raise ValueError("Increment must be between 0 and 60 seconds")

        with self._lock:
            self._state["time_controls"][format_name]["time"] = int(time_seconds)
            self._state["time_controls"][format_name]["increment"] = int(increment)
            self._persist()
            return deepcopy(self._state["time_controls"])

    def bootstrap_player(self, name: str, player_id: str | None = None) -> dict[str, Any]:
        clean_name = name.strip() or "Player"
        with self._lock:
            if player_id and player_id in self._state["players"]:
                player = self._state["players"][player_id]
                player["name"] = clean_name
                player["included_in_event"] = True
                player["status"] = "active"
                player["queue_bucket"] = "ready"
                player["last_seen_at"] = _utc_now()
                self._persist()
                return deepcopy(player)

            new_id = player_id or f"p_{uuid.uuid4().hex[:10]}"
            player = {
                "id": new_id,
                "name": clean_name,
                "points": 0,
                "wins": 0,
                "losses": 0,
                "draws": 0,
                "games_played": 0,
                "harmony_tokens": 3,
                "included_in_event": True,
                "status": "active",
                "queue_bucket": "ready",
                "created_at": _utc_now(),
                "last_seen_at": _utc_now(),
            }
            self._state["players"][new_id] = player
            self._persist()
            return deepcopy(player)

    def can_participate(self, player_id: str) -> bool:
        with self._lock:
            player = self._state["players"].get(player_id)
            return bool(
                player
                and player.get("included_in_event", True)
                and player.get("queue_bucket", "ready") == "ready"
            )

    def set_player_access(self, player_id: str, allow: bool) -> dict[str, Any]:
        with self._lock:
            player = self._state["players"].get(player_id)
            if not player:
                raise ValueError("Player not found.")
            player["included_in_event"] = allow
            player["status"] = "active" if allow else "inactive"
            if not allow:
                player["queue_bucket"] = "runners"
            player["last_seen_at"] = _utc_now()
            self._persist()
            return deepcopy(player)

    def mark_player_disconnected(self, player_id: str) -> None:
        with self._lock:
            player = self._state["players"].get(player_id)
            if not player:
                return
            player["included_in_event"] = False
            player["status"] = "inactive"
            player["queue_bucket"] = "runners"
            player["last_seen_at"] = _utc_now()
            self._persist()

    def create_session(self, player_a: str, player_b: str, format_name: str) -> dict[str, Any]:
        with self._lock:
            if player_a not in self._state["players"] or player_b not in self._state["players"]:
                raise ValueError("Players must be registered before session creation.")

            config = self._state["time_controls"][format_name]
            white_id, black_id = (player_a, player_b)
            if random.choice([True, False]):
                white_id, black_id = black_id, white_id

            self._state["players"][white_id]["queue_bucket"] = "ready"
            self._state["players"][black_id]["queue_bucket"] = "ready"

            session_id = f"s_{uuid.uuid4().hex[:12]}"
            session = {
                "id": session_id,
                "format": format_name,
                "status": "ongoing",
                "white_player_id": white_id,
                "black_player_id": black_id,
                "white_player_name": self._state["players"][white_id]["name"],
                "black_player_name": self._state["players"][black_id]["name"],
                "current_turn": "w",
                "fen": "start",
                "moves": [],
                "white_time": config["time"],
                "black_time": config["time"],
                "increment": config["increment"],
                "white_harmony_tokens": config["tokens"],
                "black_harmony_tokens": config["tokens"],
                "used_powers": {
                    "white": {"convert": False, "leap": False, "trade": False, "resurrection": False},
                    "black": {"convert": False, "leap": False, "trade": False, "resurrection": False},
                },
                "winner_color": None,
                "winner_player_id": None,
                "created_at": _utc_now(),
                "updated_at": _utc_now(),
            }
            self._state["sessions"][session_id] = session

            pair = _pair_key(player_a, player_b)
            if pair not in self._state["pair_history_by_format"].setdefault(format_name, []):
                self._state["pair_history_by_format"][format_name].append(pair)
            if pair not in self._state["pair_history_global"]:
                self._state["pair_history_global"].append(pair)

            self._persist()
            return deepcopy(session)

    def pair_used_in_format(self, player_a: str, player_b: str, format_name: str) -> bool:
        with self._lock:
            pair = _pair_key(player_a, player_b)
            history = self._state.get("pair_history_by_format", {}).get(format_name, [])
            return pair in history

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        with self._lock:
            session = self._state["sessions"].get(session_id)
            return deepcopy(session) if session else None

    def save_session_state(self, session_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            session = self._state["sessions"].get(session_id)
            if not session:
                return None

            allowed_fields = {
                "fen",
                "current_turn",
                "white_time",
                "black_time",
                "white_harmony_tokens",
                "black_harmony_tokens",
                "used_powers",
                "moves",
            }
            changed_keys: set[str] = set()
            for key, value in patch.items():
                if key in allowed_fields:
                    session[key] = value
                    changed_keys.add(key)

            session["updated_at"] = _utc_now()
            # Realtime path: throttle disk writes to avoid websocket lag.
            if changed_keys:
                self._persist_throttled(force=False)
            return deepcopy(session)

    def complete_session(self, session_id: str, winner_color: str | None, is_draw: bool) -> dict[str, Any] | None:
        with self._lock:
            session = self._state["sessions"].get(session_id)
            if not session:
                return None
            if session["status"] == "completed":
                return deepcopy(session)

            white_id = session["white_player_id"]
            black_id = session["black_player_id"]
            white = self._state["players"][white_id]
            black = self._state["players"][black_id]

            white["games_played"] += 1
            black["games_played"] += 1

            if is_draw:
                white["draws"] += 1
                black["draws"] += 1
                white["queue_bucket"] = "ready"
                black["queue_bucket"] = "ready"
            else:
                if winner_color == "w":
                    white["wins"] += 1
                    black["losses"] += 1
                    white["points"] += 1
                    white["queue_bucket"] = "ready"
                    black["queue_bucket"] = "runners"
                    session["winner_player_id"] = white_id
                elif winner_color == "b":
                    black["wins"] += 1
                    white["losses"] += 1
                    black["points"] += 1
                    black["queue_bucket"] = "ready"
                    white["queue_bucket"] = "runners"
                    session["winner_player_id"] = black_id

            white["harmony_tokens"] = max(0, min(3, int(session.get("white_harmony_tokens", white["harmony_tokens"]))))
            black["harmony_tokens"] = max(0, min(3, int(session.get("black_harmony_tokens", black["harmony_tokens"]))))

            session["status"] = "completed"
            session["winner_color"] = None if is_draw else winner_color
            session["updated_at"] = _utc_now()

            self._persist()
            return deepcopy(session)

    def expire_session(self, session_id: str) -> dict[str, Any] | None:
        with self._lock:
            session = self._state["sessions"].get(session_id)
            if not session:
                return None
            if session.get("status") == "completed":
                return deepcopy(session)

            session["status"] = "completed"
            session["winner_color"] = None
            session["winner_player_id"] = None
            session["updated_at"] = _utc_now()
            self._persist()
            return deepcopy(session)
    def resolve_orphan_sessions(self) -> int:
        resolved = 0
        with self._lock:
            ongoing_ids = [sid for sid, session in self._state["sessions"].items() if session.get("status") == "ongoing"]

        for sid in ongoing_ids:
            with self._lock:
                session = self._state["sessions"].get(sid)
                if not session or session.get("status") != "ongoing":
                    continue
                white = self._state["players"].get(session["white_player_id"], {})
                black = self._state["players"].get(session["black_player_id"], {})
                white_active = bool(white and white.get("included_in_event", True) and white.get("status") != "inactive")
                black_active = bool(black and black.get("included_in_event", True) and black.get("status") != "inactive")

            if white_active and black_active:
                continue

            if white_active and not black_active:
                self.complete_session(sid, "w", False)
            elif black_active and not white_active:
                self.complete_session(sid, "b", False)
            else:
                self.complete_session(sid, None, True)
            resolved += 1

        return resolved
    def get_leaderboard(self) -> list[dict[str, Any]]:
        with self._lock:
            players = list(self._state["players"].values())
            sorted_players = sorted(
                players,
                key=lambda p: (p.get("points", 0), p.get("wins", 0), -p.get("losses", 0), p.get("name", "")),
                reverse=True,
            )
            return deepcopy(sorted_players)

    def has_active_sessions(self) -> bool:
        with self._lock:
            return any(session.get("status") == "ongoing" for session in self._state["sessions"].values())

    def set_game_order(self, game_order: list[str]) -> list[str]:
        normalized = [entry for entry in game_order if entry in FORMAT_CONFIG]
        if len(normalized) != len(game_order) or len(normalized) == 0:
            raise ValueError("Game order must include only valid formats and cannot be empty.")
        if len(normalized) > 20:
            raise ValueError("Game order cannot have more than 20 entries.")
        with self._lock:
            self._state["game_order"] = normalized
            self._state["current_format_index"] = 0
            self._persist()
            return normalized

    def update_player_admin(self, player_id: str, points: int | None, harmony_tokens: int | None) -> dict[str, Any]:
        with self._lock:
            player = self._state["players"].get(player_id)
            if not player:
                raise ValueError("Player not found.")
            if points is not None:
                player["points"] = max(0, points)
            if harmony_tokens is not None:
                player["harmony_tokens"] = max(0, min(3, harmony_tokens))
            self._persist()
            return deepcopy(player)

    def get_public_round_state(self) -> dict[str, Any]:
        with self._lock:
            return {
                "current_format": self.get_current_format(),
                "leaderboard": self.get_leaderboard(),
            }

    def admin_state(self) -> dict[str, Any]:
        with self._lock:
            sessions = list(self._state["sessions"].values())
            active_sessions = [s for s in sessions if s.get("status") == "ongoing"]
            players = list(self._state["players"].values())
            sorted_players = sorted(
                players,
                key=lambda p: (p.get("points", 0), p.get("wins", 0), -p.get("losses", 0), p.get("name", "")),
                reverse=True,
            )
            runners_queue = [
                p for p in sorted_players if p.get("included_in_event", True) and p.get("queue_bucket", "ready") == "runners"
            ]
            return {
                "game_order": deepcopy(self._state["game_order"]),
                "current_format": self.get_current_format(),
                "time_controls": deepcopy(self._state["time_controls"]),
                "players": deepcopy(sorted_players),
                "runners_queue": deepcopy(runners_queue),
                "active_sessions": deepcopy(active_sessions),
            }


multiplayer_store = MultiplayerStore()



