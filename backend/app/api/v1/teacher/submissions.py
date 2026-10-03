from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models import Submission, Problem, User, SubmissionStatus, Notification
from app.schemas import SubmissionOut, SubmissionEvaluateRequest

router = APIRouter(prefix="/submissions", tags=["Teacher Submission Review & Manual Evaluation"])

@router.get("", response_model=List[SubmissionOut])
async def list_all_submissions(
    problem_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    language: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_permission("submissions.review")),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists submissions for teacher review and evaluation with rich filtering and search.
    """
    query = (
        select(Submission)
        .options(
            selectinload(Submission.problem),
            selectinload(Submission.user),
            selectinload(Submission.evaluator),
        )
    )
    if problem_id:
        query = query.where(Submission.problem_id == problem_id)
    if student_id:
        query = query.where(Submission.user_id == student_id)
    if status_filter:
        query = query.where(Submission.status == status_filter)
    if language:
        query = query.where(Submission.language == language)
    if search:
        query = query.join(Submission.user).where(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(Submission.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    subs = res.scalars().all()

    return [
        SubmissionOut(
            id=s.id,
            problem_id=s.problem_id,
            problem_title=s.problem.title if s.problem else None,
            assignment_id=s.assignment_id,
            user_id=s.user_id,
            student_name=s.user.full_name if s.user else "Unknown",
            student_email=s.user.email if s.user else "",
            source_code=s.source_code,
            language=s.language,
            status=s.status,
            verdict=s.verdict,
            execution_time_ms=s.execution_time_ms,
            memory_used_kb=s.memory_used_kb,
            error_message=s.error_message,
            total_tests=s.total_tests,
            passed_tests=s.passed_tests,
            is_practice=s.is_practice,
            marks=s.marks,
            max_marks=s.max_marks,
            teacher_feedback=s.teacher_feedback,
            evaluator_id=s.evaluator_id,
            evaluator_name=s.evaluator.full_name if s.evaluator else None,
            evaluated_at=s.evaluated_at,
            published_at=s.published_at,
            is_draft=s.is_draft,
            submitted_at=s.submitted_at,
            created_at=s.created_at,
            test_results=None,
        )
        for s in subs
    ]

@router.get("/{submission_id}", response_model=SubmissionOut)
async def get_teacher_submission_detail(
    submission_id: int,
    current_user: User = Depends(require_permission("submissions.review")),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves full submission details for evaluation including source code and student profile.
    """
    query = (
        select(Submission)
        .options(
            selectinload(Submission.problem),
            selectinload(Submission.user),
            selectinload(Submission.evaluator),
        )
        .where(Submission.id == submission_id)
    )
    res = await db.execute(query)
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    return SubmissionOut(
        id=sub.id,
        problem_id=sub.problem_id,
        problem_title=sub.problem.title if sub.problem else "",
        assignment_id=sub.assignment_id,
        user_id=sub.user_id,
        student_name=sub.user.full_name if sub.user else "Unknown",
        student_email=sub.user.email if sub.user else "",
        source_code=sub.source_code,
        language=sub.language,
        status=sub.status,
        verdict=sub.verdict,
        execution_time_ms=sub.execution_time_ms,
        memory_used_kb=sub.memory_used_kb,
        error_message=sub.error_message,
        total_tests=sub.total_tests,
        passed_tests=sub.passed_tests,
        is_practice=sub.is_practice,
        marks=sub.marks,
        max_marks=sub.max_marks,
        teacher_feedback=sub.teacher_feedback,
        evaluator_id=sub.evaluator_id,
        evaluator_name=sub.evaluator.full_name if sub.evaluator else None,
        evaluated_at=sub.evaluated_at,
        published_at=sub.published_at,
        is_draft=sub.is_draft,
        submitted_at=sub.submitted_at,
        created_at=sub.created_at,
        test_results=None,
    )

