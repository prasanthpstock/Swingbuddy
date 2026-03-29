from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.signals import router as signals_router
from app.api.routes.portfolio import router as portfolio_router
from app.api.routes.auth import router as auth_router

app = FastAPI(title="Personal Trading App API", version="0.1.0")

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

app.include_router(signals_router, prefix="/signals", tags=["signals"])
app.include_router(portfolio_router, prefix="/portfolio", tags=["portfolio"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])


@app.get("/")
def root():
    return {"status": "ok", "service": "personal-trading-app-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
