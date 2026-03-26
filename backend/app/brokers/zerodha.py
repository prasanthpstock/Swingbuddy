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
        return self.client.generate_session(
            request_token,
            api_secret=settings.zerodha_api_secret,
        )

    def get_holdings(self) -> list[dict[str, Any]]:
        return self.client.holdings()

    def get_positions(self) -> dict[str, Any]:
        return self.client.positions()

    def get_instruments(self, exchange: str = "NSE") -> list[dict[str, Any]]:
        return self.client.instruments(exchange)

    def get_historical_data(
        self,
        instrument_token: int,
        interval: str,
        from_date,
        to_date,
    ) -> list[dict[str, Any]]:
        return self.client.historical_data(
            instrument_token,
            from_date,
            to_date,
            interval,
        )

    def get_instrument_token(
        self,
        symbol: str,
        exchange: str = "NSE",
    ) -> int | None:
        instruments = self.get_instruments(exchange)

        for instrument in instruments:
            if instrument.get("tradingsymbol") == symbol:
                return instrument.get("instrument_token")

        return None

    def get_daily_candles(
        self,
        symbol: str,
        exchange: str = "NSE",
        from_date=None,
        to_date=None,
    ) -> list[dict[str, Any]]:
        instrument_token = self.get_instrument_token(symbol=symbol, exchange=exchange)

        if not instrument_token:
            return []

        return self.get_historical_data(
            instrument_token=instrument_token,
            interval="day",
            from_date=from_date,
            to_date=to_date,
        )
