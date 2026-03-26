from app.core.supabase import get_supabase_admin
from app.services.holdings_sync import sync_holdings_for_user
from app.services.signals import generate_signals_for_user


def run_daily_signal_job() -> dict:
    supabase = get_supabase_admin()

    connections_response = (
        supabase.table("broker_connections")
        .select("user_id, broker_name, status")
        .eq("broker_name", "zerodha")
        .eq("status", "active")
        .execute()
    )

    connections = connections_response.data or []
    if not connections:
        return {
            "status": "success",
            "processed_users": 0,
            "results": [],
            "message": "No active Zerodha connections found.",
        }

    seen_users = set()
    results = []

    for connection in connections:
        user_id = connection.get("user_id")
        if not user_id or user_id in seen_users:
            continue

        seen_users.add(user_id)

        sync_result = sync_holdings_for_user(user_id)
        signals_result = generate_signals_for_user(user_id)

        results.append(
            {
                "user_id": user_id,
                "sync": sync_result,
                "signals": signals_result,
            }
        )

    return {
        "status": "success",
        "processed_users": len(seen_users),
        "results": results,
    }
