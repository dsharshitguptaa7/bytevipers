from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_verified_student
from app.models import (
    User, Problem, Submission, ProblemProgress, Tag, Assignment, ClassMember,
    AssignmentProblem, AssignmentSubmission
)
from app.schemas import StudentDashboardOut, SubmissionOut, AssignmentStudentOut, AssignmentProblemOut

router = APIRouter(prefix="/student", tags=["Student Dashboard"])

@router.get("/dashboard", response_model=StudentDashboardOut)
async def get_student_dashboard(
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    # 1. Total solved count
    solved_stmt = select(func.count(ProblemProgress.id)).where(
        ProblemProgress.user_id == user.id,
        ProblemProgress.status == "SOLVED",
    )
    solved_res = await db.execute(solved_stmt)
    problems_solved = solved_res.scalar_one() or 0

    # 2. Total submissions & accepted submissions
    sub_count_stmt = select(func.count(Submission.id)).where(Submission.user_id == user.id)
    sub_count_res = await db.execute(sub_count_stmt)
    total_submissions = sub_count_res.scalar_one() or 0

    accepted_stmt = select(func.count(Submission.id)).where(
        Submission.user_id == user.id,
        Submission.verdict == "Accepted",
    )
    accepted_res = await db.execute(accepted_stmt)
    accepted_submissions = accepted_res.scalar_one() or 0

    accuracy_rate = round((accepted_submissions / total_submissions * 100), 1) if total_submissions > 0 else 0.0

    # 3. Recent submissions (last 10)
    recent_stmt = (
        select(Submission)
        .options(selectinload(Submission.problem))
        .where(Submission.user_id == user.id)
        .order_by(Submission.created_at.desc())
        .limit(10)
    )
    recent_res = await db.execute(recent_stmt)
    recent_subs = recent_res.scalars().all()
    recent_out = [
        SubmissionOut(
            id=s.id,
            problem_id=s.problem_id,
            problem_title=s.problem.title if s.problem else None,
            assignment_id=s.assignment_id,
            language=s.language,
            status=s.status,
            verdict=s.verdict,
            execution_time_ms=s.execution_time_ms,
            memory_used_kb=s.memory_used_kb,
            error_message=s.error_message,
            total_tests=s.total_tests,
            passed_tests=s.passed_tests,
            is_practice=s.is_practice,
            created_at=s.created_at,
            test_results=None,
        )
        for s in recent_subs
    ]

    # 4. Difficulty stats (Easy, Medium, Hard)
    difficulty_stats = {"Easy": {"solved": 0, "total": 0}, "Medium": {"solved": 0, "total": 0}, "Hard": {"solved": 0, "total": 0}}
    # Count totals
    diff_totals_stmt = select(Problem.difficulty, func.count(Problem.id)).where(Problem.is_published == True).group_by(Problem.difficulty)
    diff_totals_res = await db.execute(diff_totals_stmt)
    for diff, count in diff_totals_res.all():
        if diff in difficulty_stats:
            difficulty_stats[diff]["total"] = count

    # Count solved by difficulty
    solved_diff_stmt = (
        select(Problem.difficulty, func.count(ProblemProgress.id))
        .join(Problem, Problem.id == ProblemProgress.problem_id)
        .where(
            ProblemProgress.user_id == user.id,
            ProblemProgress.status == "SOLVED",
            Problem.is_published == True,
        )
        .group_by(Problem.difficulty)
    )
    solved_diff_res = await db.execute(solved_diff_stmt)
    for diff, count in solved_diff_res.all():
        if diff in difficulty_stats:
            difficulty_stats[diff]["solved"] = count

    # 5. Topic stats
    topic_stmt = (
        select(Tag.name, func.count(ProblemProgress.id))
        .join(Problem.tags)
        .join(ProblemProgress, ProblemProgress.problem_id == Problem.id)
        .where(
            ProblemProgress.user_id == user.id,
            ProblemProgress.status == "SOLVED",
        )
        .group_by(Tag.name)
    )
    topic_res = await db.execute(topic_stmt)
    topic_stats = {name: count for name, count in topic_res.all()}

    # 6. Active assignments
    mem_stmt = select(ClassMember.class_id).where(ClassMember.user_id == user.id, ClassMember.status == "active")
    mem_res = await db.execute(mem_stmt)
    c_ids = mem_res.scalars().all()
    active_assignments = []
    if c_ids:
        assign_stmt = (
            select(Assignment)
            .options(selectinload(Assignment.class_obj), selectinload(Assignment.problems).selectinload(AssignmentProblem.problem))
            .where(Assignment.class_id.in_(c_ids), Assignment.is_published == True)
            .order_by(Assignment.due_date.asc())
            .limit(5)
        )
        assign_res = await db.execute(assign_stmt)
        for a in assign_res.scalars().all():
            active_assignments.append(
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
                    problems=[],
                    user_attempts=0,
                    user_total_score=0.0,
                    created_at=a.created_at,
                )
            )

    v_status = user.verification_status
    is_verified = (v_status == "approved")

    return StudentDashboardOut(
        verified=is_verified,
        verification_status=v_status,
        problems_solved=problems_solved,
        total_submissions=total_submissions,
        accepted_submissions=accepted_submissions,
        accuracy_rate=accuracy_rate,
        recent_submissions=recent_out,
        difficulty_stats=difficulty_stats,
        topic_stats=topic_stats,
        active_assignments=active_assignments,
    )
