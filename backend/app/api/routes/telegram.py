from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user_id
from app.core.supabase import get_supabase_admin

router = APIRouter()


class TelegramConnectRequest(BaseModel):
    telegram_chat_id: str
    telegram_alerts_enabled: bool = True


@router.post("/connect")
def connect_telegram(
    payload: TelegramConnectRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    response = (
        get_supabase_admin()
        .table("profiles")
        .update(
            {
                "telegram_chat_id": payload.telegram_chat_id,
                "telegram_alerts_enabled": payload.telegram_alerts_enabled,
            }
        )
        .eq("id", user_id)
        .execute()
    )

    return {
        "status": "success",
        "message": "Telegram connected successfully",
        "data": response.data,
    }


@router.post("/disconnect")
def disconnect_telegram(user_id: str = Depends(get_current_user_id)) -> dict:
    response = (
        get_supabase_admin()
        .table("profiles")
        .update(
            {
                "telegram_chat_id": None,
                "telegram_alerts_enabled": False,
            }
        )
        .eq("id", user_id)
        .execute()
    )

    return {
        "status": "success",
        "message": "Telegram disconnected successfully",
        "data": response.data,
    }
