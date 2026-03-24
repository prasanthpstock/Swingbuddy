from fastapi import APIRouter, Depends

from app.api.deps import get_current_user_id
from app.core.supabase import get_supabase_admin
from app.services.holdings_sync import sync_holdings_for_user

router = APIRouter()


@router.get("/summary")
def get_portfolio_summary(user_id: str = Depends(get_current_user_id)) -> dict:
    rows = (
        get_supabase_admin()
        .table("holdings_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .order("snapshot_at", desc=True)
        .limit(100)
        .execute()
        .data
        or []
    )

    total_value = sum(float(row.get("market_value") or 0) for row in rows)
    total_pnl = sum(float(row.get("pnl") or 0) for row in rows)
    open_positions = len(rows)

    return {
        "total_portfolio_value": round(total_value, 2),
        "total_pnl": round(total_pnl, 2),
        "open_positions": open_positions,
    }


@router.get("/holdings")
def get_holdings(user_id: str = Depends(get_current_user_id)) -> list[dict]:
    response = (
        get_supabase_admin()
        .table("holdings_snapshots")
        .select("*")
        .eq("user_id", user_id)
        .order("snapshot_at", desc=True)
        .limit(100)
        .execute()
    )
    return response.data or []


@router.post("/sync")
def sync_holdings(user_id: str = Depends(get_current_user_id)) -> dict:
    return sync_holdings_for_user(user_id)
