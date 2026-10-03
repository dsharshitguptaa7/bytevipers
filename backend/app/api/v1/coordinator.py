from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_coordinator
from app.models import (
    User, StudentVerification, VerificationAuditLog, VerificationStatus, Notification, AuditLog
)
from app.schemas import (
    VerificationOut, VerificationReviewAction, VerificationAuditLogOut, CoordinatorStatsOut
)
from app.api.v1.verification import format_verification_out

router = APIRouter(prefix="/coordinator", tags=["Student Coordinator Portal"])

def get_target_gender(v: StudentVerification) -> str:
    if v.gender:
        return v.gender.strip().capitalize()
    if v.user and v.user.gender:
        return v.user.gender.strip().capitalize()
    return "Male"

@router.get("/stats", response_model=CoordinatorStatsOut)
async def get_coordinator_stats(
    coordinator: User = Depends(require_coordinator),
    db: AsyncSession = Depends(get_db),
):
    coord_gender = (coordinator.gender or "Male").strip().capitalize()

    # My pending count
    my_pending_stmt = select(func.count(StudentVerification.id)).where(
        StudentVerification.assigned_coordinator_id == coordinator.id,
        func.lower(StudentVerification.status) == "pending",
    )
    my_p_res = await db.execute(my_pending_stmt)
    my_pending = my_p_res.scalar_one() or 0

    # Gender queue pending count
    gender_pending_stmt = (
        select(func.count(StudentVerification.id))
        .join(User, StudentVerification.user_id == User.id)
        .where(
            func.lower(func.coalesce(StudentVerification.gender, User.gender)) == coord_gender.lower(),
            func.lower(StudentVerification.status) == "pending",
        )
    )
    g_p_res = await db.execute(gender_pending_stmt)
    gender_pending = g_p_res.scalar_one() or 0

    # My approved count
    my_app_stmt = select(func.count(StudentVerification.id)).where(
        StudentVerification.reviewer_id == coordinator.id,
        func.lower(StudentVerification.status) == "approved",
    )
    my_app = (await db.execute(my_app_stmt)).scalar_one() or 0

    # My rejected count
    my_rej_stmt = select(func.count(StudentVerification.id)).where(
        StudentVerification.reviewer_id == coordinator.id,
        func.lower(StudentVerification.status) == "rejected",
    )
    my_rej = (await db.execute(my_rej_stmt)).scalar_one() or 0

    return CoordinatorStatsOut(
        coordinator_name=coordinator.full_name,
        coordinator_position=coordinator.coordinator_position or "Coordinator",
        gender=coord_gender,
        my_pending_count=my_pending,
        gender_queue_pending_count=gender_pending,
        my_approved_count=my_app,
        my_rejected_count=my_rej,
    )

