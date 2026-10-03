from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.dependencies import require_authenticated_user, require_active_account
from app.models import User, StudentVerification, VerificationStatus, Notification, AuditLog
from app.schemas import UserRegister, UserLogin, TokenResponse, UserOut, RefreshTokenRequest, UserProfileUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if username or email already exists
    existing = await db.execute(
        select(User).where((User.email == user_in.email) | (User.username == user_in.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email or username already exists.",
        )

    user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        role="student",
        gender=user_in.gender,
        is_active=True,
        is_suspended=False,
    )
    db.add(user)
    await db.flush()

    # Welcome notification
    notif = Notification(
        user_id=user.id,
        title="Welcome to ByteVipers Coding Arena!",
        message="Please complete your student verification application to unlock the problem solving arena and coding judge.",
        type="verification",
    )
    db.add(notif)

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="USER_REGISTER",
        entity_type="user",
        entity_id=str(user.id),
        details=f"User registered with email {user.email} (gender: {user.gender})",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(user)

    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        gender=user.gender,
        coordinator_position=user.coordinator_position,
        is_active=user.is_active,
        is_suspended=user.is_suspended,
        suspension_reason=user.suspension_reason,
        permissions=[],
        verification_status="not_submitted",
        created_at=user.created_at,
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    query = (
        select(User)
        .options(selectinload(User.permissions), selectinload(User.verification))
        .where(
            (User.email == credentials.username_or_email)
            | (User.username == credentials.username_or_email)
        )
    )
    res = await db.execute(query)
    user = res.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )

    if user.is_suspended:
        reason = user.suspension_reason or "Account suspended by administrator."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is suspended: {reason}",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    v_status = user.verification_status

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            gender=user.gender,
            coordinator_position=user.coordinator_position,
            is_active=user.is_active,
            is_suspended=user.is_suspended,
            suspension_reason=user.suspension_reason,
            permissions=[p.name for p in user.permissions],
            verification_status=v_status,
            created_at=user.created_at,
        ),
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    user_id = int(payload.get("sub"))
    query = (
        select(User)
        .options(selectinload(User.permissions), selectinload(User.verification))
        .where(User.id == user_id)
    )
    res = await db.execute(query)
    user = res.scalar_one_or_none()

    if not user or not user.is_active or user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is no longer valid or is suspended.",
        )

    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)

    v_status = user.verification_status

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserOut(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            gender=user.gender,
            coordinator_position=user.coordinator_position,
            is_active=user.is_active,
            is_suspended=user.is_suspended,
            suspension_reason=user.suspension_reason,
            permissions=[p.name for p in user.permissions],
            verification_status=v_status,
            created_at=user.created_at,
        ),
    )

@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(require_authenticated_user)):
    v_status = user.verification_status
    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        gender=user.gender,
        coordinator_position=user.coordinator_position,
        is_active=user.is_active,
        is_suspended=user.is_suspended,
        suspension_reason=user.suspension_reason,
        permissions=[p.name for p in user.permissions],
        verification_status=v_status,
        created_at=user.created_at,
    )

@router.patch("/me", response_model=UserOut)
async def update_me(
    update_data: UserProfileUpdate,
    user: User = Depends(require_active_account),
    db: AsyncSession = Depends(get_db),
):
    if update_data.full_name:
        user.full_name = update_data.full_name
    if update_data.password:
        user.hashed_password = get_password_hash(update_data.password)

    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    v_status = user.verification_status
    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        gender=user.gender,
        coordinator_position=user.coordinator_position,
        is_active=user.is_active,
        is_suspended=user.is_suspended,
        suspension_reason=user.suspension_reason,
        permissions=[p.name for p in user.permissions],
        verification_status=v_status,
        created_at=user.created_at,
    )
