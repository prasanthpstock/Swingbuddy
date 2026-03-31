from fastapi import APIRouter, Depends
from supabase import Client

from app.api.deps import get_current_user_id
from app.db.supabase import get_supabase

router = APIRouter()


@router.get("")
def get_watchlist_alerts(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    result = (
        supabase.table("watchlist_alerts")
        .select("id, symbol, signal_type, strategy, signal_date, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return result.data or []
