from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from app.models.schemas import TeamRegister, MinigameAnswer, SpendHarmony, GameResult, LoginRequest
from app.services.team_service import TeamService
from app.services.game_service import GameService
from app.services.event_service import EventService
from app.core.config import settings

router = APIRouter()

# ==========================================
# TEAM & AUTH ROUTES
# ==========================================

@router.post("/teams/register")
async def register_team(team_data: TeamRegister):
    return await TeamService.register_team(team_data)

@router.post("/teams/login")
async def team_login(data: LoginRequest):
    """Frontend calls this to verify credentials before routing to the dashboard."""
    return await TeamService.verify_login(data)

@router.get("/teams/leaderboard")
async def get_leaderboard():
    return await TeamService.get_leaderboard()

@router.get("/teams/{team_name}/schedule")
async def get_team_schedule(team_name: str):
    """Frontend calls this to get active matches and render 'Join Game' buttons."""
    return await GameService.get_team_schedule(team_name)


# ==========================================
# GAMEPLAY ROUTES
# ==========================================

@router.post("/minigame/verify")
async def verify_minigame(data: MinigameAnswer):
    return await GameService.verify_minigame(data)

@router.post("/game/spend-harmony")
async def spend_harmony(data: SpendHarmony):
    return await TeamService.spend_harmony_points(data)

@router.post("/game/result")
async def submit_game_result(data: GameResult):
    return await TeamService.process_game_result(data)

@router.get("/game/{game_id}/state")
async def fetch_game_state(game_id: str):
    """Frontend calls this on page load to restore a disconnected game."""
    return await GameService.get_game_state(game_id)


# ==========================================
# EVENT MANAGER & ADMIN ROUTES
# ==========================================

@router.get("/event/status")
async def get_event_status():
    """Frontend calls this to know which screen/phase to render."""
    phase = await EventService.get_current_phase()
    return {"current_phase": phase}

@router.post("/admin/advance-phase")
async def advance_event_phase(admin_secret: str = Header(...)):
    """Admin clicks 'Next Phase'. Backend calculates and generates everything automatically."""
    if admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized admin access")
        
    return await EventService.advance_phase()

# --- NEW: Safety Net Endpoint ---
class SetPhaseRequest(BaseModel):
    target_phase: str

@router.post("/admin/set-phase")
async def set_event_phase(data: SetPhaseRequest, admin_secret: str = Header(...)):
    """Emergency override to force the tournament into a specific phase."""
    if admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized admin access")
        
    if data.target_phase not in EventService.PHASES:
        raise HTTPException(status_code=400, detail=f"Invalid phase. Must be one of {EventService.PHASES}")
        
    from app.core.database import db
    await db.get_collection("event_config").update_one(
        {"_id": "global_state"}, 
        {"$set": {"current_phase": data.target_phase}},
        upsert=True
    )
    return {"status": "success", "message": f"Event manually forced to {data.target_phase} phase."}