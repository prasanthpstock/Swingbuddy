import requests

from app.core.config import settings


def send_telegram_message(chat_id: str, text: str) -> dict:
    if not settings.telegram_bot_token:
        return {"ok": False, "error": "Missing telegram bot token"}

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"

    response = requests.post(
        url,
        json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
        },
        timeout=15,
    )

    try:
        data = response.json()
    except Exception:
        data = {"ok": False, "error": response.text}

    return data


def format_watchlist_alert_message(alert: dict) -> str:
    symbol = alert.get("symbol", "-")
    signal_type = str(alert.get("signal_type", "")).upper()
    strategy = alert.get("strategy", "-")
    signal_date = alert.get("signal_date", "-")

    emoji = "🚨" if signal_type == "SELL" else "⚠️" if signal_type == "RISK" else "📈"

    return (
        f"{emoji} *Watchlist Alert*\n\n"
        f"*Symbol:* `{symbol}`\n"
        f"*Action:* *{signal_type}*\n"
        f"*Strategy:* `{strategy}`\n"
        f"*Signal Date:* `{signal_date}`"
    )
