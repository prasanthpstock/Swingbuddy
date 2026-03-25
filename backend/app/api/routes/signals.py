from fastapi import APIRouter, Depends

from app.api.deps import get_current_user_id
from app.services.signals import get_signals_for_user, generate_signals_for_user

router = APIRouter()


@router.get("")
def get_signals(user_id: str = Depends(get_current_user_id)) -> list[dict]:
    return get_signals_for_user(user_id)


@router.post("/generate")
def generate_signals(user_id: str = Depends(get_current_user_id)) -> dict:
    return generate_signals_for_user(user_id)
