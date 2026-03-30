from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.signals import router as signals_router
from app.api.routes.portfolio import router as portfolio_router
from app.api.routes.auth import router as auth_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.logs import router as logs_router
from app.api.routes.telegram import router as telegram_router
from app.api.routes.internal import router as internal_router
from app.api.routes.watchlist import router as watchlist_router

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
app.include_router(alerts_router, prefix="/alerts", tags=["alerts"])
app.include_router(logs_router, prefix="/logs", tags=["logs"])
app.include_router(telegram_router, prefix="/telegram", tags=["telegram"])
app.include_router(internal_router, prefix="/internal", tags=["internal"])
app.include_router(watchlist_router, prefix="/watchlist", tags=["watchlist"])


@app.get("/")
def root():
    return {"status": "ok", "service": "personal-trading-app-api"}


@app.get("/health")
def health():
    return {"status": "healthy"}
