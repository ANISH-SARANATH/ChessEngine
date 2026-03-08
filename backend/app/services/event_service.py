from app.core.database import db, teams_collection
from app.services.game_service import GameService

# Create a dedicated collection for storing the global event state
event_collection = db.get_collection("event_config")

class EventService:
    # The strict, linear blueprint of your event phases
    PHASES = [
        "registration", 
        "mini_game_1", 
        "qualifiers", 
        "elimination_cut", 
        "mini_game_2", 
        "knockout", 
        "quarter_finals", 
        "semi_finals", 
        "finals", 
        "completed"
    ]

    @staticmethod
    async def get_current_phase() -> str:
        """Fetches the current active phase of the tournament from MongoDB."""
        state = await event_collection.find_one({"_id": "global_state"})
        if not state:
            # Initialize the event state if it doesn't exist yet
            await event_collection.insert_one({"_id": "global_state", "current_phase": "registration"})
            return "registration"
        return state["current_phase"]

    @staticmethod
    async def advance_phase():
        """Moves the tournament to the next phase and executes necessary background logic."""
        current = await EventService.get_current_phase()
        try:
            current_index = EventService.PHASES.index(current)
        except ValueError:
            current_index = 0

        if current_index >= len(EventService.PHASES) - 1:
            return {"status": "completed", "message": "Event is already completed."}

        next_phase = EventService.PHASES[current_index + 1]

        # --- EXECUTE PHASE TRANSITION LOGIC ---
        
        if next_phase == "qualifiers":
            # Generate the 3 random games for everyone (10+0, modified, 5+3)
            await GameService.generate_matchmaking()
            
        elif next_phase == "elimination_cut":
            # Cut the bottom half of the leaderboard after qualifiers
            await EventService._execute_elimination()
            
        elif next_phase == "knockout":
            # Generate the initial Top Half knockout matches using folded seeding
            await GameService.generate_next_bracket("knockout")
            
        elif next_phase == "quarter_finals":
            # Eliminate the losers of 'knockout', then generate quarters
            await GameService.process_eliminations(previous_variant="knockout")
            await GameService.generate_next_bracket("quarter_finals")
            
        elif next_phase == "semi_finals":
            # Eliminate the losers of 'quarter_finals', then generate semis
            await GameService.process_eliminations(previous_variant="quarter_finals")
            await GameService.generate_next_bracket("semi_finals")
            
        elif next_phase == "finals":
            # Eliminate the losers of 'semi_finals', then generate finals
            await GameService.process_eliminations(previous_variant="semi_finals")
            await GameService.generate_next_bracket("finals")
            
        elif next_phase == "completed":
            # Process the results of the finals to declare the ultimate champion
            await GameService.process_eliminations(previous_variant="finals")

        # Update the database to reflect the new phase
        await event_collection.update_one(
            {"_id": "global_state"}, 
            {"$set": {"current_phase": next_phase}},
            upsert=True
        )

        return {"status": "success", "new_phase": next_phase}

    @staticmethod
    async def _execute_elimination():
        """Eliminates the bottom half of the teams after the qualifiers phase."""
        # Local import to prevent circular dependency issues
        from app.services.team_service import TeamService 
        
        sorted_teams = await TeamService.get_leaderboard()
        top_half_count = len(sorted_teams) // 2
        
        # Identify the bottom half of the standings
        eliminated_teams = sorted_teams[top_half_count:]
        eliminated_names = [team["team_name"] for team in eliminated_teams]

        # Mark them as eliminated in the database
        if eliminated_names:
            await teams_collection.update_many(
                {"team_name": {"$in": eliminated_names}},
                {"$set": {"is_eliminated": True}}
            )