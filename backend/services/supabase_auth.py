import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

from ..config import SUPABASE_ANON_KEY, SUPABASE_URL


def _request(path: str, method: str = "POST", payload: dict | None = None, access_token: str | None = None):
    headers = {"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(f"{SUPABASE_URL}{path}", data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8")) if response.length != 0 else {}
    except HTTPError as error:
        try:
            details = json.loads(error.read().decode("utf-8"))
        except json.JSONDecodeError:
            details = {}
        message = details.get("msg") or details.get("message") or "Supabase Auth request failed."
        raise HTTPException(status_code=error.code, detail=message) from error
    except URLError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Authentication service is unavailable.") from error


def sign_up(email: str, password: str):
    return _request("/auth/v1/signup", payload={"email": email, "password": password})


def sign_in(email: str, password: str):
    return _request("/auth/v1/token?grant_type=password", payload={"email": email, "password": password})


def send_reset_email(email: str):
    return _request("/auth/v1/recover", payload={"email": email})


def get_user(access_token: str):
    return _request("/auth/v1/user", method="GET", access_token=access_token)