import httpx
from app.core.config import settings


class TelegramService:
    def __init__(self) -> None:
        self.bot_token = settings.telegram_bot_token

    @property
    def is_enabled(self) -> bool:
        return bool(self.bot_token)

    async def send_message(self, chat_id: str, text: str) -> dict:
        if not self.bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN is not configured")

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"

        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        if not data.get("ok"):
            raise RuntimeError(f"Telegram API error: {data}")

        return data
