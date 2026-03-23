from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse

from app.api.deps import get_current_user_id
from app.brokers.zerodha import ZerodhaAdapter
from app.core.config import settings
from app.core.security import encrypt_text
from app.core.supabase import get_supabase_admin

router = APIRouter()


@router.get("/broker/zerodha/start")
def start_zerodha_auth(user_id: str = Depends(get_current_user_id)) -> dict:
    adapter = ZerodhaAdapter()
    return {"broker": "zerodha", "login_url": adapter.create_login_url()}


@router.get("/broker/zerodha/callback")
def zerodha_callback(request_token: str = Query(...)) -> RedirectResponse:
    try:
        adapter = ZerodhaAdapter()
        session = adapter.create_session(request_token=request_token)
        access_token = session["access_token"]

        supabase = get_supabase_admin()
        users = supabase.auth.admin.list_users()

        # Handle either list response or object-with-users response
        user_list = users if isinstance(users, list) else getattr(users, "users", [])

        if not user_list:
            raise Exception("No Supabase user found")

        user = user_list[-1]
        user_id = user["id"] if isinstance(user, dict) else user.id

        encrypted = encrypt_text(access_token, settings.encryption_key)

        supabase.table("broker_connections").upsert(
            {
                "user_id": user_id,
                "broker_name": "zerodha",
                "account_label": "Primary Zerodha",
                "access_token_encrypted": encrypted,
                "status": "active",
            },
            on_conflict="user_id,broker_name",
        ).execute()

        return RedirectResponse(
            url=f"{settings.frontend_url}/brokers?status=connected",
            status_code=302,
        )

    except Exception as exc:
        return RedirectResponse(
            url=f"{settings.frontend_url}/brokers?status=error&message={str(exc)}",
            status_code=302,
        )

@router.get("/broker-connections")
def get_broker_connections(user_id: str = Depends(get_current_user_id)) -> list[dict]:
    response = (
        get_supabase_admin()
        .table("broker_connections")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    return response.data or []
