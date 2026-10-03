from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models import (
    User, StudentVerification, VerificationAuditLog, VerificationStatus, Notification, AuditLog
)
from app.schemas import VerificationOut, VerificationReviewAction, VerificationAuditLogOut
from app.api.v1.verification import format_verification_out

router = APIRouter(prefix="/verifications", tags=["Teacher Verification Management"])

@router.get("", response_model=List[VerificationOut])
async def list_verifications(
    status_filter: Optional[str] = Query(None, description="PENDING, UNDER_REVIEW, APPROVED, REJECTED, RESUBMISSION_REQUIRED"),
    gender_filter: Optional[str] = Query(None, description="Male or Female"),
    coordinator_id: Optional[int] = Query(None, description="Filter by assigned coordinator ID"),
    search: Optional[str] = Query(None, description="Search by name, roll number, or institution"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_permission("verification.review")),
    db: AsyncSession = Depends(get_db),
):
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
    )

    if status_filter:
        query = query.where(func.lower(StudentVerification.status) == status_filter.lower())
    else:
        query = query.where(func.lower(StudentVerification.status) != "not_submitted")

    if gender_filter:
        query = query.where(func.lower(func.coalesce(StudentVerification.gender, User.gender)) == gender_filter.lower())

    if coordinator_id:
        query = query.where(StudentVerification.assigned_coordinator_id == coordinator_id)

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

