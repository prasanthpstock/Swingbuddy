def generate_breakout_signal(item: dict, candles: list[dict]) -> dict | None:
    symbol = item.get("symbol")
    if not symbol or len(candles) < 21:
        return None

    latest = candles[-1]
    previous_20 = candles[-21:-1]

    latest_close = float(latest.get("close") or 0)
    latest_volume = float(latest.get("volume") or 0)

    resistance = max(float(c.get("high") or 0) for c in previous_20)
    avg_volume = sum(float(c.get("volume") or 0) for c in previous_20) / len(previous_20)

    return {
        "symbol": symbol,
        "strategy": "breakout_v1",
        "signal_type": "buy",
        "price": latest_close,
        "notes": (
            f"TEST breakout above 20-day high ({round(resistance, 2)}) "
            f"| latest_volume={round(latest_volume, 2)} avg_volume={round(avg_volume, 2)}"
        ),
    }
