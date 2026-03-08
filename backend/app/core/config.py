import os
import tempfile
from pydantic_settings import BaseSettings


_DEFAULT_STATE_FILE = os.path.join(tempfile.gettempdir(), 'chess-event-runtime', 'state.json')


class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    FRONTEND_URL: str = "http://localhost:5173"
    ADMIN_SECRET: str = "1939"
    ADMIN_PANEL_PASSWORD: str = "1939"
    # Keep runtime state outside project folders so uvicorn --reload file watching
    # never restarts the server on player/queue/session state writes.
    STATE_FILE: str = _DEFAULT_STATE_FILE

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
