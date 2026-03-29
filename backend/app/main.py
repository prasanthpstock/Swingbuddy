from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.core.config import settings

app = FastAPI(title="Personal Trading App API", version="0.1.0")

allowed_origins = [
    "http://localhost:3000",
    "https://swingbuddy-prasanthpstocks-projects.vercel.app",
]

if settings.frontend_url:
    frontend = settings.frontend_url.strip().rstrip("/")
    if frontend and frontend not in allowed_origins:
        allowed_origins.append(frontend)

print("[CONFIG] FRONTEND_URL:", settings.frontend_url)
print("[CORS] Allowed origins:", allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/health", tags=["health"])


@app.get("/")
def root() -> dict:
    return {"status": "ok", "service": "personal-trading-app-api"}


@app.get("/debug/cors")
def debug_cors() -> dict:
    return {
        "frontend_url": settings.frontend_url,
        "allowed_origins": allowed_origins,
    }
