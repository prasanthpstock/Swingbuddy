from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    app_secret_key: str = "change-me"
    database_url: str
    supabase_url: str
    supabase_anon_key: str | None = None
    supabase_service_role_key: str
    zerodha_api_key: str
    zerodha_api_secret: str
    zerodha_redirect_uri: str
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    encryption_key: str
    frontend_url: str = "http://localhost:3000"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
