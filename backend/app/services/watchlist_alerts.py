from supabase import Client


def create_watchlist_alerts(
    supabase: Client,
    signals: list[dict],
):
    """
    signals: list of generated signals
    Expected keys: id, symbol, strategy, signal_type, signal_date
    """

    if not signals:
        return

    # Step 1: get all unique symbols from signals
    symbols = list({s["symbol"] for s in signals})

    # Step 2: fetch watchlist entries for those symbols
    watchlist = (
        supabase.table("watchlist")
        .select("user_id, symbol")
        .in_("symbol", symbols)
        .execute()
    ).data or []

    if not watchlist:
        return

    # Map symbol → users
    symbol_users = {}
    for item in watchlist:
        symbol_users.setdefault(item["symbol"], []).append(item["user_id"])

    alerts_to_insert = []

    for signal in signals:
        symbol = signal["symbol"]
        users = symbol_users.get(symbol)

        if not users:
            continue

        signal_type = str(signal.get("signal_type", "")).lower()

        # Only trigger alerts for SELL / RISK
        if signal_type not in ["sell", "risk"]:
            continue

        for user_id in users:
            alerts_to_insert.append({
                "user_id": user_id,
                "symbol": symbol,
                "signal_id": signal.get("id"),
                "strategy": signal.get("strategy"),
                "signal_type": signal_type,
                "signal_date": signal.get("signal_date"),
            })

    if not alerts_to_insert:
        return

    # Insert with dedup protection (unique constraint)
    supabase.table("watchlist_alerts").insert(alerts_to_insert).execute()
