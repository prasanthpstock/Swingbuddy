from typing import Optional


def generate_breakout_signal(item: dict, candles: list[dict]) -> Optional[dict]:
    symbol = item.get("symbol")
    if not symbol or len(candles) < 21:
        return None

    recent = candles[-21:]
    latest = recent[-1]
    previous_20 = recent[:-1]

    latest_close = latest.get("close")
    latest_high = latest.get("high")

    if latest_close is None or latest_high is None:
        return None

    breakout_level = max(
        candle.get("high", 0)
        for candle in previous_20
        if candle.get("high") is not None
    )

    if latest_high <= breakout_level:
        return None

    return {
        "symbol": symbol,
        "strategy": "breakout",
        "signal_type": "BUY",
        "price": latest_close,
        "notes": f"20-day breakout above {breakout_level}",
    }
