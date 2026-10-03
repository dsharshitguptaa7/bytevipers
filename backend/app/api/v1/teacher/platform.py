import secrets
import string
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import require_permission, require_teacher
from app.models import User, Permission, AuditLog, StudentVerification
from app.schemas import UserOut, AuditLogOut, PasswordAssistanceResponse

# In-memory sliding window rate tracker: admin_id -> list of attempt datetimes
_STAFF_RECOVERY_ATTEMPTS: Dict[int, List[datetime]] = defaultdict(list)
_MAX_RECOVERY_ATTEMPTS = 5
_RECOVERY_WINDOW_SECONDS = 600  # 10 minutes

def _is_rate_limited(staff_id: int) -> bool:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=_RECOVERY_WINDOW_SECONDS)
    # Filter attempts within window
    _STAFF_RECOVERY_ATTEMPTS[staff_id] = [
        t for t in _STAFF_RECOVERY_ATTEMPTS[staff_id] if t > cutoff
    ]
    if len(_STAFF_RECOVERY_ATTEMPTS[staff_id]) >= _MAX_RECOVERY_ATTEMPTS:
        return True
    _STAFF_RECOVERY_ATTEMPTS[staff_id].append(now)
    return False

def clear_recovery_rate_limits() -> None:
    _STAFF_RECOVERY_ATTEMPTS.clear()

def generate_secure_temporary_password() -> str:
    """Generate high-entropy 14-char temporary credential with mixed charset."""
    specials = "!@#$%&*-_+"
    # Guarantee at least 2 uppercase, 2 lowercase, 2 digits, 2 symbols
    chars = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(string.digits),
        secrets.choice(specials),
        secrets.choice(specials),
    ]
    all_allowed = string.ascii_letters + string.digits + specials
    chars += [secrets.choice(all_allowed) for _ in range(6)]
    # Cryptographic shuffle
    shuffled = chars[:]
    for i in range(len(shuffled) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
    return "".join(shuffled)

router = APIRouter(prefix="/platform", tags=["Teacher Platform & Account Controls"])

class PermissionUpdateRequest(BaseModel):
    permissions: List[str]

class UserSuspensionRequest(BaseModel):
    is_suspended: bool
    reason: str

@router.get("/users", response_model=List[UserOut])
async def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_suspended: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(User)
        .options(selectinload(User.permissions), selectinload(User.verification))
    )
    if search:
        query = query.where(
            or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
            )
        )
    if role:
        query = query.where(User.role == role)
    if is_suspended is not None:
        query = query.where(User.is_suspended == is_suspended)

    query = query.order_by(User.id.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    users = res.scalars().all()

    return [
        UserOut(
            id=u.id,
            email=u.email,
            username=u.username,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            is_suspended=u.is_suspended,
            suspension_reason=u.suspension_reason,
            permissions=[p.name for p in u.permissions],
            verification_status=u.verification.status if u.verification else None,
            created_at=u.created_at,
        )
        for u in users
    ]

@router.get("/permissions/available")
async def list_available_permissions(
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Permission).order_by(Permission.name))
    perms = res.scalars().all()
    return [{"id": p.id, "name": p.name, "description": p.description} for p in perms]

@router.patch("/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: int,
    req: PermissionUpdateRequest,
    current_user: User = Depends(require_permission("platform.configure")),
    db: AsyncSession = Depends(get_db),
):
    # Prevent self-escalation
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot modify your own permissions to prevent privilege escalation.",
        )

    u_res = await db.execute(
        select(User).options(selectinload(User.permissions)).where(User.id == user_id)
    )
    target_user = u_res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if target_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permissions can only be granted to instructor/teacher accounts.",
        )

    # Fetch requested permissions
    p_res = await db.execute(select(Permission).where(Permission.name.in_(req.permissions)))
    matched_perms = p_res.scalars().all()

    target_user.permissions = list(matched_perms)
    target_user.updated_at = datetime.now(timezone.utc)

    db.add(AuditLog(
        user_id=current_user.id,
        action="PERMISSIONS_UPDATE",
        entity_type="user",
        entity_id=str(target_user.id),
        details=f"Updated permissions for user {target_user.username}: {req.permissions}",
    ))

    await db.commit()
    return {"message": "Permissions updated successfully.", "permissions": [p.name for p in target_user.permissions]}

