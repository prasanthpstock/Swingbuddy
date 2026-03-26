from app.core.supabase import get_supabase_admin
from app.services.holdings_sync import sync_holdings_for_user
from app.services.signals import generate_signals_for_user


def run_daily_signal_job() -> dict:
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
                print(f"[JOB] Sync failed for {user_id}: {e}")
                user_result["sync"] = {"status": "error", "message": str(e)}
                results.append(user_result)
                continue

            try:
                signals_result = generate_signals_for_user(user_id)
                print(f"[JOB] Signals result for {user_id}: {signals_result}")
                user_result["signals"] = signals_result
            except Exception as e:
                print(f"[JOB] Signal generation failed for {user_id}: {e}")
                user_result["signals"] = {"status": "error", "message": str(e)}

            results.append(user_result)

            # TEMP: one user only while debugging
            break

        return {
            "status": "success",
            "processed_users": len(results),
            "results": results,
        }

    except Exception as e:
        print(f"[JOB] Fatal job error: {e}")
        return {
            "status": "error",
            "message": str(e),
        }
