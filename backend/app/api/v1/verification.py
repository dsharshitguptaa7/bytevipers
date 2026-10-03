from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_authenticated_user, require_active_account
from app.models import (
    User, StudentVerification, VerificationAuditLog, VerificationStatus, Notification, AuditLog
)
from app.schemas import VerificationApply, VerificationOut, VerificationAuditLogOut
from app.services.coordinator_service import assign_coordinator_for_student

router = APIRouter(prefix="/verification", tags=["Student Verification"])

def format_verification_out(v: StudentVerification) -> VerificationOut:
    coord_name = v.assigned_coordinator.full_name if getattr(v, "assigned_coordinator", None) else None
    audit_outs = []
    if getattr(v, "audit_logs", None):
        for log in v.audit_logs:
            c_name = log.assigned_coordinator.full_name if getattr(log, "assigned_coordinator", None) else None
            act_name = (
                log.actor.full_name if getattr(log, "actor", None)
                else (log.reviewer.full_name if getattr(log, "reviewer", None) else None)
            )
            audit_outs.append(VerificationAuditLogOut(
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
            ))
    return VerificationOut(
        id=v.id,
        user_id=v.user_id,
        full_name=v.full_name,
        gender=v.gender or (v.user.gender if getattr(v, "user", None) else None),
        institution_name=v.institution_name,
        department=v.department,
        course=v.course,
        semester=v.semester,
        roll_number=v.roll_number,
        institutional_email=v.institutional_email,
        verification_method=v.verification_method,
        document_reference=v.document_reference,
        status=v.status,
        reviewer_id=v.reviewer_id,
        assigned_coordinator_id=v.assigned_coordinator_id,
        assigned_coordinator_name=coord_name,
        reviewer_notes=v.reviewer_notes,
        rejection_reason=v.rejection_reason,
        submitted_at=v.submitted_at,
        reviewed_at=v.reviewed_at,
        created_at=v.created_at,
        updated_at=v.updated_at,
        audit_logs=audit_outs,
    )

@router.get("/me", response_model=VerificationOut)
async def get_my_verification(
    user: User = Depends(require_authenticated_user),
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
        .where(StudentVerification.user_id == user.id)
    )
    res = await db.execute(query)
    verification = res.scalar_one_or_none()

    if not verification:
        now = datetime.now(timezone.utc)
        return VerificationOut(
            id=0,
            user_id=user.id,
            full_name=user.full_name,
            gender=user.gender,
            institution_name="",
            department="",
            course="",
            semester="",
            roll_number="",
            verification_method="student_id",
            status="not_submitted",
            submitted_at=now,
            created_at=now,
            updated_at=now,
        )

    return format_verification_out(verification)

@router.post("/applications", response_model=VerificationOut)
async def submit_verification_application(
    app_in: VerificationApply,
    user: User = Depends(require_active_account),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(StudentVerification)
        .options(selectinload(StudentVerification.audit_logs))
        .where(StudentVerification.user_id == user.id)
    )
    res = await db.execute(query)
    verification = res.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    prev_status = verification.status if verification else "not_submitted"

    if verification:
        curr_status = verification.status.lower()
        if curr_status == "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your student verification has already been approved.",
            )
        if curr_status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your student verification application is already pending review.",
            )

    student_gender = app_in.gender or user.gender or "Male"
    if not user.gender:
        user.gender = student_gender

    # Assign coordinator using least-pending-work strategy
    assigned_coordinator = await assign_coordinator_for_student(db, student_gender)
    assigned_coord_id = assigned_coordinator.id if assigned_coordinator else None

    if not verification:
        verification = StudentVerification(
            user_id=user.id,
            full_name=app_in.full_name,
            gender=student_gender,
            institution_name=app_in.institution_name,
            department=app_in.department,
            course=app_in.course,
            semester=app_in.semester,
            roll_number=app_in.roll_number,
            institutional_email=app_in.institutional_email,
            verification_method=app_in.verification_method,
            document_reference=app_in.document_reference,
            status="pending",
            assigned_coordinator_id=assigned_coord_id,
            submitted_at=now,
        )
        db.add(verification)
    else:
        verification.full_name = app_in.full_name
        verification.gender = student_gender
        verification.institution_name = app_in.institution_name
        verification.department = app_in.department
        verification.course = app_in.course
        verification.semester = app_in.semester
        verification.roll_number = app_in.roll_number
        verification.institutional_email = app_in.institutional_email
        verification.verification_method = app_in.verification_method
        verification.document_reference = app_in.document_reference
        verification.status = "pending"
        verification.assigned_coordinator_id = assigned_coord_id
        verification.submitted_at = now
        verification.rejection_reason = None
        verification.reviewer_notes = None

    await db.flush()

    # Record durable verification audit log entry
    assign_msg = (
        f"Assigned to {assigned_coordinator.full_name} ({assigned_coordinator.coordinator_position})."
        if assigned_coordinator
        else "No active coordinator currently available for this gender group."
    )
    audit_entry = VerificationAuditLog(
        verification_id=verification.id,
        student_id=user.id,
        student_gender=student_gender,
        assigned_coordinator_id=assigned_coord_id,
        actor_id=user.id,
        actor_role="student",
        action="submitted",
        previous_status=prev_status,
        new_status="pending",
        reason=f"Application submitted by student. {assign_msg}",
    )
    db.add(audit_entry)

    # In-app notification
    notif = Notification(
        user_id=user.id,
        title="Verification Application Submitted",
        message="Your student verification application has been submitted and is in the review queue.",
        type="verification",
    )
    db.add(notif)

    # General audit log
    db.add(AuditLog(
        user_id=user.id,
        action="VERIFICATION_APPLY",
        entity_type="student_verification",
        entity_id=str(verification.id),
        details=f"Student applied (gender: {student_gender}). {assign_msg}",
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
        .where(StudentVerification.id == verification.id)
    )
    return format_verification_out(res_final.scalar_one())

@router.get("/history/me", response_model=List[VerificationAuditLogOut])
async def get_my_verification_history(
    user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(VerificationAuditLog)
        .options(
            selectinload(VerificationAuditLog.assigned_coordinator),
            selectinload(VerificationAuditLog.actor),
            selectinload(VerificationAuditLog.reviewer),
        )
        .where(VerificationAuditLog.student_id == user.id)
        .order_by(VerificationAuditLog.created_at.desc())
    )
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
