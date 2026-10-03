from typing import List, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_verified_student
from app.models import (
    Assignment, AssignmentProblem, AssignmentSubmission, ClassMember,
    Problem, User, Submission, SubmissionStatus
)
from app.schemas import AssignmentStudentOut, AssignmentProblemOut

router = APIRouter(prefix="/assignments", tags=["Assignments"])

async def _build_assignment_problems(
    db: AsyncSession,
    assignment: Assignment,
    user_id: int,
) -> Tuple[List[AssignmentProblemOut], int, float]:
    # Query student submissions
    sub_stmt = (
        select(Submission)
        .where(
            Submission.user_id == user_id,
            Submission.is_draft == False,
        )
        .order_by(Submission.created_at.desc())
    )
    sub_res = await db.execute(sub_stmt)
    all_user_subs = sub_res.scalars().all()

    # Query AssignmentSubmission records
    as_stmt = select(AssignmentSubmission).where(
        AssignmentSubmission.assignment_id == assignment.id,
        AssignmentSubmission.student_id == user_id,
    )
    as_res = await db.execute(as_stmt)
    as_records = as_res.scalars().all()
    as_map = {r.problem_id: r for r in as_records}

    # Map problem_id -> latest submission
    sub_map = {}
    for s in all_user_subs:
        if s.assignment_id == assignment.id:
            if s.problem_id not in sub_map:
                sub_map[s.problem_id] = s
        elif s.problem_id not in sub_map:
            sub_map[s.problem_id] = s

    prob_list = []
    total_score = 0.0
    attempt_count = 0

    for ap in assignment.problems:
        as_rec = as_map.get(ap.problem_id)
        s_rec = sub_map.get(ap.problem_id)

        status_str = "Unsolved"
        solved = False
        best_score = 0.0
        marks = None
        max_marks = float(ap.points)
        teacher_feedback = None
        submission_id = None
        submitted_at = None
        evaluated_at = None

        if as_rec:
            best_score = as_rec.score
            submission_id = as_rec.submission_id
            submitted_at = as_rec.submitted_at

        if s_rec:
            if not submission_id:
                submission_id = s_rec.id
            if not submitted_at:
                submitted_at = s_rec.submitted_at or s_rec.created_at
            # Check if published
            is_published = s_rec.status == SubmissionStatus.PUBLISHED.value
            if is_published:
                marks = s_rec.marks
                if s_rec.max_marks:
                    max_marks = s_rec.max_marks
                teacher_feedback = s_rec.teacher_feedback
                evaluated_at = s_rec.evaluated_at

                if as_rec:
                    best_score = as_rec.score
                else:
                    if max_marks > 0 and marks is not None:
                        best_score = round((marks / max_marks) * ap.points, 2)
                    elif marks is not None:
                        best_score = marks

                if best_score >= ap.points:
                    status_str = "Solved"
                    solved = True
                else:
                    status_str = "Evaluated"
                    solved = False
            elif s_rec.status in (SubmissionStatus.UNDER_REVIEW.value, SubmissionStatus.EVALUATED.value):
                status_str = "Under Review"
                best_score = 0.0
                marks = None
                teacher_feedback = None
            else:
                status_str = "Submitted"
                best_score = 0.0
                marks = None
                teacher_feedback = None
        elif as_rec:
            # as_rec exists directly
            best_score = as_rec.score
            if as_rec.score >= ap.points:
                status_str = "Solved"
                solved = True
            elif as_rec.score > 0:
                status_str = "Evaluated"
            else:
                status_str = "Submitted"

        if status_str != "Unsolved":
            attempt_count += 1

        total_score += best_score

        prob_list.append(
            AssignmentProblemOut(
                problem_id=ap.problem_id,
                title=ap.problem.title,
                slug=ap.problem.slug,
                difficulty=ap.problem.difficulty,
                points=ap.points,
                order_index=ap.order_index,
                solved=solved,
                best_score=best_score,
                status=status_str,
                submission_id=submission_id,
                marks=marks,
                max_marks=max_marks,
                teacher_feedback=teacher_feedback,
                submitted_at=submitted_at,
                evaluated_at=evaluated_at,
            )
        )

    return prob_list, attempt_count, total_score

@router.get("/my", response_model=List[AssignmentStudentOut])
async def list_student_assignments(
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    # Find all classes where user is member
    member_stmt = select(ClassMember.class_id).where(
        ClassMember.user_id == user.id, ClassMember.status == "active"
    )
    member_res = await db.execute(member_stmt)
    class_ids = member_res.scalars().all()

    if not class_ids:
        return []

    # Get published assignments for these classes
    assign_stmt = (
        select(Assignment)
        .options(
            selectinload(Assignment.class_obj),
            selectinload(Assignment.problems).selectinload(AssignmentProblem.problem),
        )
        .where(
            Assignment.class_id.in_(class_ids),
            Assignment.is_published == True,
        )
        .order_by(Assignment.due_date.asc())
    )
    assign_res = await db.execute(assign_stmt)
    assignments = assign_res.scalars().all()

    out_list = []
    for a in assignments:
        prob_list, attempts, total_score = await _build_assignment_problems(db, a, user.id)
        out_list.append(
            AssignmentStudentOut(
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
                problems=prob_list,
                user_attempts=attempts,
                user_total_score=total_score,
                created_at=a.created_at,
            )
        )

    return out_list

@router.get("/{assignment_id}", response_model=AssignmentStudentOut)
async def get_assignment_detail(
    assignment_id: int,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Assignment)
        .options(
            selectinload(Assignment.class_obj),
            selectinload(Assignment.problems).selectinload(AssignmentProblem.problem),
        )
        .where(Assignment.id == assignment_id)
    )
    res = await db.execute(query)
    a = res.scalar_one_or_none()
    if not a or not a.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    # Check class membership
    if user.role != "teacher":
        mem_stmt = select(ClassMember).where(
            ClassMember.class_id == a.class_id,
            ClassMember.user_id == user.id,
            ClassMember.status == "active",
        )
        mem_res = await db.execute(mem_stmt)
        if not mem_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You are not in this class.")

    prob_list, attempts, total_score = await _build_assignment_problems(db, a, user.id)

    return AssignmentStudentOut(
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
        problems=prob_list,
        user_attempts=attempts,
        user_total_score=total_score,
        created_at=a.created_at,
    )
