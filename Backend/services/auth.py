import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel
from sqlmodel import Session, select

from config import COOKIE_SECURE, GOOGLE_CLIENT_ID, JWT_SECRET
from database import engine, get_session
from models import User

logger = logging.getLogger(__name__)

if not GOOGLE_CLIENT_ID or not JWT_SECRET:
    raise RuntimeError("GOOGLE_CLIENT_ID and JWT_SECRET must be set in Backend/.env")

router = APIRouter(prefix="/api/auth")

COOKIE_NAME = "session"
JWT_ALGORITHM = "HS256"
SESSION_DAYS = 7


class GoogleLoginRequest(BaseModel):
    credential: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: str | None = None


def create_session_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(session_token: str | None = Cookie(default=None, alias=COOKIE_NAME)) -> User:

    """Dependency: return the logged in user or raise 401."""

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expired, please sign in again")

    # own short session so long lived requests (SSE) do not hold a connection open
    with Session(engine) as session:
        user = session.get(User, payload.get("sub"))

    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return user


@router.post("/google", response_model=UserResponse)
def google_login(request: GoogleLoginRequest, response: Response, session: Session = Depends(get_session)):

    # verifies the signature, expiry, issuer and that the token was issued for our client id
    try:
        info = id_token.verify_oauth2_token(
            request.credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google credential")
    except Exception:
        logger.exception("Could not verify Google credential")
        raise HTTPException(status_code=502, detail="Could not reach Google to verify sign in")

    if not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email is not verified")

    user = session.exec(select(User).where(User.google_sub == info["sub"])).first()

    if user is None:
        user = User(google_sub=info["sub"])

    user.email = info.get("email", "")
    user.name = info.get("name", "")
    user.picture = info.get("picture")
    session.add(user)
    session.commit()
    session.refresh(user)

    response.set_cookie(
        key=COOKIE_NAME,
        value=create_session_token(user.id),
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )

    return user


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/", httponly=True, secure=COOKIE_SECURE, samesite="lax")
    return {"ok": True}
