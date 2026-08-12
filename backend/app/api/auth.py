"""Authentication API used by the LunaGuard operator console."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.auth_service import get_auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleRequest(BaseModel):
    credential: str


def _token_from_header(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    return authorization.split(" ", 1)[1].strip()


@router.get("/config")
async def auth_config() -> dict:
    settings = get_settings()
    return {
        "google_enabled": bool(settings.google_client_id),
        "google_client_id": settings.google_client_id or "",
    }


@router.post("/register")
async def register(request: RegisterRequest) -> dict:
    try:
        user, token = get_auth_service().register(request.email, request.name, request.password)
        return {"user": user.as_dict(), "token": token}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/login")
async def login(request: LoginRequest) -> dict:
    try:
        user, token = get_auth_service().login(request.email, request.password)
        return {"user": user.as_dict(), "token": token}
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/google")
async def google_login(request: GoogleRequest) -> dict:
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    try:
        user, token = await get_auth_service().google_login(request.credential, settings.google_client_id)
        return {"user": user.as_dict(), "token": token}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"Google sign-in failed: {exc}") from exc


@router.get("/me")
async def me(authorization: str | None = Header(default=None)) -> dict:
    token = _token_from_header(authorization)
    user = get_auth_service().get_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return {"user": user.as_dict()}


@router.post("/logout")
async def logout(authorization: str | None = Header(default=None)) -> dict:
    token = _token_from_header(authorization)
    get_auth_service().logout(token)
    return {"ok": True}
