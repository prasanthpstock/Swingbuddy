from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.deps import get_current_user_id
from app.core.supabase import get_supabase_admin
from app.services.alert_service import AlertService

router = APIRouter()

class TestAlertRequest(BaseModel):
    message: str

@router.get("")
def list_alerts(user_id: str = Depends(get_current_user_id)):
    return get_supabase_admin().table("alerts").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute().data or []

@router.post("/test-telegram")
def test_telegram(payload: TestAlertRequest, user_id: str = Depends(get_current_user_id)):
    return {"user_id": user_id, **AlertService().send_telegram_message(payload.message)}
