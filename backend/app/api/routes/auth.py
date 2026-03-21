from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.deps import get_current_user_id
from app.brokers.zerodha import ZerodhaAdapter
from app.core.config import settings
from app.core.security import encrypt_text
from app.core.supabase import get_supabase_admin

router = APIRouter()

@router.get("/broker/zerodha/start")
def start_zerodha_auth(user_id: str = Depends(get_current_user_id)):
    adapter = ZerodhaAdapter()
    state = user_id
    login_url = f"{adapter.create_login_url()}&redirect_uri={settings.zerodha_redirect_uri}&state={state}"
    return {"broker": "zerodha", "login_url": login_url}

@router.get("/broker/zerodha/callback")
def zerodha_callback(request_token: str = Query(...), state: str | None = Query(default=None)):
    if not state:
        raise HTTPException(status_code=400, detail="Missing state")
    adapter = ZerodhaAdapter()
    session = adapter.create_session(request_token=request_token)
    access_token = session["access_token"]
    encrypted = encrypt_text(access_token, settings.encryption_key)
    get_supabase_admin().table("broker_connections").upsert({"user_id": state, "broker_name": "zerodha", "account_label": "Primary Zerodha", "access_token_encrypted": encrypted, "status": "active"}, on_conflict="user_id,broker_name").execute()
    return {"broker": "zerodha", "status": "connected", "redirect_to": f"{settings.frontend_url}/brokers?status=connected"}
