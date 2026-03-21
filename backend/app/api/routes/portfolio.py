from fastapi import APIRouter, Depends
from app.api.deps import get_current_user_id
from app.core.supabase import get_supabase_admin

router = APIRouter()

@router.get("/summary")
def get_portfolio_summary(user_id: str = Depends(get_current_user_id)):
    rows = get_supabase_admin().table("holdings_snapshots").select("*").eq("user_id", user_id).limit(100).execute().data or []
    total_value = sum(float(row.get("market_value") or 0) for row in rows)
    total_pnl = sum(float(row.get("pnl") or 0) for row in rows)
    return {"total_portfolio_value": round(total_value, 2), "total_pnl": round(total_pnl, 2), "open_positions": len(rows)}
