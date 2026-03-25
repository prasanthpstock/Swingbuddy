from datetime import datetime, timezone

from app.core.supabase import get_supabase_admin


def get_signals_for_user(user_id: str) -> list[dict]:
    response = (
        get_supabase_admin()
        .table("signals")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return response.data or []


def _get_latest_snapshot_id(user_id: str) -> str | None:
    response = (
        get_supabase_admin()
        .table("portfolio_snapshots")
        .select("id")
        .eq("user_id", user_id)
        .order("synced_at", desc=True)
        .limit(1)
        .execute()
    )

    rows = response.data or []
    if not rows:
        return None

    return rows[0]["id"]


def generate_signals_for_user(user_id: str) -> dict:
    supabase = get_supabase_admin()

    snapshot_id = _get_latest_snapshot_id(user_id)
    if not snapshot_id:
        return {
            "status": "error",
            "message": "No portfolio snapshot found. Sync holdings first.",
        }

    holdings_response = (
        supabase.table("holdings_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .eq("snapshot_id", snapshot_id)
        .execute()
    )

    holdings = holdings_response.data or []
    if not holdings:
        return {
            "status": "error",
            "message": "No holdings found in latest snapshot.",
        }

    signal_date = datetime.now(timezone.utc).date().isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()

    inserted = 0
    skipped = 0
    errors: list[dict] = []

    for item in holdings:
        symbol = item.get("symbol")
        if not symbol:
            skipped += 1
            continue

        row = {
            "user_id": user_id,
            "symbol": symbol,
            "strategy": "portfolio_watch_v1",
            "signal_type": "watch",
            "price": item.get("ltp"),
            "notes": "Generated from latest holdings snapshot",
            "signal_date": signal_date,
            "created_at": now_iso,
        }

        try:
            response = supabase.table("signals").insert(row).execute()

            # If execute succeeded but no row came back, still count as inserted cautiously
            if response.data is not None:
                inserted += 1
            else:
                inserted += 1

        except Exception as e:
            message = str(e)

            # Only count real duplicate-key conflicts as skipped
            if "duplicate key" in message.lower() or "uq_signals_user_symbol_strategy_day" in message:
                skipped += 1
            else:
                errors.append(
                    {
                        "symbol": symbol,
                        "error": message,
                    }
                )

    if errors:
        return {
            "status": "error",
            "message": "Some signals failed to insert.",
            "inserted": inserted,
            "skipped": skipped,
            "errors": errors,
        }

    return {
        "status": "success",
        "inserted": inserted,
        "skipped": skipped,
        "signal_date": signal_date,
    }
