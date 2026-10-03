import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_verified_student, require_authenticated_user
from app.models import (
    User, OnlineTest, TestQuestion, TestAttempt, TestAnswer,
    TestStatus, AttemptStatus, ClassMember
)
from app.schemas import (
    OnlineTestOut, QuestionOut, TestAttemptOut, TestAnswerSave, TestAnswerOut
)

router = APIRouter(prefix="/tests", tags=["Student Online Tests & Attempts"])

def make_utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

def serialize_student_question(q: TestQuestion) -> QuestionOut:
    options_list = None
    if q.options:
        try:
            options_list = json.loads(q.options)
        except Exception:
            options_list = []
    return QuestionOut(
        id=q.id,
        test_id=q.test_id,
        question_type=q.question_type,
        title=q.title,
        description=q.description,
        marks=q.marks,
        order_index=q.order_index,
        options=options_list,
        correct_option=None,  # NEVER leak correct answer to students!
        programming_language=q.programming_language,
        starter_code=q.starter_code,
        input_example=q.input_example,
        output_example=q.output_example,
    )

@router.get("", response_model=List[OnlineTestOut])
async def list_available_tests(
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists published online tests available for the student.
    Includes existing attempt status if the student has started or completed a test.
    """
    stmt = (
        select(OnlineTest)
        .options(
            selectinload(OnlineTest.creator),
            selectinload(OnlineTest.class_obj),
            selectinload(OnlineTest.questions),
            selectinload(OnlineTest.attempts),
        )
        .where(OnlineTest.status == TestStatus.PUBLISHED.value)
        .order_by(OnlineTest.created_at.desc())
    )
    res = await db.execute(stmt)
    tests = res.scalars().all()

    out = []
    for t in tests:
        # Check student class enrollment if test is restricted to a class
        if t.class_id and user.role != "teacher":
            mem_stmt = select(ClassMember).where(
                ClassMember.class_id == t.class_id,
                ClassMember.user_id == user.id,
                ClassMember.status == "active",
            )
            mem_res = await db.execute(mem_stmt)
            if not mem_res.scalar_one_or_none():
                continue

        # Find existing attempt for this student
        student_attempt = next((a for a in t.attempts if a.student_id == user.id), None)
        attempt_status = student_attempt.status if student_attempt else None
        attempt_id = student_attempt.id if student_attempt else None

        out.append(
            OnlineTestOut(
                id=t.id,
                title=t.title,
                description=t.description,
                instructions=t.instructions,
                duration_minutes=t.duration_minutes,
                start_time=t.start_time,
                end_time=t.end_time,
                max_marks=t.max_marks,
                status=t.status,
                creator_id=t.creator_id,
                creator_name=t.creator.full_name if t.creator else None,
                class_id=t.class_id,
                class_name=t.class_obj.name if t.class_obj else None,
                question_count=len(t.questions) if t.questions else 0,
                questions=None,  # Conceal questions on overview list
                attempt_status=attempt_status,
                attempt_id=attempt_id,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
        )
    return out

@router.get("/{test_id}", response_model=OnlineTestOut)
async def get_test_overview(
    test_id: int,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves test overview and instructions before starting.
    Questions remain hidden until the attempt is officially started.
    """
    stmt = (
        select(OnlineTest)
        .options(
            selectinload(OnlineTest.creator),
            selectinload(OnlineTest.class_obj),
            selectinload(OnlineTest.questions),
            selectinload(OnlineTest.attempts),
        )
        .where(OnlineTest.id == test_id)
    )
    res = await db.execute(stmt)
    t = res.scalar_one_or_none()
    if not t or (t.status != TestStatus.PUBLISHED.value and user.role != "teacher"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found or unpublished.")

    student_attempt = next((a for a in t.attempts if a.student_id == user.id), None)
    return OnlineTestOut(
        id=t.id,
        title=t.title,
        description=t.description,
        instructions=t.instructions,
        duration_minutes=t.duration_minutes,
        start_time=t.start_time,
        end_time=t.end_time,
        max_marks=t.max_marks,
        status=t.status,
        creator_id=t.creator_id,
        creator_name=t.creator.full_name if t.creator else None,
        class_id=t.class_id,
        class_name=t.class_obj.name if t.class_obj else None,
        question_count=len(t.questions) if t.questions else 0,
        questions=None,
        attempt_status=student_attempt.status if student_attempt else None,
        attempt_id=student_attempt.id if student_attempt else None,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )

@router.post("/{test_id}/start", response_model=TestAttemptOut, status_code=status.HTTP_201_CREATED)
async def start_test_attempt(
    test_id: int,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Starts an online test attempt. Enforces server-side scheduling windows, time limits,
    and single-attempt constraints. Returns question set with answer slots.
    """
    stmt = (
        select(OnlineTest)
        .options(
            selectinload(OnlineTest.questions),
            selectinload(OnlineTest.attempts),
        )
        .where(OnlineTest.id == test_id)
    )
    res = await db.execute(stmt)
    t = res.scalar_one_or_none()
    if not t or (t.status != TestStatus.PUBLISHED.value and user.role != "teacher"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found or unavailable.")

    now = datetime.now(timezone.utc)
    # Check start and end window
    if t.start_time:
        start_tz = t.start_time if t.start_time.tzinfo else t.start_time.replace(tzinfo=timezone.utc)
        if now < start_tz:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Test window has not opened yet.")
    if t.end_time:
        end_tz = t.end_time if t.end_time.tzinfo else t.end_time.replace(tzinfo=timezone.utc)
        if now > end_tz:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Test availability window has closed.")

    # Check for existing attempt
    att_stmt = (
        select(TestAttempt)
        .options(selectinload(TestAttempt.answers))
        .where(TestAttempt.test_id == test_id, TestAttempt.student_id == user.id)
    )
    att_res = await db.execute(att_stmt)
    existing_attempt = att_res.scalar_one_or_none()

    if existing_attempt:
        if existing_attempt.status == AttemptStatus.IN_PROGRESS.value:
            # Check elapsed time
            started_utc = make_utc_aware(existing_attempt.started_at)
            elapsed = (now - started_utc).total_seconds()
            limit_sec = t.duration_minutes * 60
            if elapsed > limit_sec:
                existing_attempt.status = AttemptStatus.EXPIRED.value
                existing_attempt.submitted_at = now
                await db.commit()
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Test time limit has expired.")
            # Return active attempt
            return await get_active_student_attempt(test_id, user, db)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Test has already been submitted.")

    # Initialize new attempt
    new_attempt = TestAttempt(
        test_id=test_id,
        student_id=user.id,
        status=AttemptStatus.IN_PROGRESS.value,
        started_at=now,
        max_score=t.max_marks,
    )
    db.add(new_attempt)
    await db.flush()

    # Create empty answer records for each question
    for q in t.questions:
        ans = TestAnswer(
            attempt_id=new_attempt.id,
            question_id=q.id,
            language=q.programming_language or "python",
            code_answer=q.starter_code,
        )
        db.add(ans)

    await db.commit()
    return await get_active_student_attempt(test_id, user, db)

@router.get("/{test_id}/attempt", response_model=TestAttemptOut)
async def get_active_student_attempt(
    test_id: int,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the active attempt with live countdown timer and saved question answers.
    """
    stmt = (
        select(TestAttempt)
        .options(
            selectinload(TestAttempt.test).selectinload(OnlineTest.questions),
            selectinload(TestAttempt.answers).selectinload(TestAnswer.question),
        )
        .where(TestAttempt.test_id == test_id, TestAttempt.student_id == user.id)
    )
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No test attempt found.")

    now = datetime.now(timezone.utc)
    duration_sec = attempt.test.duration_minutes * 60
    started_utc = make_utc_aware(attempt.started_at)
    elapsed = (now - started_utc).total_seconds()
    remaining = max(0, int(duration_sec - elapsed))

    # Auto-expire if time has lapsed
    if attempt.status == AttemptStatus.IN_PROGRESS.value and remaining == 0:
        attempt.status = AttemptStatus.EXPIRED.value
        attempt.submitted_at = now
        await db.commit()

    answers_out = []
    for ans in attempt.answers:
        q_out = serialize_student_question(ans.question) if ans.question else None
        answers_out.append(
            TestAnswerOut(
                id=ans.id,
                question_id=ans.question_id,
                selected_option=ans.selected_option,
                text_answer=ans.text_answer,
                code_answer=ans.code_answer,
                language=ans.language,
                score=None,  # concealed during attempt
                teacher_feedback=None,
                is_evaluated=ans.is_evaluated,
                question=q_out,
            )
        )

    answers_out.sort(key=lambda a: a.question.order_index if a.question else 0)

    return TestAttemptOut(
        id=attempt.id,
        test_id=attempt.test_id,
        test_title=attempt.test.title if attempt.test else None,
        student_id=attempt.student_id,
        student_name=user.full_name,
        student_email=user.email,
        status=attempt.status,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        duration_minutes=attempt.test.duration_minutes,
        remaining_seconds=remaining,
        total_score=None,
        max_score=attempt.max_score,
        feedback=None,
        evaluator_name=None,
        evaluated_at=None,
        published_at=None,
        answers=answers_out,
    )

@router.put("/attempts/{attempt_id}/answers", response_model=TestAnswerOut)
async def save_test_answer(
    attempt_id: int,
    ans_in: TestAnswerSave,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Saves student answer draft (MCQ selection, short/long text, or code) for a question.
    Validates that the attempt belongs to this student and is actively IN_PROGRESS.
    """
    att_stmt = select(TestAttempt).options(selectinload(TestAttempt.test)).where(TestAttempt.id == attempt_id)
    att_res = await db.execute(att_stmt)
    attempt = att_res.scalar_one_or_none()
    if not attempt or attempt.student_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if attempt.status != AttemptStatus.IN_PROGRESS.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is already completed or expired.")

    # Server-side timer verification
    now = datetime.now(timezone.utc)
    limit_sec = attempt.test.duration_minutes * 60
    started_utc = make_utc_aware(attempt.started_at)
    elapsed = (now - started_utc).total_seconds()
    if elapsed > limit_sec:
        attempt.status = AttemptStatus.EXPIRED.value
        attempt.submitted_at = now
        await db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Test time limit has expired.")

    # Find answer record
    ans_stmt = (
        select(TestAnswer)
        .options(selectinload(TestAnswer.question))
        .where(TestAnswer.attempt_id == attempt_id, TestAnswer.question_id == ans_in.question_id)
    )
    ans_res = await db.execute(ans_stmt)
    answer = ans_res.scalar_one_or_none()

    if not answer:
        answer = TestAnswer(
            attempt_id=attempt_id,
            question_id=ans_in.question_id,
            selected_option=ans_in.selected_option,
            text_answer=ans_in.text_answer,
            code_answer=ans_in.code_answer,
            language=ans_in.language or "python",
        )
        db.add(answer)
    else:
        if ans_in.selected_option is not None:
            answer.selected_option = ans_in.selected_option
        if ans_in.text_answer is not None:
            answer.text_answer = ans_in.text_answer
        if ans_in.code_answer is not None:
            answer.code_answer = ans_in.code_answer
        if ans_in.language is not None:
            answer.language = ans_in.language

    await db.commit()
    await db.refresh(answer)

    q_out = serialize_student_question(answer.question) if answer.question else None
    return TestAnswerOut(
        id=answer.id,
        question_id=answer.question_id,
        selected_option=answer.selected_option,
        text_answer=answer.text_answer,
        code_answer=answer.code_answer,
        language=answer.language,
        score=None,
        teacher_feedback=None,
        is_evaluated=answer.is_evaluated,
        question=q_out,
    )

@router.post("/attempts/{attempt_id}/submit", response_model=TestAttemptOut)
async def submit_test_attempt(
    attempt_id: int,
    user: User = Depends(require_verified_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits the student's completed answer sheet for manual evaluation.
    Idempotent: repeated calls safely return the completed submission.
    """
    stmt = (
        select(TestAttempt)
        .options(
            selectinload(TestAttempt.test),
            selectinload(TestAttempt.answers),
        )
        .where(TestAttempt.id == attempt_id)
    )
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()
    if not attempt or attempt.student_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if attempt.status in (AttemptStatus.SUBMITTED.value, AttemptStatus.EVALUATED.value, AttemptStatus.PUBLISHED.value):
        # Already submitted
        return await get_active_student_attempt(attempt.test_id, user, db)

    now = datetime.now(timezone.utc)
    attempt.status = AttemptStatus.SUBMITTED.value
    attempt.submitted_at = now
    await db.commit()
    await db.refresh(attempt)

    return await get_active_student_attempt(attempt.test_id, user, db)

@router.get("/{test_id}/my-result", response_model=TestAttemptOut)
async def get_my_test_result_by_test_id(
    test_id: int,
    user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Convenience endpoint for student to retrieve their result by test_id.
    """
    stmt = select(TestAttempt).where(TestAttempt.test_id == test_id, TestAttempt.student_id == user.id)
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No attempt found for this test.")
    return await get_test_attempt_result(attempt.id, user, db)

@router.get("/attempts/{attempt_id}/result", response_model=TestAttemptOut)
async def get_test_attempt_result(
    attempt_id: int,
    user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the student's test results.
    Marks and feedback are strictly concealed until the instructor publishes the result.
    """
    stmt = (
        select(TestAttempt)
        .options(
            selectinload(TestAttempt.test).selectinload(OnlineTest.questions),
            selectinload(TestAttempt.student),
            selectinload(TestAttempt.evaluator),
            selectinload(TestAttempt.answers).selectinload(TestAnswer.question),
        )
        .where(TestAttempt.id == attempt_id)
    )
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test attempt not found.")

    if attempt.student_id != user.id and user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    is_published = attempt.status == AttemptStatus.PUBLISHED.value or user.role == "teacher"

    answers_out = []
    for ans in attempt.answers:
        q_out = serialize_student_question(ans.question) if ans.question else None
        answers_out.append(
            TestAnswerOut(
                id=ans.id,
                question_id=ans.question_id,
                selected_option=ans.selected_option,
                text_answer=ans.text_answer,
                code_answer=ans.code_answer,
                language=ans.language,
                score=ans.score if is_published else None,
                teacher_feedback=ans.teacher_feedback if is_published else None,
                is_evaluated=ans.is_evaluated,
                question=q_out,
            )
        )

    answers_out.sort(key=lambda a: a.question.order_index if a.question else 0)

    return TestAttemptOut(
        id=attempt.id,
        test_id=attempt.test_id,
        test_title=attempt.test.title if attempt.test else None,
        student_id=attempt.student_id,
        student_name=attempt.student.full_name if attempt.student else "Student",
        student_email=attempt.student.email if attempt.student else "",
        status=attempt.status,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        duration_minutes=attempt.test.duration_minutes if attempt.test else None,
        remaining_seconds=0,
        total_score=attempt.total_score if is_published else None,
        max_score=attempt.max_score,
        feedback=attempt.feedback if is_published else None,
        evaluator_name=attempt.evaluator.full_name if (is_published and attempt.evaluator) else None,
        evaluated_at=attempt.evaluated_at if is_published else None,
        published_at=attempt.published_at if is_published else None,
        answers=answers_out,
    )
