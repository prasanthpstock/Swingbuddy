import pandas as pd

class BreakoutScanner:
    def __init__(self, sma_period: int = 50, breakout_lookback: int = 20, volume_multiplier: float = 1.5) -> None:
        self.sma_period = sma_period
        self.breakout_lookback = breakout_lookback
        self.volume_multiplier = volume_multiplier

    def scan(self, symbol: str, df: pd.DataFrame):
        min_rows = max(self.sma_period, self.breakout_lookback) + 1
        if len(df) < min_rows:
            return None
        data = df.copy()
        data["sma_50"] = data["close"].rolling(self.sma_period).mean()
        data["avg_vol_20"] = data["volume"].rolling(20).mean()
        data["prev_20d_high_close"] = data["close"].rolling(self.breakout_lookback).max().shift(1)
        latest = data.iloc[-1]
        is_breakout = latest["close"] > latest["sma_50"] and latest["close"] > latest["prev_20d_high_close"] and latest["volume"] >= latest["avg_vol_20"] * self.volume_multiplier
        if not is_breakout:
            return None
        entry = float(latest["close"])
        stop_loss = float(min(latest["low"], latest["prev_20d_high_close"])) * 0.99
        risk = max(entry - stop_loss, 0.01)
        target = entry + (2 * risk)
        return {"symbol": symbol, "strategy_name": "breakout_v1", "timeframe": "1d", "entry_price": round(entry, 2), "stop_loss": round(stop_loss, 2), "target_price": round(target, 2), "risk_reward": 2.0, "reason_json": {"close_above_sma50": True, "close_above_prev_20d_high_close": True, "volume_confirmation": True}}
