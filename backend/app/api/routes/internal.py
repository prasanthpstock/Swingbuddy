import traceback
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.api.deps import get_current_user_id
from app.core.config import settings
from app.services.daily_summary import send_daily_summary_for_user
from app.services.jobs import run_daily_signal_job

router = APIRouter()


@router.post("/jobs/daily-signals")
async def run_daily_signals_job(
    x_internal_job_secret: Optional[str] = Header(default=None),
) -> dict:
    if not settings.internal_job_secret:
        raise HTTPException(status_code=500, detail="Missing INTERNAL_JOB_SECRET")

    if x_internal_job_secret != settings.internal_job_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        return await run_daily_signal_job()
    except Exception as e:
        print("[INTERNAL JOB ROUTE] Unhandled error:")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/daily-summary")
def run_daily_summary(user_id: str = Depends(get_current_user_id)) -> dict:
    return send_daily_summary_for_user(user_id)
