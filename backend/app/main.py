from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.rest_routes import router as rest_router
from app.api.ws_routes import router as ws_router
from app.core.config import settings
import uvicorn

app = FastAPI(title="Chess Event API", version="1.0.0")

# Setup CORS for the Cloudflare React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(rest_router, prefix="/api/v1")
app.include_router(ws_router)

@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Chess Event Backend is live!"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)