from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.auth.dependencies import get_current_user_id
from app.db.supabase import supabase

router = APIRouter(prefix="/telegram", tags=["telegram"])


class TelegramConnectRequest(BaseModel):
    telegram_chat_id: str
    telegram_alerts_enabled: bool = True


@router.post("/connect")
def connect_telegram(
    payload: TelegramConnectRequest,
    user_id: str = Depends(get_current_user_id),
):
    result = (
        supabase.table("profiles")
        .update({
            "telegram_chat_id": payload.telegram_chat_id,
            "telegram_alerts_enabled": payload.telegram_alerts_enabled,
        })
        .eq("id", user_id)
        .execute()
    )

    return {
        "status": "success",
        "message": "Telegram connected successfully",
        "data": result.data,
    }