@router.patch("/users/{user_id}/suspend")
async def set_user_suspension(
    user_id: int,
    req: UserSuspensionRequest,
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot suspend your own account.",
        )

    u_res = await db.execute(select(User).where(User.id == user_id))
    target_user = u_res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    target_user.is_suspended = req.is_suspended
    target_user.suspension_reason = req.reason if req.is_suspended else None
    target_user.updated_at = datetime.now(timezone.utc)

    action_name = "USER_SUSPEND" if req.is_suspended else "USER_UNSUSPEND"
    db.add(AuditLog(
        user_id=current_user.id,
        action=action_name,
        entity_type="user",
        entity_id=str(target_user.id),
        details=f"{action_name} user {target_user.username}. Reason: {req.reason}",
    ))

    await db.commit()
    return {
        "message": f"User {'suspended' if req.is_suspended else 'reactivated'} successfully.",
        "is_suspended": target_user.is_suspended,
    }

@router.get("/audit-logs", response_model=List[AuditLogOut])
async def list_audit_logs(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_permission("audit_logs.view")),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).options(selectinload(AuditLog.user))
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)

    query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    logs = res.scalars().all()

    return [
        AuditLogOut(
            id=log.id,
            user_id=log.user_id,
            user_email=log.user.email if log.user else None,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]

@router.post("/users/{user_id}/password-assistance", response_model=PasswordAssistanceResponse)
async def assist_user_password(
    user_id: int,
    request: Request,
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    # Self-assistance prevention
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot perform admin password assistance on your own account. Use the standard password change feature.",
        )

    # Rate limiting for abuse prevention
    if _is_rate_limited(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Password assistance rate limit exceeded. Please wait a few minutes before issuing more temporary credentials.",
        )

    # Fetch target user
    u_res = await db.execute(
        select(User).options(selectinload(User.permissions)).where(User.id == user_id)
    )
    target_user = u_res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Privilege escalation safeguard
    caller_perms = {p.name for p in current_user.permissions}
    is_caller_superadmin = "platform.superadmin" in caller_perms

    target_perms = {p.name for p in target_user.permissions}
    is_target_superadmin = "platform.superadmin" in target_perms

    # Non-superadmin cannot reset any Teacher/Instructor or Superadmin
    if target_user.role == "teacher" and not is_caller_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privilege escalation prevented: Only platform super administrators can assist in recovering credentials for instructor/teacher accounts.",
        )

    # Even superadmin cannot reset another superadmin unless caller is superadmin
    if is_target_superadmin and not is_caller_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privilege escalation prevented: Cannot reset credentials for a platform super administrator.",
        )

    # Generate secure temporary credential
    temp_password = generate_secure_temporary_password()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    target_user.hashed_password = get_password_hash(temp_password)
    target_user.must_change_password = True
    target_user.temp_password_expires_at = expires_at
    target_user.token_version = (getattr(target_user, "token_version", 1) or 1) + 1
    target_user.updated_at = datetime.now(timezone.utc)

    # Audit log (CRITICAL: Do NOT log the plaintext password)
    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        user_id=current_user.id,
        action="ADMIN_PASSWORD_ASSISTANCE",
        entity_type="user",
        entity_id=str(target_user.id),
        details=(
            f"Admin {current_user.username} issued temporary recovery credentials for user "
            f"{target_user.username} ({target_user.email}). Temporary password expires at {expires_at.isoformat()}."
        ),
        ip_address=client_ip,
    ))

    await db.commit()

    return PasswordAssistanceResponse(
        message="Temporary password successfully generated. The user must rotate their password upon next login.",
        user_id=target_user.id,
        username=target_user.username,
        temporary_password=temp_password,
        expires_at=expires_at,
        must_change_password=True,
    )
