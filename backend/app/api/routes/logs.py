from fastapi import APIRouter, Depends
from app.api.deps import get_current_user_id
from app.core.supabase import get_supabase_admin

router = APIRouter()

@router.get("")
def list_logs(user_id: str = Depends(get_current_user_id)):
    return get_supabase_admin().table("job_runs").select("*").order("started_at", desc=True).limit(50).execute().data or []