@router.get("/verifications", response_model=List[VerificationOut])
async def list_coordinator_verifications(
    status_filter: Optional[str] = Query(None, description="pending, approved, rejected, or all"),
    my_assigned_only: bool = Query(False, description="Filter only requests assigned directly to me"),
    search: Optional[str] = Query(None, description="Search by name, roll number, or institution"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    coordinator: User = Depends(require_coordinator),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns verification requests STRICTLY restricted to the coordinator's authorized gender group.
    Male coordinators can never access female students; female coordinators can never access male students.
    """
    coord_gender = (coordinator.gender or "Male").strip().capitalize()

    query = (
        select(StudentVerification)
        .join(User, StudentVerification.user_id == User.id)
        .options(
            selectinload(StudentVerification.audit_logs).selectinload(VerificationAuditLog.assigned_coordinator),
            selectinload(StudentVerification.audit_logs).selectinload(VerificationAuditLog.actor),
            selectinload(StudentVerification.audit_logs).selectinload(VerificationAuditLog.reviewer),
            selectinload(StudentVerification.assigned_coordinator),
            selectinload(StudentVerification.user),
        )
        # Strict backend gender filter
        .where(
            func.lower(func.coalesce(StudentVerification.gender, User.gender)) == coord_gender.lower()
        )
    )

    if my_assigned_only:
        query = query.where(StudentVerification.assigned_coordinator_id == coordinator.id)

    if status_filter and status_filter.lower() != "all":
        query = query.where(func.lower(StudentVerification.status) == status_filter.lower())
    else:
        query = query.where(func.lower(StudentVerification.status) != "not_submitted")

    if search:
        query = query.where(
            or_(
                StudentVerification.full_name.ilike(f"%{search}%"),
                StudentVerification.roll_number.ilike(f"%{search}%"),
                StudentVerification.institution_name.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(StudentVerification.submitted_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    verifications = res.scalars().all()
    return [format_verification_out(v) for v in verifications]

@router.get("/verifications/{verification_id}", response_model=VerificationOut)
async def get_coordinator_verification_detail(
    verification_id: int,
    coordinator: User = Depends(require_coordinator),
    db: AsyncSession = Depends(get_db),
):
    coord_gender = (coordinator.gender or "Male").strip().capitalize()

    query = (
        select(StudentVerification)
        .options(
            selectinload(StudentVerification.audit_logs).selectinload(VerificationAuditLog.assigned_coordinator),
            selectinload(StudentVerification.audit_logs).selectinload(VerificationAuditLog.actor),
            selectinload(StudentVerification.audit_logs).selectinload(VerificationAuditLog.reviewer),
            selectinload(StudentVerification.assigned_coordinator),
            selectinload(StudentVerification.user),
        )
        .where(StudentVerification.id == verification_id)
    )
    res = await db.execute(query)
    v = res.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found.")

    student_gender = get_target_gender(v)
    if student_gender.lower() != coord_gender.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: You are authorized to review {coord_gender} students only. This request belongs to a {student_gender} student.",
        )

    return format_verification_out(v)

@router.post("/verifications/{verification_id}/approve", response_model=VerificationOut)
async def coordinator_approve_verification(
    verification_id: int,
    action: VerificationReviewAction,
    coordinator: User = Depends(require_coordinator),
    db: AsyncSession = Depends(get_db),
):
    coord_gender = (coordinator.gender or "Male").strip().capitalize()

    query = (
        select(StudentVerification)
        .options(
            selectinload(StudentVerification.user),
            selectinload(StudentVerification.assigned_coordinator),
        )
        .where(StudentVerification.id == verification_id)
    )
    res = await db.execute(query)
    v = res.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found.")

    # Strict backend gender authorization check
    student_gender = get_target_gender(v)
    if student_gender.lower() != coord_gender.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: You cannot approve verification for a {student_gender} student as a {coord_gender} coordinator.",
        )

    if v.user_id == coordinator.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot approve your own verification request.")

    now = datetime.now(timezone.utc)
    prev_status = v.status
    v.status = VerificationStatus.APPROVED.value
    v.reviewer_id = coordinator.id
    v.reviewed_at = now
    v.reviewer_notes = action.reviewer_notes or "Approved by coordinator"

    # Durable audit log entry
    audit_entry = VerificationAuditLog(
        verification_id=v.id,
        student_id=v.user_id,
        student_gender=student_gender,
        assigned_coordinator_id=v.assigned_coordinator_id or coordinator.id,
        reviewer_id=coordinator.id,
        actor_id=coordinator.id,
        actor_role="coordinator",
        action="approved",
        previous_status=prev_status,
        new_status=VerificationStatus.APPROVED.value,
        reason=action.reviewer_notes or f"Approved by student coordinator {coordinator.full_name}",
    )
    db.add(audit_entry)

    # In-app notification to student
    notif = Notification(
        user_id=v.user_id,
        title="Student Verification Approved!",
        message=f"Your verification application has been approved by Student Coordinator {coordinator.full_name}. You now have full access to the arena.",
        type="verification",
    )
    db.add(notif)

    # General audit log
    db.add(AuditLog(
        user_id=coordinator.id,
        action="COORDINATOR_VERIFICATION_APPROVE",
        entity_type="student_verification",
        entity_id=str(v.id),
        details=f"Approved verification for student ID {v.user_id} by coordinator {coordinator.username} ({coord_gender})",
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

@router.post("/verifications/{verification_id}/reject", response_model=VerificationOut)
async def coordinator_reject_verification(
    verification_id: int,
    action: VerificationReviewAction,
    coordinator: User = Depends(require_coordinator),
    db: AsyncSession = Depends(get_db),
):
    coord_gender = (coordinator.gender or "Male").strip().capitalize()
    reason = action.reason or action.reviewer_notes
    if not reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rejection reason is required.")

    query = (
        select(StudentVerification)
        .options(
            selectinload(StudentVerification.user),
            selectinload(StudentVerification.assigned_coordinator),
        )
        .where(StudentVerification.id == verification_id)
    )
    res = await db.execute(query)
    v = res.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification request not found.")

    # Strict backend gender authorization check
    student_gender = get_target_gender(v)
    if student_gender.lower() != coord_gender.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: You cannot reject verification for a {student_gender} student as a {coord_gender} coordinator.",
        )

    if v.user_id == coordinator.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot review your own verification request.")

    now = datetime.now(timezone.utc)
    prev_status = v.status
    v.status = VerificationStatus.REJECTED.value
    v.reviewer_id = coordinator.id
    v.reviewed_at = now
    v.reviewer_notes = reason
    v.rejection_reason = reason

    # Durable audit log entry
    audit_entry = VerificationAuditLog(
        verification_id=v.id,
        student_id=v.user_id,
        student_gender=student_gender,
        assigned_coordinator_id=v.assigned_coordinator_id or coordinator.id,
        reviewer_id=coordinator.id,
        actor_id=coordinator.id,
        actor_role="coordinator",
        action="rejected",
        previous_status=prev_status,
        new_status=VerificationStatus.REJECTED.value,
        reason=reason,
    )
    db.add(audit_entry)

    # In-app notification to student
    notif = Notification(
        user_id=v.user_id,
        title="Student Verification Rejected",
        message=f"Your verification application was rejected by coordinator {coordinator.full_name}. Reason: {reason}",
        type="verification",
    )
    db.add(notif)

    # General audit log
    db.add(AuditLog(
        user_id=coordinator.id,
        action="COORDINATOR_VERIFICATION_REJECT",
        entity_type="student_verification",
        entity_id=str(v.id),
        details=f"Rejected verification for student ID {v.user_id} by coordinator {coordinator.username} ({coord_gender}). Reason: {reason}",
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
