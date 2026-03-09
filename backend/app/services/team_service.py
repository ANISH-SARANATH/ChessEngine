import asyncio
from fastapi import HTTPException
from app.core.database import teams_collection, games_collection
from app.models.schemas import TeamRegister, TeamDB, SpendHarmony, GameResult, LoginRequest
from app.services.ws_manager import ws_manager

class TeamService:
    @staticmethod
    async def register_team(team_data: TeamRegister):
        """Registers a new team into the database with default 0 stats."""
        # Check if team name already exists
        existing_team = await teams_collection.find_one({"team_name": team_data.team_name})
        if existing_team:
            raise HTTPException(status_code=400, detail="Team name already taken.")

        new_team = TeamDB(**team_data.model_dump())
        await teams_collection.insert_one(new_team.model_dump())
        return {"message": f"Team {team_data.team_name} registered successfully."}

    @staticmethod
    async def verify_login(data: LoginRequest):
        """Verifies team credentials for frontend dashboard access."""
        team = await teams_collection.find_one({"team_name": data.team_name})
        
        if not team or team.get("passcode") != data.passcode:
            raise HTTPException(status_code=401, detail="Invalid team name or passcode.")
            
        return {
            "status": "success", 
            "message": "Login successful",
            "team_name": team["team_name"]
        }

    @staticmethod
    async def get_leaderboard():
        """Returns the fully sorted leaderboard based on Points -> Time -> Harmony."""
        cursor = teams_collection.find({}, {"_id": 0, "passcode": 0})
        teams = await cursor.to_list(length=100)
        
        # Sort by points (desc), then net_time_diff (desc), then harmony_points (desc)
        sorted_teams = sorted(
            teams, 
            key=lambda x: (
                x.get("points", 0), 
                x.get("net_time_diff", 0.0), 
                x.get("harmony_points", 0)
            ), 
            reverse=True
        )
        return sorted_teams

    @staticmethod
    async def spend_harmony_points(data: SpendHarmony):
        """Deducts Harmony Points to drain the opponent's clock, highly secured."""
        # 1. Fetch the team and verify passcode
        team = await teams_collection.find_one({"team_name": data.team_name})
        
        if not team:
            raise HTTPException(status_code=404, detail="Team not found.")
            
        if team.get("passcode") != data.passcode:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode.")

        # 2. Verify Game Context (Prevents Cross-Game Sabotage)
        game = await games_collection.find_one({"game_id": data.game_id})
        
        if not game:
            raise HTTPException(status_code=404, detail="Game not found.")
            
        if game.get("status") not in ["pending", "ongoing"]:
            raise HTTPException(status_code=400, detail="Game is already completed.")
            
        if data.team_name not in [game.get("team_a"), game.get("team_b")]:
            raise HTTPException(status_code=403, detail="Unauthorized: Your team is not playing in this match.")
            
        # 3. Check if they have enough points
        if team.get("harmony_points", 0) < data.points_to_spend:
            raise HTTPException(status_code=400, detail="Not enough Harmony Points.")

        # 4. Deduct the points from the database
        await teams_collection.update_one(
            {"team_name": data.team_name},
            {"$inc": {"harmony_points": -data.points_to_spend}}
        )

        # 5. Calculate the time deduction (1 point = 10 seconds)
        time_to_deduct = data.points_to_spend * 10
        
        return {
            "status": "success", 
            "message": f"Deducted {data.points_to_spend} points.",
            "time_deduction_seconds": time_to_deduct
        }

    @staticmethod
    async def process_game_result(data: GameResult):
        """Processes the final game result, updates the leaderboard, and severs connections."""
        # --- SECURITY CHECK ---
        if data.submitter_team not in [data.team_a, data.team_b]:
            raise HTTPException(status_code=403, detail="Submitter is not part of this game.")
            
        submitter = await teams_collection.find_one({"team_name": data.submitter_team})
        
        if not submitter or submitter.get("passcode") != data.passcode:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode for submitting results.")
        # ----------------------

        # 1. Calculate Net Time Difference
        team_a_net_time = data.team_a_time_left - data.team_b_time_left
        team_b_net_time = data.team_b_time_left - data.team_a_time_left

        # 2. Prepare database update queries (Always increment games_played)
        team_a_update = {"$inc": {"net_time_diff": team_a_net_time, "games_played": 1}}
        team_b_update = {"$inc": {"net_time_diff": team_b_net_time, "games_played": 1}}

        # 3. Assign Points & Wins/Losses
        if data.is_draw:
            team_a_update["$inc"]["nr"] = 1
            team_b_update["$inc"]["nr"] = 1
            # Assuming standard chess scoring for draws
            team_a_update["$inc"]["points"] = 0.5
            team_b_update["$inc"]["points"] = 0.5
        
        elif data.winner_team == data.team_a:
            team_a_update["$inc"]["wins"] = 1
            team_a_update["$inc"]["points"] = 1
            team_b_update["$inc"]["losses"] = 1
        
        elif data.winner_team == data.team_b:
            team_b_update["$inc"]["wins"] = 1
            team_b_update["$inc"]["points"] = 1
            team_a_update["$inc"]["losses"] = 1

        # 4. Execute Updates concurrently to MongoDB
        await asyncio.gather(
            teams_collection.update_one({"team_name": data.team_a}, team_a_update),
            teams_collection.update_one({"team_name": data.team_b}, team_b_update),
            games_collection.update_one(
                {"game_id": data.game_id}, 
                {"$set": {"status": "completed", "winner": data.winner_team}}
            )
        )

        # 5. --- KILL ZOMBIE WEBSOCKETS ---
        # Broadcast game over so frontends stop trying to send moves
        await ws_manager.broadcast_to_game(
            data.game_id, 
            {"type": "game_over", "winner": data.winner_team}, 
            sender=None 
        )
        
        # Aggressively sever the connection to prevent lingering state saves
        await ws_manager.force_disconnect_game(data.game_id)

        return {"status": "success", "message": "Leaderboard updated and connections closed successfully"}