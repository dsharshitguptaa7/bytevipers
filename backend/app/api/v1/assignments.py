from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_verified_student
from app.models import (
    Assignment, AssignmentProblem, AssignmentSubmission, ClassMember, Problem, User
)
from app.schemas import AssignmentStudentOut, AssignmentProblemOut

router = APIRouter(prefix="/assignments", tags=["Assignments"])

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
        # Load student submissions for this assignment
        sub_stmt = select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == a.id,
            AssignmentSubmission.student_id == user.id,
        )
        sub_res = await db.execute(sub_stmt)
        student_subs = sub_res.scalars().all()

        prob_score_map = {}
        for s in student_subs:
            current_best = prob_score_map.get(s.problem_id, 0.0)
            if s.score > current_best:
                prob_score_map[s.problem_id] = s.score

        prob_list = []
        for ap in a.problems:
            best_sc = prob_score_map.get(ap.problem_id, 0.0)
            prob_list.append(
                AssignmentProblemOut(
                    problem_id=ap.problem_id,
                    title=ap.problem.title,
                    slug=ap.problem.slug,
                    difficulty=ap.problem.difficulty,
                    points=ap.points,
                    order_index=ap.order_index,
                    solved=(best_sc >= ap.points),
                    best_score=best_sc,
                )
            )

        total_score = sum(prob_score_map.values())
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
                user_attempts=len(student_subs),
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

    sub_stmt = select(AssignmentSubmission).where(
        AssignmentSubmission.assignment_id == a.id,
        AssignmentSubmission.student_id == user.id,
    )
    sub_res = await db.execute(sub_stmt)
    student_subs = sub_res.scalars().all()

    prob_score_map = {}
    for s in student_subs:
        current_best = prob_score_map.get(s.problem_id, 0.0)
        if s.score > current_best:
            prob_score_map[s.problem_id] = s.score

    prob_list = []
    for ap in a.problems:
        best_sc = prob_score_map.get(ap.problem_id, 0.0)
        prob_list.append(
            AssignmentProblemOut(
                problem_id=ap.problem_id,
                title=ap.problem.title,
                slug=ap.problem.slug,
                difficulty=ap.problem.difficulty,
                points=ap.points,
                order_index=ap.order_index,
                solved=(best_sc >= ap.points),
                best_score=best_sc,
            )
        )

    total_score = sum(prob_score_map.values())
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
        user_attempts=len(student_subs),
        user_total_score=total_score,
        created_at=a.created_at,
    )
