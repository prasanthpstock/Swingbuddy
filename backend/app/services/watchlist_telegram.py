from supabase import Client

from app.services.telegram_alerts import (
    format_watchlist_alert_message,
    send_telegram_message,
)


def send_watchlist_alerts_to_telegram(
    supabase: Client,
    user_id: str,
    alerts: list[dict],
):
    if not alerts:
        return

    telegram_rows = (
        supabase.table("telegram_connections")
        .select("chat_id")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    ).data or []

    if not telegram_rows:
        print(f"[TELEGRAM] No active telegram connection for user {user_id}")
        return

    chat_id = telegram_rows[0].get("chat_id")
    if not chat_id:
        print(f"[TELEGRAM] Missing chat_id for user {user_id}")
        return

    for alert in alerts:
        text = alert.get("message_override") or format_watchlist_alert_message(alert)
        result = send_telegram_message(chat_id, text)
        print(f"[TELEGRAM] Sent alert for {alert.get('symbol')}: {result}")
