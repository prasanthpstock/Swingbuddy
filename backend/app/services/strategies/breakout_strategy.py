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

    price_breakout = latest_close > resistance
    volume_confirmed = avg_volume > 0 and latest_volume > (1.5 * avg_volume)

    if not (price_breakout and volume_confirmed):
        return None

    return {
        "symbol": symbol,
        "strategy": "breakout_v1",
        "signal_type": "buy",
        "price": latest_close,
        "notes": f"Breakout above 20-day high ({round(resistance, 2)}) with volume confirmation",
    }
