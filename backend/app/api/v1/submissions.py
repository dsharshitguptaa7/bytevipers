from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_verified_student, require_authenticated_user
from app.models import (
    User, Problem, Submission, SubmissionStatus,
    Assignment, ClassMember
)
from app.schemas import (
    CodeRunRequest, CodeRunResponse,
    SubmissionCreate, SubmissionDraftSave, SubmissionOut
)

router = APIRouter(prefix="/submissions", tags=["Code Submissions & Manual Evaluation"])

@router.post("/run", response_model=CodeRunResponse)
async def run_code(
    run_req: CodeRunRequest,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Code execution endpoint. Temporarily sidelined for this manual evaluation phase.
    Returns clear 503 Service Unavailable indicating Judge0 is disabled.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Automatic code execution (Judge0) is temporarily sidelined for this manual evaluation phase. Please save your work as a draft or submit for manual instructor evaluation.",
    )

@router.post("/draft", response_model=SubmissionOut)
async def save_submission_draft(
    draft_in: SubmissionDraftSave,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Saves or updates a student's working draft code for a problem.
    Guarantees idempotency and prevents duplicate submission records.
    """
    prob_stmt = select(Problem).where(Problem.id == draft_in.problem_id)
    prob_res = await db.execute(prob_stmt)
    problem = prob_res.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    # Search for an existing draft for this user and problem
    stmt = (
        select(Submission)
        .where(
            Submission.user_id == user.id,
            Submission.problem_id == draft_in.problem_id,
            Submission.is_draft == True,
            Submission.status == SubmissionStatus.DRAFT.value,
        )
    )
    res = await db.execute(stmt)
    existing_draft = res.scalar_one_or_none()

    if existing_draft:
        existing_draft.source_code = draft_in.source_code
        existing_draft.language = draft_in.language
        existing_draft.assignment_id = draft_in.assignment_id
        submission = existing_draft
    else:
        submission = Submission(
            user_id=user.id,
            problem_id=draft_in.problem_id,
            assignment_id=draft_in.assignment_id,
            source_code=draft_in.source_code,
            language=draft_in.language,
            status=SubmissionStatus.DRAFT.value,
            is_draft=True,
            max_marks=problem.max_marks or 100.0,
            is_practice=draft_in.assignment_id is None,
        )
        db.add(submission)

    await db.commit()
    await db.refresh(submission)

    return SubmissionOut(
        id=submission.id,
        problem_id=submission.problem_id,
        problem_title=problem.title,
        assignment_id=submission.assignment_id,
        user_id=submission.user_id,
        student_name=user.full_name,
        student_email=user.email,
        source_code=submission.source_code,
        language=submission.language,
        status=submission.status,
        verdict=submission.verdict,
        total_tests=0,
        passed_tests=0,
        is_practice=submission.is_practice,
        marks=None,
        max_marks=submission.max_marks,
        teacher_feedback=None,
        is_draft=submission.is_draft,
        submitted_at=submission.submitted_at,
        created_at=submission.created_at,
        test_results=[],
    )

@router.get("/draft", response_model=SubmissionOut)
async def get_submission_draft(
    problem_id: int = Query(...),
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the student's saved draft code for a problem.
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.problem))
        .where(
            Submission.user_id == user.id,
            Submission.problem_id == problem_id,
            Submission.is_draft == True,
            Submission.status == SubmissionStatus.DRAFT.value,
        )
        .order_by(Submission.updated_at.desc())
    )
    res = await db.execute(stmt)
    draft = res.scalar_one_or_none()
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active draft found.")

    return SubmissionOut(
        id=draft.id,
        problem_id=draft.problem_id,
        problem_title=draft.problem.title if draft.problem else None,
        assignment_id=draft.assignment_id,
        user_id=draft.user_id,
        student_name=user.full_name,
        student_email=user.email,
        source_code=draft.source_code,
        language=draft.language,
        status=draft.status,
        verdict=draft.verdict,
        total_tests=0,
        passed_tests=0,
        is_practice=draft.is_practice,
        marks=None,
        max_marks=draft.max_marks,
        teacher_feedback=None,
        is_draft=draft.is_draft,
        submitted_at=draft.submitted_at,
        created_at=draft.created_at,
        test_results=[],
    )

@router.post("", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
async def submit_code(
    sub_in: SubmissionCreate,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits final code for manual instructor evaluation.
    Judge0 is temporarily sidelined: code is not executed automatically.
    """
    query = (
        select(Problem)
        .where(Problem.id == sub_in.problem_id)
    )
    res = await db.execute(query)
    problem = res.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")

    if not problem.is_published and user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Problem is not published.")

    # Assignment validations if assignment_id is supplied
    is_practice = True
    if sub_in.assignment_id:
        is_practice = False
        assign_stmt = select(Assignment).where(Assignment.id == sub_in.assignment_id)
        assign_res = await db.execute(assign_stmt)
        assignment = assign_res.scalar_one_or_none()
        if not assignment or not assignment.is_published:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found or unpublished.")

        if user.role != "teacher":
            mem_stmt = select(ClassMember).where(
                ClassMember.class_id == assignment.class_id,
                ClassMember.user_id == user.id,
                ClassMember.status == "active",
            )
            mem_res = await db.execute(mem_stmt)
            if not mem_res.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not enrolled in this assignment's class.")

        now = datetime.now(timezone.utc)
        if assignment.due_date:
            due = assignment.due_date if assignment.due_date.tzinfo else assignment.due_date.replace(tzinfo=timezone.utc)
            if now > due and not assignment.allow_late:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignment deadline has passed.")

    # Check if a draft exists that can be promoted to a final submission
    draft_stmt = select(Submission).where(
        Submission.user_id == user.id,
        Submission.problem_id == problem.id,
        Submission.is_draft == True,
        Submission.status == SubmissionStatus.DRAFT.value,
    )
    draft_res = await db.execute(draft_stmt)
    existing_draft = draft_res.scalar_one_or_none()

    now_utc = datetime.now(timezone.utc)
    if existing_draft:
        existing_draft.source_code = sub_in.source_code
        existing_draft.language = sub_in.language
        existing_draft.status = SubmissionStatus.SUBMITTED.value
        existing_draft.is_draft = False
        existing_draft.submitted_at = now_utc
        existing_draft.max_marks = problem.max_marks or 100.0
        submission = existing_draft
    else:
        submission = Submission(
            user_id=user.id,
            problem_id=problem.id,
            assignment_id=sub_in.assignment_id,
            source_code=sub_in.source_code,
            language=sub_in.language,
            status=SubmissionStatus.SUBMITTED.value,
            is_draft=False,
            submitted_at=now_utc,
            max_marks=problem.max_marks or 100.0,
            is_practice=is_practice,
        )
        db.add(submission)

    await db.commit()
    await db.refresh(submission)

    return SubmissionOut(
        id=submission.id,
        problem_id=submission.problem_id,
        problem_title=problem.title,
        assignment_id=submission.assignment_id,
        user_id=submission.user_id,
        student_name=user.full_name,
        student_email=user.email,
        source_code=submission.source_code,
        language=submission.language,
        status=submission.status,
        verdict=submission.verdict,
        total_tests=0,
        passed_tests=0,
        is_practice=submission.is_practice,
        marks=None,
        max_marks=submission.max_marks,
        teacher_feedback=None,
        is_draft=submission.is_draft,
        submitted_at=submission.submitted_at,
        created_at=submission.created_at,
        test_results=[],
    )

@router.get("/{submission_id}", response_model=SubmissionOut)
async def get_submission(
    submission_id: int,
    user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves submission details.
    Conceals marks and teacher feedback from students until status is PUBLISHED.
    """
    query = (
        select(Submission)
        .options(
            selectinload(Submission.problem),
            selectinload(Submission.user),
            selectinload(Submission.evaluator),
            selectinload(Submission.test_results),
        )
        .where(Submission.id == submission_id)
    )
    res = await db.execute(query)
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    if sub.user_id != user.id and user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Determine visibility of marks and teacher feedback
    is_teacher = user.role == "teacher"
    is_published = sub.status == SubmissionStatus.PUBLISHED.value
    show_marks = is_teacher or is_published

    return SubmissionOut(
        id=sub.id,
        problem_id=sub.problem_id,
        problem_title=sub.problem.title if sub.problem else None,
        assignment_id=sub.assignment_id,
        user_id=sub.user_id,
        student_name=sub.user.full_name if sub.user else None,
        student_email=sub.user.email if sub.user else None,
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
        marks=sub.marks if show_marks else None,
        max_marks=sub.max_marks,
        teacher_feedback=sub.teacher_feedback if show_marks else None,
        evaluator_id=sub.evaluator_id if show_marks else None,
        evaluator_name=sub.evaluator.full_name if (show_marks and sub.evaluator) else None,
        evaluated_at=sub.evaluated_at if show_marks else None,
        published_at=sub.published_at if show_marks else None,
        is_draft=sub.is_draft,
        submitted_at=sub.submitted_at,
        created_at=sub.created_at,
        test_results=[],
    )

@router.get("/history/me", response_model=List[SubmissionOut])
async def get_my_submission_history(
    problem_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns student submission history.
    Conceals unpublished marks and teacher feedback.
    """
    query = (
        select(Submission)
        .options(
            selectinload(Submission.problem),
            selectinload(Submission.evaluator),
        )
        .where(Submission.user_id == user.id)
    )
    if problem_id:
        query = query.where(Submission.problem_id == problem_id)

    query = query.order_by(Submission.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    subs = res.scalars().all()

    out = []
    for s in subs:
        is_published = s.status == SubmissionStatus.PUBLISHED.value
        out.append(
            SubmissionOut(
                id=s.id,
                problem_id=s.problem_id,
                problem_title=s.problem.title if s.problem else None,
                assignment_id=s.assignment_id,
                user_id=s.user_id,
                student_name=user.full_name,
                student_email=user.email,
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
                marks=s.marks if is_published else None,
                max_marks=s.max_marks,
                teacher_feedback=s.teacher_feedback if is_published else None,
                evaluator_id=s.evaluator_id if is_published else None,
                evaluator_name=s.evaluator.full_name if (is_published and s.evaluator) else None,
                evaluated_at=s.evaluated_at if is_published else None,
                published_at=s.published_at if is_published else None,
                is_draft=s.is_draft,
                submitted_at=s.submitted_at,
                created_at=s.created_at,
                test_results=None,
            )
        )
    return out
