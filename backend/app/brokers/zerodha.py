from typing import Any
from kiteconnect import KiteConnect
from app.core.config import settings

class ZerodhaAdapter:
    def __init__(self, access_token: str | None = None) -> None:
        self.client = KiteConnect(api_key=settings.zerodha_api_key)
        if access_token:
            self.client.set_access_token(access_token)

    def create_login_url(self) -> str:
        return self.client.login_url()

    def create_session(self, request_token: str) -> dict[str, Any]:
        return self.client.generate_session(request_token, api_secret=settings.zerodha_api_secret)

    def get_holdings(self) -> list[dict[str, Any]]:
        return self.client.holdings()

    def get_positions(self) -> dict[str, Any]:
        return self.client.positions()

    def get_instruments(self, exchange: str = "NSE") -> list[dict[str, Any]]:
        return self.client.instruments(exchange)

    def get_historical_data(self, instrument_token: int, interval: str, from_date, to_date) -> list[dict[str, Any]]:
        return self.client.historical_data(instrument_token, from_date, to_date, interval)
