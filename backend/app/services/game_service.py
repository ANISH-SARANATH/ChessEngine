import random
import uuid
from fastapi import HTTPException
from app.core.database import games_collection, teams_collection
from app.models.schemas import MinigameAnswer, GameStateUpdate

class GameService:
    @staticmethod
    async def verify_minigame(data: MinigameAnswer) -> dict:
        """Verifies mini-game answers and awards Harmony Points securely."""
        team = await teams_collection.find_one({"team_name": data.team_name})
        
        if not team:
            raise HTTPException(status_code=404, detail="Team not found.")
            
        if team.get("passcode") != data.passcode:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid passcode.")

        # Define your actual answers here
        correct_answers = ["riddle123", "decryption_key"] 
        
        if data.answer.strip().lower() in correct_answers:
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
        """Returns ONLY the current active round's games to prevent player confusion."""
        cursor = games_collection.find(
            {"$or": [{"team_a": team_name}, {"team_b": team_name}]},
            {"_id": 0} 
        )
        all_matches = await cursor.to_list(length=100)
        
        if not all_matches:
            return {"message": "No matches scheduled yet.", "matches": []}
            
        # Find matches that are still waiting to be played
        active_matches = [m for m in all_matches if m.get("status") in ["pending", "ongoing"]]
        
        if not active_matches:
            # If all games are completed, return everything so they can view their history
            return {"message": "All games completed", "matches": all_matches, "all_completed": True}
            
        # Find the lowest available round number (defaults to 0 for Qualifiers)
        current_round = min([m.get("round_number", 0) for m in active_matches])
        
        # Filter the list down to ONLY the current round
        current_round_matches = [m for m in active_matches if m.get("round_number", 0) == current_round]
        
        return {
            "current_round": current_round,
            "matches": current_round_matches
        }

    @staticmethod
    async def generate_matchmaking() -> list[dict]:
        """Generates 3 random 2v2 games (5+3, modified, 5+0) for the Qualifiers."""
        cursor = teams_collection.find({"is_eliminated": {"$ne": True}}, {"_id": 0, "team_name": 1})
        teams = await cursor.to_list(length=100)
        team_names = [t["team_name"] for t in teams]

        if len(team_names) < 2:
            return []

        random.shuffle(team_names)
        matches = []
        variants = ["5+3", "modified", "5+0"]

        for i in range(0, len(team_names) - 1, 2):
            team_a = team_names[i]
            team_b = team_names[i+1]
            
            # Qualifiers don't have strict rounds, so we default to round 0
            for variant in variants:
                matches.append({
                    "game_id": f"qual_{uuid.uuid4().hex[:8]}",
                    "team_a": team_a,
                    "team_b": team_b,
                    "variant": variant,
                    "stage": "qualifiers",
                    "group_id": "none",
                    "round_number": 0,
                    "status": "pending",
                    "board_number": 1
                })

        if matches:
            await games_collection.insert_many(matches)

        return matches

    @staticmethod
    async def generate_group_stage_1():
        """Splits teams into groups and generates a Strict Sequential Round Robin."""
        from app.services.team_service import TeamService
        
        all_teams = await TeamService.get_leaderboard()
        active_teams = [t for t in all_teams if not t.get("is_eliminated", False)]
        n = len(active_teams)

        if n < 3:
            return {"message": "Not enough teams to form groups."}

        num_groups = n // 3
        remainder = n % 3
        
        groups = {f"Group_{chr(65+i)}": [] for i in range(num_groups)}
        group_names = list(groups.keys())

        team_idx = 0
        for name in group_names:
            groups[name].extend(active_teams[team_idx : team_idx + 3])
            team_idx += 3
            
        for i in range(remainder):
            groups[group_names[i]].append(active_teams[team_idx])
            team_idx += 1

        for group_name, members in groups.items():
            for member in members:
                await teams_collection.update_one(
                    {"team_name": member["team_name"]},
                    {"$set": {"current_group": group_name}}
                )

        matches = []
        
        # Circle Method Scheduling Algorithm
        for group_name, members in groups.items():
            member_names = [m["team_name"] for m in members]
            
            # Add a "BYE" dummy if odd number of teams
            if len(member_names) % 2 != 0:
                member_names.append("BYE")
                
            num_teams = len(member_names)
            
            for round_num in range(1, num_teams):
                for i in range(num_teams // 2):
                    team_a = member_names[i]
                    team_b = member_names[num_teams - 1 - i]
                    
                    if team_a != "BYE" and team_b != "BYE":
                        matches.extend(GameService._create_2x1v1(
                            team_a, team_b, variant="5+3", stage="group_stage_1", 
                            group_id=group_name, round_number=round_num
                        ))
                
                # Rotate the array for the next round (keep index 0 fixed)
                member_names.insert(1, member_names.pop())

        if matches:
            await games_collection.insert_many(matches)

        return {"status": "success", "groups_created": num_groups, "matches": len(matches)}

    @staticmethod
    async def evaluate_group_stage_1() -> list[str]:
        """Calculates Top 1 from 3-teams and Top 2 from 4-teams, eliminates the rest."""
        from app.services.team_service import TeamService
        all_teams = await TeamService.get_leaderboard()
        active_teams = [t for t in all_teams if not t.get("is_eliminated", False) and t.get("current_group")]
        
        groups = {}
        for t in active_teams:
            grp = t["current_group"]
            if grp not in groups:
                groups[grp] = []
            groups[grp].append(t)
            
        advancing_teams = []
        eliminated_names = []
        
        for grp_name, members in groups.items():
            if len(members) >= 4:
                advancing_teams.extend([m["team_name"] for m in members[:2]])
                eliminated_names.extend([m["team_name"] for m in members[2:]])
            else:
                advancing_teams.extend([m["team_name"] for m in members[:1]])
                eliminated_names.extend([m["team_name"] for m in members[1:]])
                
        if eliminated_names:
            await teams_collection.update_many(
                {"team_name": {"$in": eliminated_names}},
                {"$set": {"is_eliminated": True}}
            )
            
        return advancing_teams

    @staticmethod
    async def generate_group_stage_2(advancing_teams: list[str]):
        """Puts advancing teams into a Super Group and generates Strict Sequential Rounds."""
        await teams_collection.update_many(
            {"team_name": {"$in": advancing_teams}},
            {"$set": {"current_group": "Super_Group"}}
        )

        matches = []
        member_names = list(advancing_teams)
        
        if len(member_names) % 2 != 0:
            member_names.append("BYE")
            
        num_teams = len(member_names)
        
        # Circle Method Scheduling Algorithm for Super Group
        for round_num in range(1, num_teams):
            for i in range(num_teams // 2):
                team_a = member_names[i]
                team_b = member_names[num_teams - 1 - i]
                
                if team_a != "BYE" and team_b != "BYE":
                    matches.extend(GameService._create_2x1v1(
                        team_a, team_b, variant="5+3", stage="group_stage_2", 
                        group_id="Super_Group", round_number=round_num
                    ))
            
            member_names.insert(1, member_names.pop())

        if matches:
            await games_collection.insert_many(matches)
            
        return {"status": "success", "matches": len(matches)}

    @staticmethod
    async def evaluate_group_stage_2() -> list[str]:
        """Calculates the Top 2 overall from the Super Group to advance to Finals."""
        from app.services.team_service import TeamService
        all_teams = await TeamService.get_leaderboard()
        super_group = [t for t in all_teams if not t.get("is_eliminated", False) and t.get("current_group") == "Super_Group"]
        
        advancing_teams = []
        eliminated_names = []
        
        if len(super_group) > 2:
            advancing_teams = [m["team_name"] for m in super_group[:2]]
            eliminated_names = [m["team_name"] for m in super_group[2:]]
        else:
            advancing_teams = [m["team_name"] for m in super_group]
            
        if eliminated_names:
            await teams_collection.update_many(
                {"team_name": {"$in": eliminated_names}},
                {"$set": {"is_eliminated": True}}
            )
            
        return advancing_teams

    @staticmethod
    async def generate_finals(advancing_teams: list[str]):
        """Generates 3 sequential rounds of 1v1 split boards (6 games total) for the top 2 teams."""
        if len(advancing_teams) != 2:
            return {"status": "error", "message": "Finals require exactly 2 teams."}
            
        team_a, team_b = advancing_teams[0], advancing_teams[1]
        matches = []
        
        for round_num in range(1, 4):
            matches.extend(GameService._create_2x1v1(
                team_a, team_b, variant="10+3", stage=f"finals_round", group_id="Finals", round_number=round_num
            ))
            
        if matches:
            await games_collection.insert_many(matches)
            
        return {"status": "success", "finals_matches": len(matches)}

    @staticmethod
    def _create_2x1v1(team_a: str, team_b: str, variant: str, stage: str, group_id: str, round_number: int):
        """Helper to generate two separate 1v1 boards for a Team vs Team matchup."""
        return [
            {
                "game_id": f"{stage}_{uuid.uuid4().hex[:8]}", 
                "team_a": team_a, 
                "team_b": team_b, 
                "variant": variant, 
                "stage": stage,
                "group_id": group_id,
                "round_number": round_number,
                "status": "pending",
                "board_number": 1
            },
            {
                "game_id": f"{stage}_{uuid.uuid4().hex[:8]}", 
                "team_a": team_a, 
                "team_b": team_b, 
                "variant": variant, 
                "stage": stage,
                "group_id": group_id,
                "round_number": round_number,
                "status": "pending",
                "board_number": 2
            }
        ]