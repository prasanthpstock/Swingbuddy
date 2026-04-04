import yfinance as yf
import pandas as pd


class YahooFinanceService:
    @staticmethod
    def fetch_daily_bars(yahoo_symbol: str, period: str = "6mo") -> pd.DataFrame:
        df = yf.download(
            tickers=yahoo_symbol,
            period=period,
            interval="1d",
            auto_adjust=False,
            progress=False,
        )

        if df.empty:
            return df

        # Handle MultiIndex columns from yfinance
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df.reset_index()

        # Normalize column names
        df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]

        # Some yfinance responses use "adj_close", some may not include it
        if "adj_close" not in df.columns:
            df["adj_close"] = None

        required_cols = ["date", "open", "high", "low", "close", "adj_close", "volume"]

        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            raise ValueError(f"Missing Yahoo columns for {yahoo_symbol}: {missing}. Got: {df.columns.tolist()}")

        df = df.rename(columns={"date": "trade_date"})

        return df[["trade_date", "open", "high", "low", "close", "adj_close", "volume"]]
