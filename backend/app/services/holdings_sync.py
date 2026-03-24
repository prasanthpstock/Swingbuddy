from app.brokers.zerodha import ZerodhaAdapter
from app.core.config import settings
from app.core.security import decrypt_text
from app.core.supabase import get_supabase_admin


def sync_holdings_for_user(user_id: str) -> dict:
    supabase = get_supabase_admin()

    connections = (
        supabase.table("broker_connections")
        .select("*")
        .eq("user_id", user_id)
        .eq("broker_name", "zerodha")
        .eq("status", "active")
        .limit(1)
        .execute()
    ).data or []

    if not connections:
        return {"status": "error", "message": "No active Zerodha connection"}

    connection = connections[0]
    access_token = decrypt_text(connection["access_token_encrypted"], settings.encryption_key)

    adapter = ZerodhaAdapter(access_token=access_token)
    holdings = adapter.get_holdings()

    inserted = 0

    for item in holdings:
        quantity = float(item.get("quantity") or 0)
        last_price = float(item.get("last_price") or 0)
        avg_price = float(item.get("average_price") or 0)

        row = {
            "user_id": user_id,
            "broker_connection_id": connection["id"],
            "symbol": item.get("tradingsymbol"),
            "exchange": item.get("exchange"),
            "quantity": quantity,
            "avg_price": avg_price,
            "ltp": last_price,
            "market_value": quantity * last_price,
            "pnl": float(item.get("pnl") or 0),
        }

        supabase.table("holdings_snapshots").insert(row).execute()
        inserted += 1

    return {"status": "success", "inserted": inserted}
