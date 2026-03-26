from datetime import datetime, timezone

from app.core.supabase import get_supabase_admin


def get_signals_for_user(user_id: str) -> list[dict]:
    supabase = get_supabase_admin()

    latest_response = (
        supabase.table("signals")
        .select("signal_date")
        .eq("user_id", user_id)
        .eq("strategy", "pnl_v1")
        .order("signal_date", desc=True)
        .limit(1)
        .execute()
    )

    latest_rows = latest_response.data or []
    if not latest_rows:
        return []

    latest_signal_date = latest_rows[0]["signal_date"]

    response = (
        supabase.table("signals")
        .select("*")
        .eq("user_id", user_id)
        .eq("strategy", "pnl_v1")
        .eq("signal_date", latest_signal_date)
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
            "created": [],
            "inserted": 0,
            "skipped": 0,
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
            "created": [],
            "inserted": 0,
            "skipped": 0,
        }

    signal_date = datetime.now(timezone.utc).date().isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()

    inserted = 0
    skipped = 0
    errors: list[dict] = []
    created_signals: list[dict] = []

    for item in holdings:
        symbol = item.get("symbol")
        if not symbol:
            skipped += 1
            continue

        existing = (
            supabase.table("signals")
            .select("id")
            .eq("user_id", user_id)
            .eq("symbol", symbol)
            .eq("strategy", "pnl_v1")
            .eq("signal_date", signal_date)
            .limit(1)
            .execute()
        )

        if existing.data:
            skipped += 1
            continue

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

        row = {
            "user_id": user_id,
            "symbol": symbol,
            "strategy": "pnl_v1",
            "signal_type": signal_type,
            "price": ltp,
            "notes": notes,
            "signal_date": signal_date,
            "created_at": now_iso,
        }

        try:
            supabase.table("signals").insert(row).execute()
            inserted += 1

            created_signals.append(
                {
                    "symbol": symbol,
                    "action": signal_type.upper(),
                    "strategy": "pnl_v1",
                    "reason": notes,
                    "price": ltp,
                    "pnl": pnl,
                    "signal_date": signal_date,
                }
            )

        except Exception as e:
            message = str(e)
            print(f"Signal insert failed for {symbol}: {e}")

            if (
                "duplicate key" in message.lower()
                or "uq_signals_user_symbol_strategy_day" in message
            ):
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
            "created": created_signals,
            "inserted": inserted,
            "skipped": skipped,
            "errors": errors,
            "signal_date": signal_date,
        }

    return {
        "status": "success",
        "created": created_signals,
        "inserted": inserted,
        "skipped": skipped,
        "signal_date": signal_date,
    }