@router.get("/audit-history", response_model=List[VerificationAuditLogOut])
async def list_all_verification_audit_history(
    student_id: Optional[int] = Query(default=None),
    coordinator_id: Optional[int] = Query(default=None),
    action: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    current_user: User = Depends(require_permission("audit_logs.view")),
    db: AsyncSession = Depends(get_db),
):
    """
    Teacher/Super Admin view of the complete, durable verification audit history across all students and coordinators.
    """
    query = (
        select(VerificationAuditLog)
        .options(
            selectinload(VerificationAuditLog.assigned_coordinator),
            selectinload(VerificationAuditLog.actor),
            selectinload(VerificationAuditLog.reviewer),
        )
    )

    if student_id:
        query = query.where(VerificationAuditLog.student_id == student_id)
    if coordinator_id:
        query = query.where(VerificationAuditLog.assigned_coordinator_id == coordinator_id)
    if action:
        query = query.where(func.lower(VerificationAuditLog.action) == action.lower())

    query = query.order_by(VerificationAuditLog.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    logs = res.scalars().all()

    results = []
    for log in logs:
        c_name = log.assigned_coordinator.full_name if log.assigned_coordinator else None
        act_name = log.actor.full_name if log.actor else (log.reviewer.full_name if log.reviewer else None)
        results.append(
            VerificationAuditLogOut(
                id=log.id,
                verification_id=log.verification_id,
                student_id=log.student_id,
                student_gender=log.student_gender,
                reviewer_id=log.reviewer_id,
                assigned_coordinator_id=log.assigned_coordinator_id,
                assigned_coordinator_name=c_name,
                actor_id=log.actor_id,
                actor_name=act_name,
                actor_role=log.actor_role,
                action=log.action,
                previous_status=log.previous_status,
                new_status=log.new_status,
                reason=log.reason,
                created_at=log.created_at,
            )
        )
    return results

@router.get("/{verification_id}", response_model=VerificationOut)
async def get_verification_detail(
    verification_id: int,
    current_user: User = Depends(require_permission("verification.review")),
    db: AsyncSession = Depends(get_db),
):
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification application not found.")
    return format_verification_out(v)

@router.post("/{verification_id}/approve", response_model=VerificationOut)
async def approve_verification(
    verification_id: int,
    action: VerificationReviewAction,
    current_user: User = Depends(require_permission("verification.review")),
    db: AsyncSession = Depends(get_db),
):
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification record not found.")

    if v.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot approve your own verification application.")

    now = datetime.now(timezone.utc)
    prev_status = v.status
    v.status = VerificationStatus.APPROVED.value
    v.reviewer_id = current_user.id
    v.reviewed_at = now
    v.reviewer_notes = action.reviewer_notes

    student_gender = v.gender or (v.user.gender if v.user else "Male")

    # Add audit log
    audit_entry = VerificationAuditLog(
        verification_id=v.id,
        student_id=v.user_id,
        student_gender=student_gender,
        assigned_coordinator_id=v.assigned_coordinator_id,
        reviewer_id=current_user.id,
        actor_id=current_user.id,
        actor_role="teacher",
        action="approved",
        previous_status=prev_status,
        new_status=VerificationStatus.APPROVED.value,
        reason=action.reviewer_notes or "Approved by reviewer",
    )
    db.add(audit_entry)

    # In-app notification to student
    notif = Notification(
        user_id=v.user_id,
        title="Student Verification Approved!",
        message="Your student verification has been approved. You now have full access to coding arena, problem library, and assignments.",
        type="verification",
    )
    db.add(notif)

    # Platform audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="VERIFICATION_APPROVE",
        entity_type="student_verification",
        entity_id=str(v.id),
        details=f"Approved verification for student ID {v.user_id}",
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

@router.post("/{verification_id}/reject", response_model=VerificationOut)
async def reject_verification(
    verification_id: int,
    action: VerificationReviewAction,
    current_user: User = Depends(require_permission("verification.review")),
    db: AsyncSession = Depends(get_db),
):
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification record not found.")

    if v.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot review your own verification application.")

    now = datetime.now(timezone.utc)
    prev_status = v.status
    v.status = VerificationStatus.REJECTED.value
    v.reviewer_id = current_user.id
    v.reviewed_at = now
    v.reviewer_notes = action.reviewer_notes or reason
    v.rejection_reason = reason

    student_gender = v.gender or (v.user.gender if v.user else "Male")

    audit_entry = VerificationAuditLog(
        verification_id=v.id,
        student_id=v.user_id,
        student_gender=student_gender,
        assigned_coordinator_id=v.assigned_coordinator_id,
        reviewer_id=current_user.id,
        actor_id=current_user.id,
        actor_role="teacher",
        action="rejected",
        previous_status=prev_status,
        new_status=VerificationStatus.REJECTED.value,
        reason=reason,
    )
    db.add(audit_entry)

    notif = Notification(
        user_id=v.user_id,
        title="Student Verification Rejected",
        message=f"Your verification application was rejected. Reason: {action.reason}",
        type="verification",
    )
    db.add(notif)

    db.add(AuditLog(
        user_id=current_user.id,
        action="VERIFICATION_REJECT",
        entity_type="student_verification",
        entity_id=str(v.id),
        details=f"Rejected verification for student ID {v.user_id}. Reason: {action.reason}",
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

@router.post("/{verification_id}/request-resubmission", response_model=VerificationOut)
async def request_resubmission(
    verification_id: int,
    action: VerificationReviewAction,
    current_user: User = Depends(require_permission("verification.review")),
    db: AsyncSession = Depends(get_db),
):
    if not action.reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reason/instructions for resubmission are required.")

    query = select(StudentVerification).where(StudentVerification.id == verification_id)
    res = await db.execute(query)
    v = res.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification record not found.")

    now = datetime.now(timezone.utc)
    prev_status = v.status
    v.status = VerificationStatus.RESUBMISSION_REQUIRED.value
    v.reviewer_id = current_user.id
    v.reviewed_at = now
    v.reviewer_notes = action.reviewer_notes
    v.rejection_reason = action.reason

    audit_entry = VerificationAuditLog(
        verification_id=v.id,
        student_id=v.user_id,
        reviewer_id=current_user.id,
        previous_status=prev_status,
        new_status=VerificationStatus.RESUBMISSION_REQUIRED.value,
        reason=action.reason,
    )
    db.add(audit_entry)

    notif = Notification(
        user_id=v.user_id,
        title="Verification Resubmission Requested",
        message=f"Please update and resubmit your student verification. Notes: {action.reason}",
        type="verification",
    )
    db.add(notif)

    db.add(AuditLog(
        user_id=current_user.id,
        action="VERIFICATION_RESUBMISSION_REQUEST",
        entity_type="student_verification",
        entity_id=str(v.id),
        details=f"Requested resubmission for student ID {v.user_id}. Reason: {action.reason}",
    ))

    await db.commit()
    res_final = await db.execute(
        select(StudentVerification).options(selectinload(StudentVerification.audit_logs)).where(StudentVerification.id == v.id)
    )
    return res_final.scalar_one()
