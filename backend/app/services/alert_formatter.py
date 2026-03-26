def format_signal_message(signal: dict) -> str:
    symbol = signal.get("symbol", "-")
    action = signal.get("action", "HOLD")
    strategy = signal.get("strategy", "-")
    reason = signal.get("reason", "")
    price = signal.get("price")
    pnl = signal.get("pnl")

    lines = [
        "📈 <b>SwingBuddy Signal</b>",
        "",
        f"<b>Symbol:</b> {symbol}",
        f"<b>Action:</b> {action}",
        f"<b>Strategy:</b> {strategy}",
    ]

    if price is not None:
        lines.append(f"<b>Price:</b> ₹{price:,.2f}")

    if pnl is not None:
        lines.append(f"<b>P&L:</b> ₹{pnl:,.2f}")

    if reason:
        lines.extend(["", f"<b>Reason:</b> {reason}"])

    return "\n".join(lines)
