from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str 
    FRONTEND_URL: str 
    ADMIN_SECRET: str

    class Config:
        env_file = ".env"
        extra = "ignore" 

settings = Settings()