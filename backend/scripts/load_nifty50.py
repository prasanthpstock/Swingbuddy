from app.core.supabase import get_supabase_admin
from app.data.nifty50 import NIFTY50_SYMBOLS

supabase = get_supabase_admin()

rows = []
for symbol in NIFTY50_SYMBOLS:
    rows.append(
        {
            "symbol": symbol,
            "yahoo_symbol": f"{symbol}.NS",
            "is_nifty50": True,
            "is_active": True,
        }
    )

result = supabase.table("instruments").upsert(
    rows,
    on_conflict="symbol",
).execute()

print(f"Loaded {len(rows)} symbols")
print(result.data[:3] if result.data else "Done")