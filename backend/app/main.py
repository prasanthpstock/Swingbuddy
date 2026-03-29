from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.signals import router as signals_router

app = FastAPI(title="Personal Trading App API", version="0.1.0")

# --- CORS (required for frontend) ---
allowed_origins = [
    "http://localhost:3000",
    "https://swingbuddy-prasanthpstocks-projects.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTES ---
app.include_router(signals_router, prefix="/signals", tags=["signals"])


# --- ROOT ---
@app.get("/")
def root():
    return {"status": "ok", "service": "personal-trading-app-api"}


# --- HEALTH ---
@app.get("/health")
def health():
    return {"status": "healthy"}
