from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.dependencies import require_authenticated_user, require_active_account
from app.models import User, StudentVerification, VerificationStatus, Notification, AuditLog
from app.schemas import UserRegister, UserLogin, TokenResponse, UserOut, RefreshTokenRequest, UserProfileUpdate, ChangePasswordRequest

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

    # Check if temporary password has expired
    if user.must_change_password and user.temp_password_expires_at:
        now_utc = datetime.now(timezone.utc)
        temp_exp = user.temp_password_expires_at
        if temp_exp.tzinfo is None:
            temp_exp = temp_exp.replace(tzinfo=timezone.utc)
        if now_utc > temp_exp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Temporary recovery credentials have expired. Please contact an instructor or administrator to issue a new temporary credential.",
            )

    token_ver = getattr(user, "token_version", 1) or 1
    access_token = create_access_token(user.id, token_version=token_ver)
    refresh_token = create_refresh_token(user.id, token_version=token_ver)

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
            must_change_password=bool(user.must_change_password),
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

    # Session invalidation check
    token_ver = payload.get("ver")
    if token_ver is not None and user.token_version is not None:
        if token_ver != user.token_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired or was revoked. Please log in again.",
            )

    current_ver = getattr(user, "token_version", 1) or 1
    new_access_token = create_access_token(user.id, token_version=current_ver)
    new_refresh_token = create_refresh_token(user.id, token_version=current_ver)

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
            must_change_password=bool(user.must_change_password),
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
        must_change_password=bool(user.must_change_password),
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
        user.must_change_password = False
        user.temp_password_expires_at = None
        user.token_version = (getattr(user, "token_version", 1) or 1) + 1

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
        must_change_password=bool(user.must_change_password),
        created_at=user.created_at,
    )

@router.post("/change-password", response_model=TokenResponse)
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(require_active_account),
    db: AsyncSession = Depends(get_db),
):
    # Verify current password
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if req.current_password == req.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password.",
        )

    current_user.hashed_password = get_password_hash(req.new_password)
    current_user.must_change_password = False
    current_user.temp_password_expires_at = None
    current_user.token_version = (getattr(current_user, "token_version", 1) or 1) + 1
    current_user.updated_at = datetime.now(timezone.utc)

    # Audit log (no plaintext password recorded)
    db.add(AuditLog(
        user_id=current_user.id,
        action="USER_PASSWORD_CHANGE",
        entity_type="user",
        entity_id=str(current_user.id),
        details=f"User {current_user.username} successfully rotated password.",
    ))

    await db.commit()
    await db.refresh(current_user)

    # Issue fresh tokens with updated token_version
    new_ver = current_user.token_version
    new_access_token = create_access_token(current_user.id, token_version=new_ver)
    new_refresh_token = create_refresh_token(current_user.id, token_version=new_ver)

    v_status = current_user.verification_status

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserOut(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            full_name=current_user.full_name,
            role=current_user.role,
            gender=current_user.gender,
            coordinator_position=current_user.coordinator_position,
            is_active=current_user.is_active,
            is_suspended=current_user.is_suspended,
            suspension_reason=current_user.suspension_reason,
            permissions=[p.name for p in current_user.permissions],
            verification_status=v_status,
            must_change_password=False,
            created_at=current_user.created_at,
        ),
    )
