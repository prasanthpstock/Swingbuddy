from typing import Optional


def generate_pnl_signal(item: dict) -> Optional[dict]:
    symbol = item.get("symbol")
    pnl = item.get("pnl")
    last_price = item.get("last_price") or item.get("ltp") or item.get("price")

    if not symbol or pnl is None:
        return None

    try:
        pnl_value = float(pnl)
    except (TypeError, ValueError):
        return None

    signal_type = None
    notes = None

    if pnl_value >= 0:
        signal_type = "HOLD"
        notes = f"Position in profit: PnL {pnl_value:.2f}"
    elif pnl_value < 0:
        signal_type = "REVIEW"
        notes = f"Position in loss: PnL {pnl_value:.2f}"

    if not signal_type:
        return None

    return {
        "symbol": symbol,
        "strategy": "pnl",
        "signal_type": signal_type,
        "price": float(last_price) if last_price is not None else 0.0,
        "notes": notes,
    }
