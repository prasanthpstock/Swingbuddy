from datetime import datetime, timedelta, timezone
from typing import Optional

from app.brokers.zerodha import ZerodhaAdapter
from app.core.config import settings
from app.core.security import decrypt_text
from app.core.supabase import get_supabase_admin
from app.services.strategies.breakout_strategy import generate_breakout_signal
from app.services.strategies.moving_avg_strategy import generate_moving_avg_signal
from app.services.strategies.pnl_strategy import generate_pnl_signal
from app.services.watchlist_alerts import create_watchlist_alerts
from app.services.watchlist_telegram import send_watchlist_alerts_to_telegram


def get_signals_for_user(user_id: str) -> list[dict]:
    supabase = get_supabase_admin()

    latest_response = (
        supabase.table("signals")
        .select("signal_date")
        .eq("user_id", user_id)
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
        .eq("signal_date", latest_signal_date)
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )

    return response.data or []


def _get_latest_snapshot_id(user_id: str) -> Optional[str]:
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


def _get_zerodha_adapter_for_user(user_id: str) -> Optional[ZerodhaAdapter]:
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
        return None

    connection = connections[0]
    access_token = decrypt_text(
        connection["access_token_encrypted"],
        settings.encryption_key,
    )

    return ZerodhaAdapter(access_token=access_token)


def _get_historical_candles_for_symbol(
    adapter: Optional[ZerodhaAdapter],
    symbol: str,
    exchange: Optional[str],
) -> list[dict]:
    if not adapter or not symbol:
        return []

    try:
        to_date = datetime.now(timezone.utc)
        from_date = to_date - timedelta(days=40)

        candles = adapter.get_daily_candles(
            symbol=symbol,
            exchange=exchange or "NSE",
            from_date=from_date,
            to_date=to_date,
        )

        print(f"[BREAKOUT] Candles fetched for {symbol}: {len(candles)}")
        return candles
    except Exception as e:
        print(f"Failed to fetch candles for {symbol}: {e}")
        return []


def _build_signals_for_holding(
    item: dict,
    adapter: Optional[ZerodhaAdapter],
) -> list[dict]:
    signals: list[dict] = []

    pnl_signal = generate_pnl_signal(item)
    if pnl_signal:
        signals.append(pnl_signal)

    candles = _get_historical_candles_for_symbol(
        adapter=adapter,
        symbol=item.get("symbol"),
        exchange=item.get("exchange"),
    )

    moving_avg_signal = generate_moving_avg_signal(item, candles)
    if moving_avg_signal:
        print(f"[MOVING_AVG] Signal for {item.get('symbol')}: {moving_avg_signal}")
        signals.append(moving_avg_signal)
    else:
        print(f"[MOVING_AVG] No signal for {item.get('symbol')}")

    breakout_signal = generate_breakout_signal(item, candles)
    if breakout_signal:
        print(f"[BREAKOUT] Triggered for {item.get('symbol')}: {breakout_signal}")
        signals.append(breakout_signal)
    else:
        print(f"[BREAKOUT] No breakout for {item.get('symbol')}")

    return signals


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

    adapter = _get_zerodha_adapter_for_user(user_id)

    signal_date = datetime.now(timezone.utc).date().isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()

    inserted = 0
    skipped = 0
    errors: list[dict] = []
    created_signals: list[dict] = []

    for item in holdings:
        generated_signals = _build_signals_for_holding(item=item, adapter=adapter)

        for signal in generated_signals:
            symbol = signal["symbol"]
            strategy = signal["strategy"]

            existing = (
                supabase.table("signals")
                .select("id")
                .eq("user_id", user_id)
                .eq("symbol", symbol)
                .eq("strategy", strategy)
                .eq("signal_date", signal_date)
                .limit(1)
                .execute()
            )

            if existing.data:
                skipped += 1
                continue

            row = {
                "user_id": user_id,
                "symbol": symbol,
                "strategy": strategy,
                "signal_type": signal["signal_type"],
                "price": signal["price"],
                "notes": signal["notes"],
                "signal_date": signal_date,
                "created_at": now_iso,
            }

            try:
                supabase.table("signals").insert(row).execute()
                inserted += 1

                created_signals.append(
                    {
                        "symbol": symbol,
                        "strategy": strategy,
                        "signal_type": signal["signal_type"],
                        "signal_date": signal_date,
                    }
                )

            except Exception as e:
                message = str(e)
                print(f"Signal insert failed for {symbol}/{strategy}: {e}")

                if (
                    "duplicate key" in message.lower()
                    or "uq_signals_user_symbol_strategy_day" in message
                ):
                    skipped += 1
                else:
                    errors.append(
                        {
                            "symbol": symbol,
                            "strategy": strategy,
                            "error": message,
                        }
                    )

    if created_signals:
        created_alerts = create_watchlist_alerts(supabase, created_signals)

        if created_alerts:
            alerts_by_user: dict[str, list[dict]] = {}

            for alert in created_alerts:
                alerts_by_user.setdefault(alert["user_id"], []).append(alert)

            for alert_user_id, user_alerts in alerts_by_user.items():
                send_watchlist_alerts_to_telegram(
                    supabase,
                    alert_user_id,
                    user_alerts,
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
