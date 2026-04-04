import pandas as pd
import numpy as np


class IndicatorService:
    @staticmethod
    def compute(df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy().sort_values("trade_date")

        out["sma_20"] = out["close"].rolling(20).mean()
        out["sma_50"] = out["close"].rolling(50).mean()
        out["ema_20"] = out["close"].ewm(span=20, adjust=False).mean()

        delta = out["close"].diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        out["rsi_14"] = 100 - (100 / (1 + rs))

        prev_close = out["close"].shift(1)
        tr = pd.concat(
            [
                out["high"] - out["low"],
                (out["high"] - prev_close).abs(),
                (out["low"] - prev_close).abs(),
            ],
            axis=1,
        ).max(axis=1)
        out["atr_14"] = tr.rolling(14).mean()

        out["volume_avg_20"] = out["volume"].rolling(20).mean()
        out["breakout_20_high_prev"] = out["high"].shift(1).rolling(20).max()
        out["momentum_20d"] = ((out["close"] / out["close"].shift(20)) - 1) * 100

        return out