from app.core.supabase import get_supabase_admin
from app.services.alert_formatter import format_signal_message
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
        .limit(1)
        .execute()
    )

    rows = profile_response.data or []
    profile = rows[0] if rows else {}

    chat_id = profile.get("telegram_chat_id")
    alerts_enabled = profile.get("telegram_alerts_enabled", False)

    if not chat_id or not alerts_enabled:
        return {"status": "not_configured", "sent": 0, "failed": 0}

    sent = 0
    failed = 0

    for signal in new_signals:
        try:
            message = format_signal_message(signal)
            await telegram_service.send_message(chat_id=chat_id, text=message)
            sent += 1
        except Exception as exc:
            failed += 1
            print(
                f"[JOB] Telegram send failed user={user_id} "
                f"symbol={signal.get('symbol')} error={exc}"
            )

    return {
        "status": "success" if sent > 0 else "failed",
        "sent": sent,
        "failed": failed,
    }
