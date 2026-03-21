from fastapi import APIRouter, Depends
from app.api.deps import get_current_user_id
from app.core.supabase import get_supabase_admin

router = APIRouter()

@router.get("")
def list_signals(user_id: str = Depends(get_current_user_id)):
    return get_supabase_admin().table("signals").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute().data or []
