from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2.errors import UniqueViolation

from ..database import execute_returning, fetch_one
from ..dependencies import current_user
from ..schemas import ForgotPasswordRequest, LoginRequest, RegisterRequest
from ..services.supabase_auth import send_reset_email, sign_in, sign_up

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    auth_result = sign_up(payload.email.strip().lower(), payload.password)
    user = auth_result.get("user") or auth_result
    if user.get("identities") == []:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That email is already registered. Please log in or check your inbox to confirm it.")
    user_id = (auth_result.get("user") or {}).get("id") or auth_result.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Supabase did not return a user ID. Please try again.")
    try:
        execute_returning(
            """insert into public.profiles (user_id, full_name, phone)
               values (%s, %s, %s) returning user_id, full_name, phone""",
            (user_id, payload.full_name.strip(), payload.phone),
        )
    except UniqueViolation as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That phone number is already registered.") from error
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Your account was created, but we could not save your profile. Please contact support.") from error
    return {"message": "Account created. Check your email to confirm it before logging in.", "email_confirmation_required": not bool(auth_result.get("access_token"))}


@router.post("/login")
def login(payload: LoginRequest):
    identity = payload.identity.strip()
    email = identity.lower()
    if "@" not in identity:
        profile = fetch_one("select u.email from public.profiles p join auth.users u on u.id = p.user_id where p.phone = %s", (identity,))
        if not profile:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email/phone number or password.")
        email = profile["email"]
    result = sign_in(email, payload.password)
    return {"access_token": result["access_token"], "refresh_token": result.get("refresh_token"), "expires_in": result.get("expires_in"), "user": result["user"]}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    send_reset_email(payload.email.strip().lower())
    return {"message": "If an account exists for that email, a password reset link has been sent."}


@router.get("/me")
def me(user=Depends(current_user)):
    profile = fetch_one("select full_name, phone from public.profiles where user_id = %s", (user["id"],))
    return {"user": {"id": user["id"], "email": user.get("email"), "profile": profile}}