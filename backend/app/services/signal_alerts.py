from app.core.supabase import get_supabase_admin
from app.services.alert_formatter import format_daily_signal_digest
from app.services.telegram_service import TelegramService

telegram_service = TelegramService()


async def send_signal_alerts_for_user(user_id: str, new_signals: list[dict]) -> dict:
    if not new_signals:
        return {"status": "no_new_signals", "sent": 0, "failed": 0}

    if not telegram_service.is_enabled:
        return {"status": "telegram_disabled", "sent": 0, "failed": 0}

    profile_response = (
        get_supabase_admin()
        .table("profiles")
        .select("telegram_chat_id,telegram_alerts_enabled")
        .eq("id", user_id)
        .single()
        .execute()
    )

    profile = profile_response.data or {}

    chat_id = profile.get("telegram_chat_id")
    alerts_enabled = profile.get("telegram_alerts_enabled", False)

    if not chat_id or not alerts_enabled:
        return {"status": "not_configured", "sent": 0, "failed": 0}

    try:
        message = format_daily_signal_digest(new_signals)
        await telegram_service.send_message(chat_id=chat_id, text=message)
        return {"status": "success", "sent": 1, "failed": 0}
    except Exception as exc:
        print(f"[JOB][TELEGRAM] Digest failed | user={user_id} error={str(exc)}")
        return {"status": "failed", "sent": 0, "failed": 1}
