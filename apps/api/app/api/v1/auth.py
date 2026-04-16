"""
Auth endpoints — register, login, refresh, logout
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.auth import (
    hash_password, verify_password, create_access_token, get_current_user,
    create_password_reset_token, verify_password_reset_token
)
from app.models.user import User, Plan, UserRole
from app.schemas.user import (
    UserRegister, UserLogin, TokenResponse, UserPublic, UserUpdate,
    PasswordResetRequest, PasswordResetConfirm
)
from app.core.logging_config import logger

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    """Create a new account. The first user becomes SUPER_ADMIN."""
    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Check if this is the first user
    user_count = await db.execute(select(func.count(User.id)))
    is_first_user = user_count.scalar_one() == 0
    role = UserRole.SUPER_ADMIN if is_first_user else UserRole.USER

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        plan=Plan.FREE,
        role=role,
        is_active=True,
        is_verified=False,
        monthly_exports_used=0,
        exports_reset_at=datetime.now(timezone.utc),
    )
    await db.flush()

    token = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, token_type="bearer", user=UserPublic.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate and return a JWT."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled.")

    token = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, token_type="bearer", user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return UserPublic.model_validate(current_user)


@router.post("/password-reset-request")
async def request_password_reset(body: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """Generate a reset token and 'send' it to the user."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        token = create_password_reset_token(user.id)
        # In a real app, send an email here. For this demo, we log it.
        logger.info(f"PASSWORD RESET REQUEST: User {user.email}, Token: {token}")
    
    # Always return 200 to prevent email enumeration
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/password-reset-confirm")
async def confirm_password_reset(body: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    """Change password using a valid reset token."""
    user_id = verify_password_reset_token(body.token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    
    logger.info(f"PASSWORD RESET SUCCESSFUL: User {user.email}")
    return {"message": "Password updated successfully."}
