from pydantic import BaseModel, Field
from typing import Optional, List

class TeamRegister(BaseModel):
    team_name: str
    passcode: str

class TeamDB(BaseModel):
    team_name: str
    passcode: str
    wins: int = 0
    losses: int = 0
    nr: int = 0
    points: int = 0
    net_time_diff: float = 0.0
    harmony_points: int = 0
    games_played: int = 0
    is_eliminated: bool = False

class MinigameAnswer(BaseModel):
    team_name: str
    passcode: str
    answer: str

class GameStateUpdate(BaseModel):
    game_id: str
    move_count: int
    fen_string: str
    team_a_time: float
    team_b_time: float
    game_status: str = "ongoing" # ongoing, completed, draw

class GameMatch(BaseModel):
    game_id: str
    team_a: str
    team_b: str
    variant: str
    status: str = "pending"
    board_number: int = 1


class SpendHarmony(BaseModel):
    team_name: str
    passcode: str  # <-- NEW: Required to authorize the spend
    game_id: str
    points_to_spend: int

class GameResult(BaseModel):
    game_id: str
    team_a: str
    team_b: str
    winner_team: Optional[str] = None
    team_a_time_left: float
    team_b_time_left: float
    is_draw: bool = False
    submitter_team: str  # <-- NEW: Which team is reporting the result
    passcode: str        # <-- NEW: The passcode of the reporting team


class LoginRequest(BaseModel):
    team_name: str
    passcode: str



class EventPhaseUpdate(BaseModel):
    passcode: str # Admin secret

class EventStatus(BaseModel):
    current_phase: str
    # Phases will strictly be: 
    # "registration" -> "mini_game_1" -> "qualifiers" -> "elimination_cut" -> 
    # "mini_game_2" -> "knockout" -> "quarter_finals" -> "semi_finals" -> "finals" -> "completed"
