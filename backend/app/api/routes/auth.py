from fastapi import APIRouter, Request, Query
from fastapi.responses import RedirectResponse

from app.brokers.zerodha import ZerodhaAdapter
from app.core.config import settings
from app.core.security import encrypt_text
from app.core.supabase import get_supabase_admin

router = APIRouter()


@router.get("/broker/zerodha/start")
def start_zerodha_auth():
    adapter = ZerodhaAdapter()
    login_url = adapter.create_login_url()
    return {"login_url": login_url}


@router.get("/broker/zerodha/callback")
def zerodha_callback(
    request: Request,
    request_token: str = Query(...),
):
    try:
        adapter = ZerodhaAdapter()
        session = adapter.create_session(request_token=request_token)

        access_token = session["access_token"]

        supabase = get_supabase_admin()

        # 🔥 TEMP FIX: get latest user (since single-user app)
        users = supabase.auth.admin.list_users()
        user = users.users[-1]   # latest created user

        encrypted = encrypt_text(access_token, settings.encryption_key)

        supabase.table("broker_connections").upsert(
            {
                "user_id": user.id,
                "broker_name": "zerodha",
                "account_label": "Primary",
                "access_token_encrypted": encrypted,
                "status": "active",
            },
            on_conflict="user_id,broker_name",
        ).execute()

        return RedirectResponse(
            url=f"{settings.frontend_url}/brokers?status=connected"
        )

    except Exception as e:
        return RedirectResponse(
            url=f"{settings.frontend_url}/brokers?status=error&message={str(e)}"
        )
