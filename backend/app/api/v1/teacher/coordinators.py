from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import require_teacher, require_permission
from app.models import (
    User, StudentVerification, VerificationAuditLog, Permission, AuditLog, Notification
)
from app.schemas import (
    CoordinatorPositionOut, CoordinatorInitialize, CoordinatorUpdate,
    CoordinatorPasswordReset, VerificationReassign, VerificationOut, VerificationAuditLogOut
)
from app.services.coordinator_service import get_all_coordinator_positions
from app.api.v1.verification import format_verification_out

router = APIRouter(tags=["Teacher Coordinator Administration"])

@router.get("/coordinators", response_model=List[CoordinatorPositionOut])
async def list_coordinator_positions(
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """
    Teacher/Super Admin view of the four designated student coordinator positions,
    their accounts, activity status, and workload metrics.
    """
    return await get_all_coordinator_positions(db)

@router.post("/coordinators/initialize", response_model=List[CoordinatorPositionOut])
async def initialize_coordinator(
    data: CoordinatorInitialize,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """
    Safely creates or initializes a coordinator account for one of the four designated positions.
    """
    pos = data.position.lower()
    if pos not in ("male_1", "male_2", "female_1", "female_2"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Position must be one of: male_1, male_2, female_1, female_2",
        )

    # Check if this position is already assigned to a coordinator
    existing_pos = await db.execute(
        select(User).where(User.role == "coordinator", User.coordinator_position == pos)
    )
    if existing_pos.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Position '{pos}' is already assigned. Use the edit coordinator endpoint to update it.",
        )

    # Check email / username uniqueness
    collision = await db.execute(
        select(User).where((User.email == data.email) | (User.username == data.username))
    )
    if collision.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email or username already exists.",
        )

    assigned_gender = "Female" if pos.startswith("female") else "Male"

    # Fetch verification.review permission
    perm_res = await db.execute(select(Permission).where(Permission.name == "verification.review"))
    review_perm = perm_res.scalar_one_or_none()

    new_coord = User(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role="coordinator",
        gender=assigned_gender,
        coordinator_position=pos,
        is_active=True,
        is_suspended=False,
    )
    if review_perm:
        new_coord.permissions = [review_perm]

    db.add(new_coord)
    await db.flush()

    # Platform audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="COORDINATOR_INITIALIZE",
        entity_type="user",
        entity_id=str(new_coord.id),
        details=f"Teacher initialized coordinator account '{new_coord.username}' for position {pos} ({assigned_gender})",
    ))

    await db.commit()
    return await get_all_coordinator_positions(db)

@router.put("/coordinators/{user_id}", response_model=List[CoordinatorPositionOut])
async def update_coordinator(
    user_id: int,
    data: CoordinatorUpdate,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    coord = await db.get(User, user_id)
    if not coord or coord.role != "coordinator":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinator account not found.",
        )

    # Validate email/username collision if modified
    if data.email and data.email != coord.email:
        exist_email = await db.execute(select(User).where(User.email == data.email, User.id != user_id))
        if exist_email.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already in use.")
        coord.email = data.email

    if data.username and data.username != coord.username:
        exist_user = await db.execute(select(User).where(User.username == data.username, User.id != user_id))
        if exist_user.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already in use.")
        coord.username = data.username

    if data.full_name:
        coord.full_name = data.full_name

    if data.is_active is not None:
        coord.is_active = data.is_active

    coord.updated_at = datetime.now(timezone.utc)

    db.add(AuditLog(
        user_id=current_user.id,
        action="COORDINATOR_UPDATE",
        entity_type="user",
        entity_id=str(coord.id),
        details=f"Teacher updated coordinator '{coord.username}' (active={coord.is_active})",
    ))

    await db.commit()
    return await get_all_coordinator_positions(db)

