from datetime import date, timedelta
import uuid
import pandas as pd
from app.brokers.zerodha import ZerodhaAdapter
from app.core.config import settings
from app.core.security import decrypt_text
from app.core.supabase import get_supabase_admin
from app.scanners.breakout import BreakoutScanner

NIFTY_50 = ["INFY", "TCS", "RELIANCE", "HCLTECH", "TATAMOTORS", "ICICIBANK", "SBIN", "LT"]

def main():
    supabase = get_supabase_admin()
    job_id = str(uuid.uuid4())
    supabase.table("job_runs").insert({"id": job_id, "job_name": "breakout_scan", "status": "running"}).execute()
    try:
        broker_rows = supabase.table("broker_connections").select("*").eq("broker_name", "zerodha").eq("status", "active").limit(1).execute().data
        if not broker_rows:
            raise RuntimeError("No active Zerodha connection found")
        connection = broker_rows[0]
        user_id = connection["user_id"]
        access_token = decrypt_text(connection["access_token_encrypted"], settings.encryption_key)
        adapter = ZerodhaAdapter(access_token=access_token)
        instruments = adapter.get_instruments("NSE")
        instrument_map = {row["tradingsymbol"]: row["instrument_token"] for row in instruments}
        start_date = date.today() - timedelta(days=120)
        end_date = date.today()
        inserted = 0
        scanner = BreakoutScanner()
        for symbol in NIFTY_50:
            token = instrument_map.get(symbol)
            if not token:
                continue
            candles = adapter.get_historical_data(token, "day", start_date, end_date)
            if not candles:
                continue
            signal = scanner.scan(symbol, pd.DataFrame(candles))
            if not signal:
                continue
            signal.update({"id": str(uuid.uuid4()), "user_id": user_id, "signal_date": str(end_date), "status": "new"})
            supabase.table("signals").insert(signal).execute()
            inserted += 1
        supabase.table("job_runs").update({"status": "success", "summary": f"Inserted {inserted} signals"}).eq("id", job_id).execute()
    except Exception as exc:
        supabase.table("job_runs").update({"status": "failed", "error_text": str(exc)}).eq("id", job_id).execute()
        raise

if __name__ == "__main__":
    main()
