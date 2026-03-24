import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Query
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

    redirect_params = urllib.parse.quote(f"user_id={user_id}", safe="")
    login_url = f"{adapter.create_login_url()}&redirect_params={redirect_params}"

    return {"broker": "zerodha", "login_url": login_url}


@router.get("/broker/zerodha/callback")
def zerodha_callback(
    request_token: str = Query(...),
    user_id: str | None = Query(default=None),
    action: str | None = Query(default=None),
    status: str | None = Query(default=None),
) -> RedirectResponse:
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id")

        adapter = ZerodhaAdapter()
        session = adapter.create_session(request_token=request_token)
        access_token = session["access_token"]

        encrypted = encrypt_text(access_token, settings.encryption_key)

        get_supabase_admin().table("broker_connections").upsert(
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
            url=f"{settings.frontend_url}/brokers?status=error&message={urllib.parse.quote(str(exc))}",
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
