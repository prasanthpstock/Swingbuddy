from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_secret_key: str = "change-me"
    database_url: str
    supabase_url: str
    supabase_anon_key: Optional[str] = None
    supabase_service_role_key: str
    zerodha_api_key: str
    zerodha_api_secret: str
    zerodha_redirect_uri: str
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    encryption_key: str
    frontend_url: str = "http://localhost:3000"

    # ✅ ADD THIS LINE
    internal_job_secret: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
