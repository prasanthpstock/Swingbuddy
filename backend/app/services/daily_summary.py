from datetime import datetime, timezone
from collections import defaultdict

from app.core.supabase import get_supabase_admin
from app.services.watchlist_telegram import send_watchlist_alerts_to_telegram


def _format_daily_summary_message(signals: list[dict]) -> str:
    grouped: dict[str, list[str]] = defaultdict(list)

    for signal in signals:
        signal_type = str(signal.get("signal_type", "")).upper()
        symbol = str(signal.get("symbol", "")).upper()

        if signal_type and symbol:
            grouped[signal_type].append(symbol)

    today = datetime.now(timezone.utc).date().isoformat()

    lines = [f"📊 *Daily Signals Summary*", f"*Date:* `{today}`", ""]

    if not grouped:
        lines.append("No signals found today.")
        return "\n".join(lines)

    for signal_type in ["SELL", "RISK", "BUY", "HOLD"]:
        symbols = grouped.get(signal_type, [])
        if symbols:
            unique_symbols = sorted(set(symbols))
            lines.append(f"*{signal_type}:* {', '.join(f'`{s}`' for s in unique_symbols)}")

    if len(lines) == 3:
        lines.append("No signals found today.")

    return "\n".join(lines)


def send_daily_summary_for_user(user_id: str) -> dict:
    supabase = get_supabase_admin()
    today = datetime.now(timezone.utc).date().isoformat()

    signals = (
        supabase.table("signals")
        .select("symbol, signal_type, strategy, signal_date")
        .eq("user_id", user_id)
        .eq("signal_date", today)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    message = _format_daily_summary_message(signals)

    # Reuse telegram connection lookup logic by sending a pseudo-alert payload
    result = send_watchlist_alerts_to_telegram(
        supabase=supabase,
        user_id=user_id,
        alerts=[
            {
                "symbol": "DAILY_SUMMARY",
                "signal_type": "summary",
                "strategy": "daily_summary",
                "signal_date": today,
                "message_override": message,
            }
        ],
    )

    return {
        "status": "success",
        "user_id": user_id,
        "signal_count": len(signals),
        "date": today,
        "message": "Daily summary processed",
    }
