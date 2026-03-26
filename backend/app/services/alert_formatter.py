def format_signal_message(signal: dict) -> str:
    symbol = signal.get("symbol", "-")
    action = signal.get("action", "HOLD")
    strategy = signal.get("strategy", "-")
    reason = signal.get("reason", "")
    price = signal.get("price")
    pnl = signal.get("pnl")

    lines = [
        f"• <b>{symbol}</b> — {action} ({strategy})",
    ]

    if price is not None:
        lines.append(f"  Price: ₹{float(price):,.2f}")

    if pnl is not None:
        lines.append(f"  P&amp;L: ₹{float(pnl):,.2f}")

    if reason:
        lines.append(f"  Reason: {reason}")

    return "\n".join(lines)


def format_daily_signal_digest(signals: list[dict]) -> str:
    if not signals:
        return "No new signals."

    buy_signals = [s for s in signals if s.get("action") == "BUY"]
    sell_signals = [s for s in signals if s.get("action") == "SELL"]
    risk_signals = [s for s in signals if s.get("action") == "RISK"]
    hold_signals = [s for s in signals if s.get("action") == "HOLD"]

    lines = [
        "📈 <b>SwingBuddy Daily Signals</b>",
        "",
        f"<b>Total new signals:</b> {len(signals)}",
        f"<b>BUY:</b> {len(buy_signals)} | <b>SELL:</b> {len(sell_signals)} | <b>RISK:</b> {len(risk_signals)} | <b>HOLD:</b> {len(hold_signals)}",
        "",
    ]

    strategy_groups: dict[str, list[dict]] = {}
    for signal in signals:
        strategy = signal.get("strategy", "unknown")
        strategy_groups.setdefault(strategy, []).append(signal)

    for strategy, strategy_signals in strategy_groups.items():
        lines.append(f"<b>{strategy}</b>")
        for signal in strategy_signals:
            lines.append(format_signal_message(signal))
        lines.append("")

    return "\n".join(lines).strip()