@router.put("/{submission_id}/evaluate", response_model=SubmissionOut)
async def evaluate_submission(
    submission_id: int,
    eval_req: SubmissionEvaluateRequest,
    current_user: User = Depends(require_permission("submissions.review")),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually grades a code submission, assigns marks, and leaves written feedback.
    Supports saving evaluation as draft or publishing directly.
    """
    query = (
        select(Submission)
        .options(
            selectinload(Submission.problem),
            selectinload(Submission.user),
            selectinload(Submission.evaluator),
        )
        .where(Submission.id == submission_id)
    )
    res = await db.execute(query)
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    if eval_req.marks > sub.max_marks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assigned marks ({eval_req.marks}) cannot exceed maximum marks ({sub.max_marks})."
        )

    now_utc = datetime.now(timezone.utc)
    sub.marks = eval_req.marks
    sub.teacher_feedback = eval_req.teacher_feedback
    sub.evaluator_id = current_user.id
    sub.evaluated_at = now_utc

    if eval_req.publish:
        sub.status = SubmissionStatus.PUBLISHED.value
        sub.published_at = now_utc

        # Send notification to student
        prob_title = sub.problem.title if sub.problem else "Coding Challenge"
        notif = Notification(
            user_id=sub.user_id,
            title="Coding Submission Evaluated",
            message=f"Your submission for '{prob_title}' has been evaluated. Marks: {sub.marks}/{sub.max_marks}.",
            type="submission",
        )
        db.add(notif)
    else:
        sub.status = SubmissionStatus.EVALUATED.value

    await db.commit()
    await db.refresh(sub)

    return SubmissionOut(
        id=sub.id,
        problem_id=sub.problem_id,
        problem_title=sub.problem.title if sub.problem else "",
        assignment_id=sub.assignment_id,
        user_id=sub.user_id,
        student_name=sub.user.full_name if sub.user else "Unknown",
        student_email=sub.user.email if sub.user else "",
        source_code=sub.source_code,
        language=sub.language,
        status=sub.status,
        verdict=sub.verdict,
        execution_time_ms=sub.execution_time_ms,
        memory_used_kb=sub.memory_used_kb,
        error_message=sub.error_message,
        total_tests=sub.total_tests,
        passed_tests=sub.passed_tests,
        is_practice=sub.is_practice,
        marks=sub.marks,
        max_marks=sub.max_marks,
        teacher_feedback=sub.teacher_feedback,
        evaluator_id=sub.evaluator_id,
        evaluator_name=current_user.full_name,
        evaluated_at=sub.evaluated_at,
        published_at=sub.published_at,
        is_draft=sub.is_draft,
        submitted_at=sub.submitted_at,
        created_at=sub.created_at,
        test_results=None,
    )

@router.put("/{submission_id}/publish", response_model=SubmissionOut)
async def publish_submission_evaluation(
    submission_id: int,
    current_user: User = Depends(require_permission("submissions.review")),
    db: AsyncSession = Depends(get_db),
):
    """
    Publishes an already evaluated submission to make marks and feedback visible to the student.
    """
    query = (
        select(Submission)
        .options(
            selectinload(Submission.problem),
            selectinload(Submission.user),
            selectinload(Submission.evaluator),
        )
        .where(Submission.id == submission_id)
    )
    res = await db.execute(query)
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    if sub.marks is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish submission before assigning marks."
        )

    now_utc = datetime.now(timezone.utc)
    sub.status = SubmissionStatus.PUBLISHED.value
    sub.published_at = now_utc

    prob_title = sub.problem.title if sub.problem else "Coding Challenge"
    notif = Notification(
        user_id=sub.user_id,
        title="Coding Evaluation Published",
        message=f"Your evaluation results for '{prob_title}' are now available. Marks: {sub.marks}/{sub.max_marks}.",
        type="submission",
    )
    db.add(notif)

    await db.commit()
    await db.refresh(sub)

    return SubmissionOut(
        id=sub.id,
        problem_id=sub.problem_id,
        problem_title=sub.problem.title if sub.problem else "",
        assignment_id=sub.assignment_id,
        user_id=sub.user_id,
        student_name=sub.user.full_name if sub.user else "Unknown",
        student_email=sub.user.email if sub.user else "",
        source_code=sub.source_code,
        language=sub.language,
        status=sub.status,
        verdict=sub.verdict,
        execution_time_ms=sub.execution_time_ms,
        memory_used_kb=sub.memory_used_kb,
        error_message=sub.error_message,
        total_tests=sub.total_tests,
        passed_tests=sub.passed_tests,
        is_practice=sub.is_practice,
        marks=sub.marks,
        max_marks=sub.max_marks,
        teacher_feedback=sub.teacher_feedback,
        evaluator_id=sub.evaluator_id,
        evaluator_name=sub.evaluator.full_name if sub.evaluator else current_user.full_name,
        evaluated_at=sub.evaluated_at,
        published_at=sub.published_at,
        is_draft=sub.is_draft,
        submitted_at=sub.submitted_at,
        created_at=sub.created_at,
        test_results=None,
    )
