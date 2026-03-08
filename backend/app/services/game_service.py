import random
import uuid
from fastapi import HTTPException
from app.core.database import games_collection, teams_collection
from app.models.schemas import MinigameAnswer, GameStateUpdate, GameMatch

class GameService:
    @staticmethod
    async def verify_minigame(data: MinigameAnswer) -> dict:
        """Verifies mini-game answers and awards Harmony Points securely."""
        # --- SECURITY CHECK ---
        team = await teams_collection.find_one({"team_name": data.team_name})
        
        if not team:
            raise HTTPException(status_code=404, detail="Team not found.")
            
        if team.get("passcode") != data.passcode:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode.")
        # ----------------------

        # Define your actual answers here
        correct_answers = ["riddle123", "decryption_key"] 
        
        if data.answer.strip().lower() in correct_answers:
            # Award 5 Harmony Points
            await teams_collection.update_one(
                {"team_name": data.team_name},
                {"$inc": {"harmony_points": 5}}
            )
            return {"status": "success", "message": "Correct! Harmony points awarded."}
            
        return {"status": "failure", "message": "Incorrect answer."}

    @staticmethod
    async def save_game_state(data: GameStateUpdate):
        """Saves the FEN string and clocks every 15 moves to prevent data loss."""
        if data.move_count % 15 == 0 or data.game_status != "ongoing":
            await games_collection.update_one(
                {"game_id": data.game_id},
                {"$set": {
                    "current_fen": data.fen_string,
                    "team_a_time": data.team_a_time,
                    "team_b_time": data.team_b_time,
                    "move_count": data.move_count,
                    "status": data.game_status
                }},
                upsert=True
            )

    @staticmethod
    async def get_game_state(game_id: str):
        """Allows a disconnected player to fetch the latest board state before reconnecting."""
        game = await games_collection.find_one({"game_id": game_id}, {"_id": 0})
        if not game:
            raise HTTPException(status_code=404, detail="Game not found.")
        
        if "current_fen" not in game:
            return {"status": "new_game", "message": "No moves saved yet, start from default."}
            
        return {
            "status": "restored",
            "current_fen": game["current_fen"],
            "team_a_time": game.get("team_a_time"),
            "team_b_time": game.get("team_b_time"),
            "move_count": game.get("move_count", 0)
        }

    @staticmethod
    async def get_team_schedule(team_name: str):
        """Returns all games assigned to a team so the frontend can render the 'Join' buttons."""
        cursor = games_collection.find(
            {"$or": [{"team_a": team_name}, {"team_b": team_name}]},
            {"_id": 0} 
        )
        matches = await cursor.to_list(length=100)
        
        if not matches:
            return {"message": "No matches scheduled yet.", "matches": []}
            
        return {"matches": matches}

    @staticmethod
    async def generate_matchmaking() -> list[dict]:
        """
        Fetches all registered teams, shuffles them, pairs them up randomly,
        and generates 3 games (10+0, modified, 5+3) for the Qualifiers phase.
        """
        cursor = teams_collection.find({"is_eliminated": {"$ne": True}}, {"_id": 0, "team_name": 1})
        teams = await cursor.to_list(length=100)
        team_names = [t["team_name"] for t in teams]

        if len(team_names) < 2:
            return []

        random.shuffle(team_names)
        matches = []
        variants = ["10+0", "modified", "5+3"]

        # Pair teams up by 2s
        for i in range(0, len(team_names) - 1, 2):
            team_a = team_names[i]
            team_b = team_names[i+1]
            
            # Generate 3 games for this pair
            for variant in variants:
                game_id = f"game_{uuid.uuid4().hex[:8]}"
                match_doc = GameMatch(
                    game_id=game_id,
                    team_a=team_a,
                    team_b=team_b,
                    variant=variant,
                    board_number=1
                )
                matches.append(match_doc.model_dump())

        if matches:
            await games_collection.insert_many(matches)

        return matches

    @staticmethod
    async def process_eliminations(previous_variant: str):
        """Calculates who lost the previous dual 1v1 round and eliminates them."""
        cursor = games_collection.find({"variant": previous_variant, "status": "completed"})
        games = await cursor.to_list(length=100)
        
        # Group games by the opposing teams
        matchups = {}
        for game in games:
            # Using frozenset so (TeamA, TeamB) is grouped with (TeamB, TeamA)
            pair = frozenset([game["team_a"], game["team_b"]])
            if pair not in matchups:
                matchups[pair] = []
            matchups[pair].append(game)
            
        # Determine the loser for each matchup
        for pair, pair_games in matchups.items():
            teams = list(pair)
            if len(teams) < 2:
                continue
                
            team_1, team_2 = teams[0], teams[1]
            
            # Tally wins strictly in these specific dual-board games
            t1_wins = sum(1 for g in pair_games if g.get("winner") == team_1)
            t2_wins = sum(1 for g in pair_games if g.get("winner") == team_2)
            
            loser = None
            if t1_wins > t2_wins:
                loser = team_2
            elif t2_wins > t1_wins:
                loser = team_1
            else:
                # TIE-BREAKER (1-1): Global net time diff -> Harmony points
                t1_doc = await teams_collection.find_one({"team_name": team_1})
                t2_doc = await teams_collection.find_one({"team_name": team_2})
                
                t1_time = t1_doc.get("net_time_diff", 0) if t1_doc else 0
                t2_time = t2_doc.get("net_time_diff", 0) if t2_doc else 0
                
                if t1_time == t2_time:
                    t1_harmony = t1_doc.get("harmony_points", 0) if t1_doc else 0
                    t2_harmony = t2_doc.get("harmony_points", 0) if t2_doc else 0
                    loser = team_2 if t1_harmony >= t2_harmony else team_1
                else:
                    loser = team_2 if t1_time > t2_time else team_1

            if loser:
                await teams_collection.update_one(
                    {"team_name": loser}, 
                    {"$set": {"is_eliminated": True}}
                )

    @staticmethod
    async def generate_next_bracket(stage: str):
        """Pairs up the remaining teams using standard folded seeding (1st vs Last)."""
        # Local import to prevent circular dependencies
        from app.services.team_service import TeamService 
        
        all_teams = await TeamService.get_leaderboard()
        active_teams = [t for t in all_teams if not t.get("is_eliminated", False)]
        
        matches = []
        n = len(active_teams)

        if n < 2:
            return matches 

        # Folded Matchup Logic
        for i in range(n // 2):
            team_high = active_teams[i]['team_name']         # Top of the list
            team_low = active_teams[n - 1 - i]['team_name']  # Bottom of the list
            
            matches.extend(GameService._create_2x1v1(team_high, team_low, stage))

        if matches:
            await games_collection.insert_many(matches)

        return matches

    @staticmethod
    def _create_2x1v1(team_a: str, team_b: str, variant: str):
        """Helper to generate two separate 1v1 boards for a Team vs Team matchup."""
        return [
            {
                "game_id": f"ko_{uuid.uuid4().hex[:8]}", 
                "team_a": team_a, 
                "team_b": team_b, 
                "variant": variant, 
                "status": "pending",
                "board_number": 1
            },
            {
                "game_id": f"ko_{uuid.uuid4().hex[:8]}", 
                "team_a": team_a, 
                "team_b": team_b, 
                "variant": variant, 
                "status": "pending",
                "board_number": 2
            }
        ]