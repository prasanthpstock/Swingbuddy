import requests
from app.core.config import settings

class AlertService:
    def send_telegram_message(self, message: str):
        if not settings.telegram_bot_token or not settings.telegram_chat_id:
            return {"status": "skipped", "reason": "telegram_not_configured"}
        url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
        response = requests.post(url, json={"chat_id": settings.telegram_chat_id, "text": message}, timeout=20)
        response.raise_for_status()
        return {"status": "sent"}
