def generate_moving_avg_signal(item: dict, candles: list[dict]) -> dict | None:
    symbol = item.get("symbol")
    if not symbol or len(candles) < 20:
        return None

    closes = [float(c.get("close") or 0) for c in candles if c.get("close") is not None]

    if len(closes) < 20:
        return None

    short_window = 5
    long_window = 20

    short_ma = sum(closes[-short_window:]) / short_window
    long_ma = sum(closes[-long_window:]) / long_window
    latest_close = closes[-1]

    if short_ma > long_ma:
        signal_type = "buy"
        notes = (
            f"Bullish trend: 5-day MA ({round(short_ma, 2)}) "
            f"above 20-day MA ({round(long_ma, 2)})"
        )
    elif short_ma < long_ma:
        signal_type = "risk"
        notes = (
            f"Bearish trend: 5-day MA ({round(short_ma, 2)}) "
            f"below 20-day MA ({round(long_ma, 2)})"
        )
    else:
        signal_type = "hold"
        notes = (
            f"Neutral trend: 5-day MA ({round(short_ma, 2)}) "
            f"near 20-day MA ({round(long_ma, 2)})"
        )

    return {
        "symbol": symbol,
        "strategy": "moving_avg_v1",
        "signal_type": signal_type,
        "price": latest_close,
        "notes": notes,
    }
