from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.multiplayer_routes import router as multiplayer_router
from app.api.rest_routes import router as rest_router
from app.api.ws_routes import router as ws_router
from app.core.config import settings
import uvicorn

app = FastAPI(title="Chess Event API", version="1.0.0")

allowed_origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rest_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/legacy")
app.include_router(multiplayer_router)


@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Chess Event Backend is live!"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

