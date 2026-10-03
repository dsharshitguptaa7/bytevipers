from typing import Callable, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import decode_token
from app.models import User, StudentVerification, VerificationStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id_str = payload.get("sub")
    if not user_id_str:
        return None
    try:
        user_id = int(user_id_str)
    except ValueError:
        return None

    query = (
        select(User)
        .options(selectinload(User.permissions), selectinload(User.verification))
        .where(User.id == user_id)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        return None

    # Check session invalidation: if token includes a version, it must match user.token_version
    token_ver = payload.get("ver")
    if token_ver is not None and user.token_version is not None:
        if token_ver != user.token_version:
            return None

    return user

async def require_authenticated_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def require_active_account(
    user: User = Depends(require_authenticated_user),
) -> User:
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )
    if user.is_suspended:
        reason = user.suspension_reason or "No reason provided."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is suspended. Reason: {reason}",
        )
    return user

async def require_verified_student(
    user: User = Depends(require_active_account),
) -> User:
    # If the user is a teacher, they can also access student problem solving
    if user.role == "teacher":
        return user

    if user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student account required.",
        )

    if user.verification_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Student verification required. Current status: {user.verification_status}",
        )

    return user

async def require_teacher(
    user: User = Depends(require_active_account),
) -> User:
    if user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor/Teacher privileges required to access this resource.",
        )
    return user

async def require_coordinator(
    user: User = Depends(require_active_account),
) -> User:
    if user.role != "coordinator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student Coordinator privileges required to access this resource.",
        )
    return user

async def require_coordinator_or_teacher(
    user: User = Depends(require_active_account),
) -> User:
    if user.role not in ("coordinator", "teacher"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student Coordinator or Instructor privileges required.",
        )
    return user

def require_permission(permission_name: str) -> Callable:
    async def permission_dependency(
        user: User = Depends(require_teacher),
    ) -> User:
        user_permission_names = [p.name for p in user.permissions]
        # Super-permission or specific permission
        if "platform.superadmin" in user_permission_names or permission_name in user_permission_names:
            return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Action forbidden. Missing required permission: {permission_name}",
        )

    return permission_dependency
