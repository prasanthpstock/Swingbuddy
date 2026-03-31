from supabase import Client


def create_watchlist_alerts(
    supabase: Client,
    signals: list[dict],
) -> list[dict]:
    """
    signals: list of generated signals
    Expected keys: symbol, strategy, signal_type, signal_date
    Returns only the alerts that were newly inserted.
    """

    if not signals:
        return []

    symbols = list({s["symbol"] for s in signals if s.get("symbol")})

    if not symbols:
        return []

    watchlist = (
        supabase.table("watchlist")
        .select("user_id, symbol")
        .in_("symbol", symbols)
        .execute()
    ).data or []

    if not watchlist:
        return []

    symbol_users: dict[str, list[str]] = {}
    for item in watchlist:
        symbol_users.setdefault(item["symbol"], []).append(item["user_id"])

    alerts_to_insert = []

    for signal in signals:
        symbol = signal.get("symbol")
        users = symbol_users.get(symbol, [])

        if not users:
            continue

        signal_type = str(signal.get("signal_type", "")).lower()
        if signal_type not in ["sell", "risk"]:
            continue

        for user_id in users:
            alerts_to_insert.append({
                "user_id": user_id,
                "symbol": symbol,
                "signal_id": signal.get("id"),  # may be None, that's fine
                "strategy": signal.get("strategy"),
                "signal_type": signal_type,
                "signal_date": signal.get("signal_date"),
            })

    if not alerts_to_insert:
        return []

    result = supabase.table("watchlist_alerts").insert(alerts_to_insert).execute()
    return result.data or []
