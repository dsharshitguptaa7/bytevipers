import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import require_permission, require_teacher
from app.models import (
    User, OnlineTest, TestQuestion, TestAttempt, TestAnswer,
    TestStatus, QuestionType, AttemptStatus, Notification, Class
)
from app.schemas import (
    OnlineTestCreate, OnlineTestUpdate, OnlineTestOut,
    QuestionCreate, QuestionUpdate, QuestionOut,
    TestAttemptOut, TestAttemptEvaluateRequest, TestAnswerOut, AnswerEvaluateItem
)

router = APIRouter(prefix="/tests", tags=["Teacher Online Test Management & Evaluation"])

def serialize_question(q: TestQuestion, include_correct: bool = True) -> QuestionOut:
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
        correct_option=q.correct_option if include_correct else None,
        programming_language=q.programming_language,
        starter_code=q.starter_code,
        input_example=q.input_example,
        output_example=q.output_example,
    )

def serialize_test(t: OnlineTest, include_questions: bool = True, include_correct: bool = True) -> OnlineTestOut:
    questions_out = None
    if include_questions and t.questions:
        questions_out = [serialize_question(q, include_correct=include_correct) for q in t.questions]
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
        questions=questions_out,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )

@router.post("", response_model=OnlineTestOut, status_code=status.HTTP_201_CREATED)
async def create_online_test(
    test_in: OnlineTestCreate,
    current_user: User = Depends(require_permission("tests.create")),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new online test. Can optionally include initial questions.
    """
    now_utc = datetime.now(timezone.utc)
    new_test = OnlineTest(
        title=test_in.title,
        description=test_in.description,
        instructions=test_in.instructions,
        duration_minutes=test_in.duration_minutes,
        start_time=test_in.start_time,
        end_time=test_in.end_time,
        max_marks=test_in.max_marks or 0.0,
        status=TestStatus.DRAFT.value,
        creator_id=current_user.id,
        class_id=test_in.class_id,
        created_at=now_utc,
        updated_at=now_utc,
    )
    db.add(new_test)
    await db.flush()

    total_marks = 0.0
    for idx, q_data in enumerate(test_in.questions):
        options_json = json.dumps(q_data.options) if q_data.options else None
        q = TestQuestion(
            test_id=new_test.id,
            question_type=q_data.question_type,
            title=q_data.title,
            description=q_data.description,
            marks=q_data.marks,
            order_index=q_data.order_index or idx + 1,
            options=options_json,
            correct_option=q_data.correct_option,
            programming_language=q_data.programming_language or "python",
            starter_code=q_data.starter_code,
            input_example=q_data.input_example,
            output_example=q_data.output_example,
        )
        db.add(q)
        total_marks += q_data.marks

    if test_in.max_marks is None and total_marks > 0:
        new_test.max_marks = total_marks

    await db.commit()

    # Reload with relationships
    stmt = (
        select(OnlineTest)
        .options(
            selectinload(OnlineTest.creator),
            selectinload(OnlineTest.class_obj),
            selectinload(OnlineTest.questions),
        )
        .where(OnlineTest.id == new_test.id)
    )
    res = await db.execute(stmt)
    loaded_test = res.scalar_one()
    return serialize_test(loaded_test, include_questions=True, include_correct=True)

@router.get("", response_model=List[OnlineTestOut])
async def list_teacher_tests(
    class_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_permission("tests.create")),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists online tests created by or accessible to teachers.
    """
    stmt = (
        select(OnlineTest)
        .options(
            selectinload(OnlineTest.creator),
            selectinload(OnlineTest.class_obj),
            selectinload(OnlineTest.questions),
        )
    )
    if class_id:
        stmt = stmt.where(OnlineTest.class_id == class_id)
    if status_filter:
        stmt = stmt.where(OnlineTest.status == status_filter)

    stmt = stmt.order_by(OnlineTest.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(stmt)
    tests = res.scalars().all()
    return [serialize_test(t, include_questions=True, include_correct=True) for t in tests]

@router.get("/{test_id}", response_model=OnlineTestOut)
async def get_teacher_test_detail(
    test_id: int,
    current_user: User = Depends(require_permission("tests.create")),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves full details of a test including all questions with teacher answer keys.
    """
    stmt = (
        select(OnlineTest)
        .options(
            selectinload(OnlineTest.creator),
            selectinload(OnlineTest.class_obj),
            selectinload(OnlineTest.questions),
        )
        .where(OnlineTest.id == test_id)
    )
    res = await db.execute(stmt)
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")
    return serialize_test(t, include_questions=True, include_correct=True)

@router.put("/{test_id}", response_model=OnlineTestOut)
async def update_online_test(
    test_id: int,
    test_update: OnlineTestUpdate,
    current_user: User = Depends(require_permission("tests.create")),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates test metadata, duration, availability windows, or max marks.
    """
    stmt = (
        select(OnlineTest)
        .options(
            selectinload(OnlineTest.creator),
            selectinload(OnlineTest.class_obj),
            selectinload(OnlineTest.questions),
        )
        .where(OnlineTest.id == test_id)
    )
    res = await db.execute(stmt)
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")

    if test_update.title is not None:
        t.title = test_update.title
    if test_update.description is not None:
        t.description = test_update.description
    if test_update.instructions is not None:
        t.instructions = test_update.instructions
    if test_update.duration_minutes is not None:
        t.duration_minutes = test_update.duration_minutes
    if test_update.start_time is not None:
        t.start_time = test_update.start_time
    if test_update.end_time is not None:
        t.end_time = test_update.end_time
    if test_update.max_marks is not None:
        t.max_marks = test_update.max_marks
    if test_update.class_id is not None:
        t.class_id = test_update.class_id
    if test_update.status is not None:
        t.status = test_update.status

    t.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(t)
    return serialize_test(t, include_questions=True, include_correct=True)

@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_online_test(
    test_id: int,
    current_user: User = Depends(require_permission("tests.create")),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes an online test if no submitted student attempts exist.
    """
    stmt = (
        select(OnlineTest)
        .options(selectinload(OnlineTest.attempts))
        .where(OnlineTest.id == test_id)
    )
    res = await db.execute(stmt)
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")

    submitted_attempts = [a for a in t.attempts if a.status != AttemptStatus.IN_PROGRESS.value]
    if submitted_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete test because students have already submitted attempts.",
        )

    await db.delete(t)
    await db.commit()

@router.post("/{test_id}/publish", response_model=OnlineTestOut)
async def publish_online_test(
    test_id: int,
    current_user: User = Depends(require_permission("tests.create")),
    db: AsyncSession = Depends(get_db),
):
    """
    Publishes an online test, making it accessible to authorized students.
    """
    stmt = (
        select(OnlineTest)
        .options(
            selectinload(OnlineTest.creator),
            selectinload(OnlineTest.class_obj),
            selectinload(OnlineTest.questions),
        )
        .where(OnlineTest.id == test_id)
    )
    res = await db.execute(stmt)
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")

    if not t.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish a test with zero questions.",
        )

    t.status = TestStatus.PUBLISHED.value
    t.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(t)
    return serialize_test(t, include_questions=True, include_correct=True)

# ----------------- Question Management Endpoints -----------------

@router.post("/{test_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
async def add_test_question(
    test_id: int,
    q_in: QuestionCreate,
    current_user: User = Depends(require_permission("tests.create")),
    db: AsyncSession = Depends(get_db),
):
    """
    Adds a new question (MCQ, Short Answer, Long Answer, Programming) to a test.
    """
    test_stmt = select(OnlineTest).options(selectinload(OnlineTest.questions)).where(OnlineTest.id == test_id)
    test_res = await db.execute(test_stmt)
    t = test_res.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found.")

    options_json = json.dumps(q_in.options) if q_in.options else None
    order_idx = q_in.order_index if q_in.order_index > 0 else len(t.questions) + 1

    question = TestQuestion(
        test_id=test_id,
        question_type=q_in.question_type,
        title=q_in.title,
        description=q_in.description,
        marks=q_in.marks,
        order_index=order_idx,
        options=options_json,
        correct_option=q_in.correct_option,
        programming_language=q_in.programming_language or "python",
        starter_code=q_in.starter_code,
        input_example=q_in.input_example,
        output_example=q_in.output_example,
    )
    db.add(question)
    
    # Update test max_marks if appropriate
    t.max_marks = (t.max_marks or 0.0) + q_in.marks
    t.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(question)
    return serialize_question(question, include_correct=True)

@router.put("/{test_id}/questions/{question_id}", response_model=QuestionOut)
async def update_test_question(
    test_id: int,
    question_id: int,
    q_update: QuestionUpdate,
    current_user: User = Depends(require_permission("tests.create")),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates an existing question in an online test.
    """
    q_stmt = select(TestQuestion).where(TestQuestion.id == question_id, TestQuestion.test_id == test_id)
    q_res = await db.execute(q_stmt)
    question = q_res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    if q_update.question_type is not None:
        question.question_type = q_update.question_type
    if q_update.title is not None:
        question.title = q_update.title
    if q_update.description is not None:
        question.description = q_update.description
    if q_update.marks is not None:
        question.marks = q_update.marks
    if q_update.order_index is not None:
        question.order_index = q_update.order_index
    if q_update.options is not None:
        question.options = json.dumps(q_update.options)
    if q_update.correct_option is not None:
        question.correct_option = q_update.correct_option
    if q_update.programming_language is not None:
        question.programming_language = q_update.programming_language
    if q_update.starter_code is not None:
        question.starter_code = q_update.starter_code
    if q_update.input_example is not None:
        question.input_example = q_update.input_example
    if q_update.output_example is not None:
        question.output_example = q_update.output_example

    await db.commit()
    await db.refresh(question)
    return serialize_question(question, include_correct=True)

@router.delete("/{test_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_question(
    test_id: int,
    question_id: int,
    current_user: User = Depends(require_permission("tests.create")),
    db: AsyncSession = Depends(get_db),
):
    """
    Removes a question from a test.
    """
    q_stmt = select(TestQuestion).where(TestQuestion.id == question_id, TestQuestion.test_id == test_id)
    q_res = await db.execute(q_stmt)
    question = q_res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    await db.delete(question)
    await db.commit()

# ----------------- Evaluation & Answer Sheet Endpoints -----------------

@router.get("/{test_id}/attempts", response_model=List[TestAttemptOut])
async def list_test_attempts(
    test_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_permission("tests.evaluate")),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all student attempts for a test with current evaluation status.
    """
    stmt = (
        select(TestAttempt)
        .options(
            selectinload(TestAttempt.student),
            selectinload(TestAttempt.test),
            selectinload(TestAttempt.evaluator),
        )
        .where(TestAttempt.test_id == test_id)
    )
    if status_filter:
        stmt = stmt.where(TestAttempt.status == status_filter)

    stmt = stmt.order_by(TestAttempt.started_at.desc())
    res = await db.execute(stmt)
    attempts = res.scalars().all()

    out = []
    for a in attempts:
        out.append(
            TestAttemptOut(
                id=a.id,
                test_id=a.test_id,
                test_title=a.test.title if a.test else None,
                student_id=a.student_id,
                student_name=a.student.full_name if a.student else "Unknown",
                student_email=a.student.email if a.student else "",
                status=a.status,
                started_at=a.started_at,
                submitted_at=a.submitted_at,
                total_score=a.total_score,
                max_score=a.max_score,
                feedback=a.feedback,
                evaluator_name=a.evaluator.full_name if a.evaluator else None,
                evaluated_at=a.evaluated_at,
                published_at=a.published_at,
                answers=None,
            )
        )
    return out

@router.get("/attempts/{attempt_id}", response_model=TestAttemptOut)
async def get_attempt_answer_sheet(
    attempt_id: int,
    current_user: User = Depends(require_permission("tests.evaluate")),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves a student's complete answer sheet for manual evaluation.
    """
    stmt = (
        select(TestAttempt)
        .options(
            selectinload(TestAttempt.student),
            selectinload(TestAttempt.test).selectinload(OnlineTest.questions),
            selectinload(TestAttempt.evaluator),
            selectinload(TestAttempt.answers).selectinload(TestAnswer.question),
        )
        .where(TestAttempt.id == attempt_id)
    )
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")

    answers_out = []
    for ans in attempt.answers:
        q_out = serialize_question(ans.question, include_correct=True) if ans.question else None
        answers_out.append(
            TestAnswerOut(
                id=ans.id,
                question_id=ans.question_id,
                selected_option=ans.selected_option,
                text_answer=ans.text_answer,
                code_answer=ans.code_answer,
                language=ans.language,
                score=ans.score,
                teacher_feedback=ans.teacher_feedback,
                is_evaluated=ans.is_evaluated,
                question=q_out,
            )
        )

    # Sort answers by question order_index
    answers_out.sort(key=lambda a: a.question.order_index if a.question else 0)

    return TestAttemptOut(
        id=attempt.id,
        test_id=attempt.test_id,
        test_title=attempt.test.title if attempt.test else None,
        student_id=attempt.student_id,
        student_name=attempt.student.full_name if attempt.student else "Unknown",
        student_email=attempt.student.email if attempt.student else "",
        status=attempt.status,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        duration_minutes=attempt.test.duration_minutes if attempt.test else None,
        total_score=attempt.total_score,
        max_score=attempt.max_score,
        feedback=attempt.feedback,
        evaluator_name=attempt.evaluator.full_name if attempt.evaluator else None,
        evaluated_at=attempt.evaluated_at,
        published_at=attempt.published_at,
        answers=answers_out,
    )

@router.put("/attempts/{attempt_id}/evaluate", response_model=TestAttemptOut)
async def evaluate_test_attempt(
    attempt_id: int,
    eval_req: TestAttemptEvaluateRequest,
    current_user: User = Depends(require_permission("tests.evaluate")),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually scores answers question-by-question, leaves feedback, and saves or publishes results.
    """
    stmt = (
        select(TestAttempt)
        .options(
            selectinload(TestAttempt.student),
            selectinload(TestAttempt.test),
            selectinload(TestAttempt.answers).selectinload(TestAnswer.question),
        )
        .where(TestAttempt.id == attempt_id)
    )
    res = await db.execute(stmt)
    attempt = res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found.")

    # Map answers by question_id
    ans_map = {ans.question_id: ans for ans in attempt.answers}

    # Merge answers_evaluation and question_scores if provided
    eval_items = list(eval_req.answers_evaluation)
    if eval_req.question_scores:
        for q_id_str, q_info in eval_req.question_scores.items():
            try:
                qid = int(q_id_str)
            except ValueError:
                continue
            if isinstance(q_info, dict):
                score_val = float(q_info.get("marks", q_info.get("score", 0.0)))
                fb_val = q_info.get("feedback", q_info.get("teacher_feedback"))
            else:
                score_val = float(q_info)
                fb_val = None
            eval_items.append(AnswerEvaluateItem(
                question_id=qid,
                score=score_val,
                teacher_feedback=fb_val
            ))

    computed_score = 0.0
    for item in eval_items:
        if item.question_id in ans_map:
            ans = ans_map[item.question_id]
            max_q_marks = ans.question.marks if ans.question else 10.0
            if item.score > max_q_marks:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Score {item.score} exceeds maximum question marks {max_q_marks} for question {item.question_id}."
                )
            ans.score = item.score
            ans.teacher_feedback = item.teacher_feedback
            ans.is_evaluated = True
            computed_score += item.score

    now_utc = datetime.now(timezone.utc)
    attempt.total_score = eval_req.total_score_override if eval_req.total_score_override is not None else computed_score
    attempt.feedback = eval_req.feedback or eval_req.overall_feedback
    attempt.evaluator_id = current_user.id
    attempt.evaluated_at = now_utc

    if eval_req.publish:
        attempt.status = AttemptStatus.PUBLISHED.value
        attempt.published_at = now_utc

        # Send notification to student
        test_title = attempt.test.title if attempt.test else "Online Test"
        notif = Notification(
            user_id=attempt.student_id,
            title="Test Result Published",
            message=f"Your evaluation results for '{test_title}' have been published. Score: {attempt.total_score}/{attempt.max_score}.",
            type="assignment",
        )
        db.add(notif)
    else:
        attempt.status = AttemptStatus.EVALUATED.value

    await db.commit()
    await db.refresh(attempt)

    return await get_attempt_answer_sheet(attempt_id, current_user, db)
