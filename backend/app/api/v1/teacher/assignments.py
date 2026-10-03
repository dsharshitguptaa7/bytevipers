from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_permission, require_teacher
from app.models import (
    Assignment, AssignmentProblem, AssignmentSubmission, Class, Problem, User, AuditLog
)
from app.schemas import (
    AssignmentTeacherOut, AssignmentCreate, AssignmentUpdate,
    AssignmentProblemOut
)

router = APIRouter(prefix="/assignments", tags=["Teacher Assignment Management"])

@router.get("", response_model=List[AssignmentTeacherOut])
async def list_teacher_assignments(
    class_id: Optional[int] = Query(None),
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Assignment)
        .options(
            selectinload(Assignment.class_obj),
            selectinload(Assignment.problems),
            selectinload(Assignment.assignment_submissions),
        )
        .order_by(Assignment.id.desc())
    )
    if class_id:
        query = query.where(Assignment.class_id == class_id)

    res = await db.execute(query)
    assignments = res.scalars().all()

    return [
        AssignmentTeacherOut(
            id=a.id,
            title=a.title,
            description=a.description,
            class_id=a.class_id,
            class_name=a.class_obj.name if a.class_obj else None,
            start_date=a.start_date,
            due_date=a.due_date,
            max_attempts=a.max_attempts,
            allow_late=a.allow_late,
            is_published=a.is_published,
            problems_count=len(a.problems),
            total_points=sum(p.points for p in a.problems),
            submissions_count=len(a.assignment_submissions),
            created_at=a.created_at,
        )
        for a in assignments
    ]

@router.get("/{assignment_id}")
async def get_teacher_assignment_detail(
    assignment_id: int,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Assignment)
        .options(
            selectinload(Assignment.class_obj),
            selectinload(Assignment.problems).selectinload(AssignmentProblem.problem),
            selectinload(Assignment.assignment_submissions).selectinload(AssignmentSubmission.student),
        )
        .where(Assignment.id == assignment_id)
    )
    res = await db.execute(query)
    a = res.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    problems_out = [
        {
            "problem_id": ap.problem_id,
            "title": ap.problem.title,
            "slug": ap.problem.slug,
            "difficulty": ap.problem.difficulty,
            "points": ap.points,
            "order_index": ap.order_index,
        }
        for ap in a.problems
    ]

    submissions_out = [
        {
            "id": s.id,
            "student_id": s.student_id,
            "student_name": s.student.full_name if s.student else "Unknown",
            "student_email": s.student.email if s.student else "",
            "problem_id": s.problem_id,
            "submission_id": s.submission_id,
            "score": s.score,
            "attempt_number": s.attempt_number,
            "submitted_at": s.submitted_at.isoformat(),
        }
        for s in a.assignment_submissions
    ]

    return {
        "id": a.id,
        "title": a.title,
        "description": a.description,
        "class_id": a.class_id,
        "class_name": a.class_obj.name if a.class_obj else None,
        "start_date": a.start_date.isoformat(),
        "due_date": a.due_date.isoformat(),
        "max_attempts": a.max_attempts,
        "allow_late": a.allow_late,
        "is_published": a.is_published,
        "problems": problems_out,
        "submissions": submissions_out,
        "created_at": a.created_at.isoformat(),
    }

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_assignment(
    a_in: AssignmentCreate,
    current_user: User = Depends(require_permission("assignments.create")),
    db: AsyncSession = Depends(get_db),
):
    # Verify class exists
    c_res = await db.execute(select(Class).where(Class.id == a_in.class_id))
    class_obj = c_res.scalar_one_or_none()
    if not class_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    assignment = Assignment(
        title=a_in.title,
        description=a_in.description,
        class_id=a_in.class_id,
        creator_id=current_user.id,
        start_date=a_in.start_date,
        due_date=a_in.due_date,
        max_attempts=a_in.max_attempts,
        allow_late=a_in.allow_late,
        is_published=a_in.is_published,
    )
    db.add(assignment)
    await db.flush()

    for idx, p_item in enumerate(a_in.problems):
        ap = AssignmentProblem(
            assignment_id=assignment.id,
            problem_id=p_item.problem_id,
            points=p_item.points,
            order_index=p_item.order_index or idx,
        )
        db.add(ap)

    db.add(AuditLog(
        user_id=current_user.id,
        action="ASSIGNMENT_CREATE",
        entity_type="assignment",
        entity_id=str(assignment.id),
        details=f"Created assignment {assignment.title} for class ID {assignment.class_id}",
    ))

    await db.commit()
    await db.refresh(assignment)
    return {"id": assignment.id, "message": "Assignment created successfully."}

@router.post("/{assignment_id}/publish")
async def toggle_assignment_publish(
    assignment_id: int,
    current_user: User = Depends(require_permission("assignments.manage")),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    a = res.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    a.is_published = not a.is_published
    a.updated_at = datetime.now(timezone.utc)

    db.add(AuditLog(
        user_id=current_user.id,
        action="ASSIGNMENT_PUBLISH_TOGGLE",
        entity_type="assignment",
        entity_id=str(a.id),
        details=f"Toggled publish for assignment ID {a.id} to {a.is_published}",
    ))

    await db.commit()
    return {"id": a.id, "is_published": a.is_published}
