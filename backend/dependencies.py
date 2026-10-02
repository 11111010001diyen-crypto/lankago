from fastapi import Header, HTTPException, status

from .services.supabase_auth import get_user


def current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
    return get_user(authorization.removeprefix("Bearer ").strip())