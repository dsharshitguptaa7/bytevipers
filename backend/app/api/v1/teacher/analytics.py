from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_teacher
from app.models import (
    User, StudentVerification, VerificationStatus, Problem, Assignment, Submission, AuditLog
)
from app.schemas import TeacherOverviewOut

router = APIRouter(prefix="/analytics", tags=["Teacher Analytics"])

@router.get("/overview", response_model=TeacherOverviewOut)
async def get_teacher_overview(
    user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    # Total students
    st_count = await db.execute(select(func.count(User.id)).where(User.role == "student"))
    total_students = st_count.scalar_one() or 0

    # Verification counts
    v_approved = await db.execute(
        select(func.count(StudentVerification.id)).where(StudentVerification.status == VerificationStatus.APPROVED.value)
    )
    v_pending = await db.execute(
        select(func.count(StudentVerification.id)).where(
            StudentVerification.status.in_([VerificationStatus.PENDING.value, VerificationStatus.UNDER_REVIEW.value])
        )
    )
    v_rejected = await db.execute(
        select(func.count(StudentVerification.id)).where(StudentVerification.status == VerificationStatus.REJECTED.value)
    )

    # Problem counts
    p_published = await db.execute(select(func.count(Problem.id)).where(Problem.is_published == True))
    p_draft = await db.execute(select(func.count(Problem.id)).where(Problem.is_published == False))

    # Active assignments count
    a_count = await db.execute(select(func.count(Assignment.id)).where(Assignment.is_published == True))

    # Total submissions
    s_count = await db.execute(select(func.count(Submission.id)))

    # Recent platform events from AuditLog
    recent_logs = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(10))
    events = [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in recent_logs.scalars().all()
    ]

    return TeacherOverviewOut(
        total_students=total_students,
        verified_students_count=v_approved.scalar_one() or 0,
        pending_verifications_count=v_pending.scalar_one() or 0,
        rejected_verifications_count=v_rejected.scalar_one() or 0,
        published_problems_count=p_published.scalar_one() or 0,
        draft_problems_count=p_draft.scalar_one() or 0,
        active_assignments_count=a_count.scalar_one() or 0,
        total_submissions_count=s_count.scalar_one() or 0,
        recent_events=events,
    )
