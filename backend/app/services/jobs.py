import traceback

from app.core.supabase import get_supabase_admin
from app.services.holdings_sync import sync_holdings_for_user
from app.services.signal_alerts import send_signal_alerts_for_user
from app.services.signals import generate_signals_for_user


async def run_daily_signal_job() -> dict:
    supabase = get_supabase_admin()

    try:
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

        total_new_signals = 0
        total_skipped_signals = 0
        total_telegram_sent = 0
        total_telegram_failed = 0

        for connection in connections:
            user_id = connection.get("user_id")
            if not user_id or user_id in seen_users:
                continue

            seen_users.add(user_id)
            print(f"[JOB] Processing user: {user_id}")

            user_result = {"user_id": user_id}

            try:
                sync_result = sync_holdings_for_user(user_id)
                print(f"[JOB] Sync result for {user_id}: {sync_result}")
                user_result["sync"] = sync_result
            except Exception as e:
                print(f"[JOB] Sync failed for {user_id}:")
                print(traceback.format_exc())
                user_result["sync"] = {"status": "error", "message": str(e)}
                results.append(user_result)
                continue

            try:
                signals_result = generate_signals_for_user(user_id)
                print(f"[JOB] Signals result for {user_id}: {signals_result}")
                user_result["signals"] = signals_result

                total_new_signals += signals_result.get("inserted", 0)
                total_skipped_signals += signals_result.get("skipped", 0)

            except Exception as e:
                print(f"[JOB] Signal generation failed for {user_id}:")
                print(traceback.format_exc())
                user_result["signals"] = {"status": "error", "message": str(e)}
                results.append(user_result)
                continue

            try:
                new_signals = signals_result.get("created", [])
                telegram_result = await send_signal_alerts_for_user(
                    user_id=user_id,
                    new_signals=new_signals,
                )
                print(f"[JOB] Telegram result for {user_id}: {telegram_result}")
                user_result["telegram"] = telegram_result

                total_telegram_sent += telegram_result.get("sent", 0)
                total_telegram_failed += telegram_result.get("failed", 0)

            except Exception as e:
                print(f"[JOB] Telegram alert failed for {user_id}:")
                print(traceback.format_exc())
                user_result["telegram"] = {"status": "error", "message": str(e)}

            results.append(user_result)

        return {
            "status": "success",
            "processed_users": len(results),
            "new_signals": total_new_signals,
            "skipped_signals": total_skipped_signals,
            "telegram_sent": total_telegram_sent,
            "telegram_failed": total_telegram_failed,
            "results": results,
        }

    except Exception as e:
        print("[JOB] Fatal job error:")
        print(traceback.format_exc())
        return {
            "status": "error",
            "message": str(e),
        }
