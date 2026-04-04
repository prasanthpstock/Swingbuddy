from typing import Optional


def generate_moving_avg_signal(item: dict, candles: list[dict]) -> Optional[dict]:
    symbol = item.get("symbol")
    if not symbol or len(candles) < 50:
        return None

    closes = [c.get("close") for c in candles if c.get("close") is not None]
    if len(closes) < 50:
        return None

    sma_20 = sum(closes[-20:]) / 20
    sma_50 = sum(closes[-50:]) / 50
    latest_close = closes[-1]

    if latest_close > sma_20 and sma_20 > sma_50:
        return {
            "symbol": symbol,
            "strategy": "moving_avg",
            "signal_type": "BUY",
            "price": latest_close,
            "notes": "Bullish SMA crossover",
        }

    return None
