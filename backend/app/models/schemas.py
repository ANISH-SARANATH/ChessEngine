from pydantic import BaseModel
from typing import Optional

class TeamRegister(BaseModel):
    team_name: str
    passcode: str

class TeamDB(BaseModel):
    team_name: str
    passcode: str
    wins: int = 0
    losses: int = 0
    nr: int = 0
    points: float = 0.0  # Changed to float just in case you ever re-introduce 0.5 for draws
    net_time_diff: float = 0.0
    harmony_points: int = 0
    games_played: int = 0
    is_eliminated: bool = False
    current_group: Optional[str] = None  # <-- NEW: Tracks "Group_A", "Super_Group", etc.

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
    stage: str               # <-- NEW: "qualifiers", "group_stage_1", etc.
    group_id: str = "none"   # <-- NEW: "Group_A", "Super_Group", or "none"
    status: str = "pending"
    board_number: int = 1

class SpendHarmony(BaseModel):
    team_name: str
    passcode: str  
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
    submitter_team: str  
    passcode: str        

class LoginRequest(BaseModel):
    team_name: str
    passcode: str

class EventPhaseUpdate(BaseModel):
    passcode: str # Admin secret

class EventStatus(BaseModel):
    current_phase: str
    # Phases are strictly: 
    # "registration" -> "mini_game_1" -> "qualifiers" -> "elimination_cut" -> 
    # "group_stage_1" -> "group_stage_2" -> "finals" -> "completed"