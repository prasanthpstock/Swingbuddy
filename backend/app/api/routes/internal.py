from fastapi import APIRouter, Header, HTTPException

from app.core.config import settings
from app.services.jobs import run_daily_signal_job

router = APIRouter()


@router.post("/jobs/daily-signals")
def run_daily_signals_job(x_internal_job_secret: str | None = Header(default=None)) -> dict:
    if not settings.internal_job_secret:
        raise HTTPException(status_code=500, detail="Missing INTERNAL_JOB_SECRET")

    if x_internal_job_secret != settings.internal_job_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return run_daily_signal_job()