@router.post("/coordinators/{user_id}/reset-password")
async def reset_coordinator_password(
    user_id: int,
    data: CoordinatorPasswordReset,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    coord = await db.get(User, user_id)
    if not coord or coord.role != "coordinator":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinator account not found.",
        )

    coord.hashed_password = get_password_hash(data.new_password)
    coord.updated_at = datetime.now(timezone.utc)

    db.add(AuditLog(
        user_id=current_user.id,
        action="COORDINATOR_PASSWORD_RESET",
        entity_type="user",
        entity_id=str(coord.id),
        details=f"Teacher reset password for coordinator '{coord.username}'",
    ))

    await db.commit()
    return {"message": f"Password reset successfully for coordinator {coord.username}."}

@router.post("/verifications/{verification_id}/reassign", response_model=VerificationOut)
async def reassign_verification(
    verification_id: int,
    data: VerificationReassign,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """
    Reassigns a pending student verification to an eligible coordinator of the SAME gender.
    Maintains append-only audit trail preserving earlier assignment history.
    """
    v_res = await db.execute(
        select(StudentVerification)
        .options(
            selectinload(StudentVerification.user),
            selectinload(StudentVerification.assigned_coordinator),
        )
        .where(StudentVerification.id == verification_id)
    )
    v = v_res.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found.")

    target_coord = await db.get(User, data.coordinator_id)
    if not target_coord or target_coord.role != "coordinator":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected target is not a valid coordinator.")

    if not target_coord.is_active or target_coord.is_suspended:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target coordinator account is not active.")

    student_gender = v.gender or (v.user.gender if v.user else "Male")
    coord_gender = target_coord.gender or "Male"

    # Strictly enforce same-gender reassignment
    if student_gender.strip().lower() != coord_gender.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reassign: Student is {student_gender}, but target coordinator {target_coord.full_name} is {coord_gender}. Must be same gender.",
        )

    prev_coord_id = v.assigned_coordinator_id
    prev_coord_name = v.assigned_coordinator.full_name if v.assigned_coordinator else "None"
    v.assigned_coordinator_id = target_coord.id
    v.assigned_coordinator = target_coord
    v.updated_at = datetime.now(timezone.utc)

    # Durable append-only audit log entry preserving previous history
    reassign_reason = (
        data.reason
        or f"Reassigned from {prev_coord_name} to {target_coord.full_name} ({target_coord.coordinator_position}) by Teacher {current_user.full_name}"
    )
    audit_entry = VerificationAuditLog(
        verification_id=v.id,
        student_id=v.user_id,
        student_gender=student_gender,
        assigned_coordinator_id=target_coord.id,
        actor_id=current_user.id,
        actor_role="teacher",
        action="reassigned",
        previous_status=v.status,
        new_status=v.status,
        reason=reassign_reason,
    )
    db.add(audit_entry)

    # In-app notification to new coordinator
    db.add(Notification(
        user_id=target_coord.id,
        title="Verification Reassigned to You",
        message=f"Student verification for {v.full_name} ({v.roll_number}) was reassigned to you by Teacher {current_user.full_name}.",
        type="verification",
    ))

    # General audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="VERIFICATION_REASSIGN",
        entity_type="student_verification",
        entity_id=str(v.id),
        details=f"Teacher reassigned verification {v.id} to coordinator {target_coord.username} ({coord_gender})",
    ))

    await db.commit()

    res_final = await db.execute(
        select(StudentVerification)
        .options(
            selectinload(StudentVerification.audit_logs).selectinload(VerificationAuditLog.assigned_coordinator),
            selectinload(StudentVerification.audit_logs).selectinload(VerificationAuditLog.actor),
            selectinload(StudentVerification.audit_logs).selectinload(VerificationAuditLog.reviewer),
            selectinload(StudentVerification.assigned_coordinator),
            selectinload(StudentVerification.user),
        )
        .where(StudentVerification.id == v.id)
    )
    return format_verification_out(res_final.scalar_one())
