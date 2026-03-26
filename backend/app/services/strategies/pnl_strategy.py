def generate_pnl_signal(item: dict) -> dict | None:
    symbol = item.get("symbol")
    if not symbol:
        return None

    pnl = float(item.get("pnl") or 0)
    avg_price = float(item.get("avg_price") or 0)
    quantity = float(item.get("quantity") or 0)
    ltp = float(item.get("ltp") or 0)

    invested = avg_price * quantity
    pnl_pct = (pnl / invested * 100) if invested > 0 else 0

    if pnl_pct > 5:
        signal_type = "sell"
        notes = f"Profit at {round(pnl_pct, 2)}% - consider booking"
    elif pnl_pct < -3:
        signal_type = "risk"
        notes = f"Loss at {round(pnl_pct, 2)}% - consider stop loss"
    else:
        signal_type = "hold"
        notes = f"Stable position ({round(pnl_pct, 2)}%)"

    return {
        "symbol": symbol,
        "strategy": "pnl_v1",
        "signal_type": signal_type,
        "price": ltp,
        "notes": notes,
    }
