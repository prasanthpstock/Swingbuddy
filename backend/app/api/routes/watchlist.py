from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.api.deps import get_current_user_id
from app.db.supabase import get_supabase

router = APIRouter()


@router.get("")
def get_watchlist(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    result = (
        supabase.table("watchlist")
        .select("id, symbol, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data or []


@router.post("/{symbol}")
def add_to_watchlist(
    symbol: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    normalized_symbol = symbol.strip().upper()

    if not normalized_symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    existing = (
        supabase.table("watchlist")
        .select("id")
        .eq("user_id", user_id)
        .eq("symbol", normalized_symbol)
        .limit(1)
        .execute()
    )

    if existing.data:
        return {"message": "Already in watchlist", "symbol": normalized_symbol}

    result = (
        supabase.table("watchlist")
        .insert(
            {
                "user_id": user_id,
                "symbol": normalized_symbol,
            }
        )
        .execute()
    )

    return {
        "message": "Added to watchlist",
        "symbol": normalized_symbol,
        "item": (result.data or [None])[0],
    }


@router.delete("/{symbol}")
def remove_from_watchlist(
    symbol: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase),
):
    normalized_symbol = symbol.strip().upper()

    if not normalized_symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    (
        supabase.table("watchlist")
        .delete()
        .eq("user_id", user_id)
        .eq("symbol", normalized_symbol)
        .execute()
    )

    return {"message": "Removed from watchlist", "symbol": normalized_symbol}
