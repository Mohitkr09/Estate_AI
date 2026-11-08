
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth import (
    JWT_EXPIRE_MINUTES,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
    require_admin,
)
from models import User
from schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserCreate,
    UserResponse,
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# --------------------------------------------------
# Login
# Public endpoint: users need no token to log in.
# --------------------------------------------------
@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    username = payload.username.strip().lower()

    user = db.scalar(
        select(User).where(User.username == username)
    )

    if (
        user is None
        or not user.is_active
        or not verify_password(
            payload.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return LoginResponse(
        access_token=create_access_token(user),
        expires_in=JWT_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


# --------------------------------------------------
# Get current logged-in user
# Requires a valid JWT access token.
# --------------------------------------------------
@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


# --------------------------------------------------
# Create user
# Admin-only endpoint.
# --------------------------------------------------
@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    username = payload.username.strip().lower()

    existing_user = db.scalar(
        select(User).where(User.username == username)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        )

    user = User(
        username=username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists.",
        )

    return user
