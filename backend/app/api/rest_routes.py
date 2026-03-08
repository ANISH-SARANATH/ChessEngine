from fastapi import APIRouter
from app.models.schemas import TeamRegister, MinigameAnswer,SpendHarmony,GameResult,LoginRequest
from app.services.team_service import TeamService
from app.services.game_service import GameService
from fastapi import Header, HTTPException
from app.core.config import settings
from app.services.event_service import EventService


router = APIRouter()

@router.post("/teams/register")
async def register_team(team_data: TeamRegister):
    return await TeamService.register_team(team_data)

@router.get("/teams/leaderboard")
async def get_leaderboard():
    return await TeamService.get_leaderboard()

@router.post("/minigame/verify")
async def verify_minigame(data: MinigameAnswer):
    return await GameService.verify_minigame(data)

@router.post("/admin/generate-matches")
async def generate_matches(admin_secret: str = Header(...)):
    """Admin endpoint to trigger pairing after all teams have registered."""
    if admin_secret != settings.ADMIN_SECRET: # Add ADMIN_SECRET to your .env
        raise HTTPException(status_code=401, detail="Unauthorized admin access")
    matches = await GameService.generate_matchmaking()
    return {"message": f"Generated {len(matches)} games.", "matches": matches}


@router.post("/game/spend-harmony")
async def spend_harmony(data: SpendHarmony):
    return await TeamService.spend_harmony_points(data)


@router.post("/admin/generate-knockouts")
async def generate_knockouts():
    matches = await GameService.generate_knockout_matches()
    return {"message": f"Generated {len(matches)} 1v1 knockout matches.", "matches": matches}

@router.post("/game/result")
async def submit_game_result(data: GameResult):
    return await TeamService.process_game_result(data)

@router.get("/game/{game_id}/state")
async def fetch_game_state(game_id: str):
    """Frontend calls this on page load to restore a disconnected game."""
    return await GameService.get_game_state(game_id)


@router.get("/teams/{team_name}/schedule")
async def get_team_schedule(team_name: str):
    return await GameService.get_team_schedule(team_name)

@router.post("/teams/login")
async def team_login(data: LoginRequest):
    """Frontend calls this to verify credentials before routing to the dashboard."""
    return await TeamService.verify_login(data)

@router.get("/event/status")
async def get_event_status():
    """Frontend calls this to know which screen to render."""
    phase = await EventService.get_current_phase()
    return {"current_phase": phase}

@router.post("/admin/advance-phase")
async def advance_event_phase(admin_secret: str = Header(...)):
    """Admin clicks 'Next Phase'. Backend calculates everything automatically."""
    from app.core.config import settings
    if admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized admin access")
        
    return await EventService.advance_phase()