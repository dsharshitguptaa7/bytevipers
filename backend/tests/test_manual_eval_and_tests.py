import pytest
import pytest_asyncio
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models import (
    User, StudentVerification, VerificationStatus, Permission, Problem, TestCase,
    OnlineTest, TestQuestion, TestAttempt, TestAnswer, Submission,
    SubmissionStatus, TestStatus, QuestionType, AttemptStatus
)
from app.services.bootstrap import SYSTEM_PERMISSIONS
from app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///./test_bytevipers.db"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)

async def override_get_db():
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    # Seed permissions
    async with TestSessionLocal() as session:
        for p_name, p_desc in SYSTEM_PERMISSIONS:
            session.add(Permission(name=p_name, description=p_desc))
        await session.commit()

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c

TestCase.__test__ = False
TestQuestion.__test__ = False
TestAttempt.__test__ = False
TestAnswer.__test__ = False
TestStatus.__test__ = False

async def create_student(client, username="alice_student", email="alice@bytevipers.edu", verified=True, gender="Female"):
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "username": username,
        "full_name": "Alice Student",
        "password": "Password123!",
        "gender": gender,
    })

    if verified:
        async with TestSessionLocal() as session:
            stmt = select(User).where(User.username == username)
            res = await session.execute(stmt)
            user_obj = res.scalar_one_or_none()
            if user_obj:
                stmt_v = select(StudentVerification).where(StudentVerification.user_id == user_obj.id)
                res_v = await session.execute(stmt_v)
                v = res_v.scalar_one_or_none()
                if not v:
                    v = StudentVerification(
                        user_id=user_obj.id,
                        full_name=user_obj.full_name,
                        institution_name="Test Univ",
                        department="CS",
                        course="CS",
                        semester="1",
                        roll_number="ROLL1",
                        institutional_email="test@univ.edu",
                        verification_method="student_id",
                        status="approved",
                    )
                    session.add(v)
                else:
                    v.status = "approved"
                await session.commit()

    res = await client.post("/api/v1/auth/login", json={
        "username_or_email": username,
        "password": "Password123!",
    })
    return res.json()["access_token"]

async def create_teacher(client, username="prof_oak", email="oak@bytevipers.edu"):
    async with TestSessionLocal() as session:
        perm_res = await session.execute(select(Permission))
        all_perms = perm_res.scalars().all()
        teacher = User(
            email=email,
            username=username,
            full_name="Prof. Oak",
            hashed_password=get_password_hash("Password123!"),
            role="teacher",
            is_active=True,
            is_suspended=False,
            permissions=list(all_perms),
        )
        session.add(teacher)
        await session.commit()

    res = await client.post("/api/v1/auth/login", json={
        "username_or_email": username,
        "password": "Password123!",
    })
    return res.json()["access_token"]

async def seed_problem():
    async with TestSessionLocal() as session:
        p = Problem(
            title="Two Sum Problem",
            slug="two-sum-problem",
            description="Find indices of two numbers that add up to target.",
            difficulty="Easy",
            is_published=True,
            max_marks=100.0,
            starter_code="def two_sum(nums, target):\n    pass\n",
        )
        session.add(p)
        await session.commit()
        await session.refresh(p)
        return p.id


# ========================================================
# 1. Judge0 Sidelining & Code Submissions
# ========================================================

@pytest.mark.asyncio
async def test_run_code_returns_503_when_judge0_sidelined(client):
    prob_id = await seed_problem()
    token = await create_student(client)

    res = await client.post(
        "/api/v1/submissions/run",
        json={"problem_id": prob_id, "source_code": "print('hello')"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 503
    assert "Automatic code execution (Judge0) is temporarily sidelined" in res.json()["detail"]


@pytest.mark.asyncio
async def test_student_draft_saving_and_retrieval(client):
    prob_id = await seed_problem()
    token = await create_student(client)

    # 1. Save draft
    res1 = await client.post(
        "/api/v1/submissions/draft",
        json={"problem_id": prob_id, "language": "python", "source_code": "def two_sum():\n    return [0, 1]"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 200
    draft_data = res1.json()
    assert draft_data["status"] == "DRAFT"
    assert "def two_sum" in draft_data["source_code"]
    draft_id = draft_data["id"]

    # 2. Idempotent update: saving draft again updates same submission row
    res2 = await client.post(
        "/api/v1/submissions/draft",
        json={"problem_id": prob_id, "language": "python", "source_code": "def two_sum():\n    return [1, 2]"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 200
    assert res2.json()["id"] == draft_id
    assert "return [1, 2]" in res2.json()["source_code"]

    # 3. Retrieve draft
    res3 = await client.get(
        f"/api/v1/submissions/draft?problem_id={prob_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res3.status_code == 200
    assert res3.json()["id"] == draft_id
    assert res3.json()["source_code"] == "def two_sum():\n    return [1, 2]"


@pytest.mark.asyncio
async def test_manual_submission_and_teacher_evaluation(client):
    prob_id = await seed_problem()
    student_token = await create_student(client, username="bob_coder", email="bob@bytevipers.edu")
    teacher_token = await create_teacher(client)

    # 1. Student submits code
    sub_res = await client.post(
        "/api/v1/submissions",
        json={"problem_id": prob_id, "language": "python", "source_code": "def two_sum():\n    return [0, 1]"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert sub_res.status_code == 201
    sub_id = sub_res.json()["id"]
    assert sub_res.json()["status"] == "SUBMITTED"

    # 2. Teacher lists submissions
    list_res = await client.get(
        "/api/v1/teacher/submissions",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert list_res.status_code == 200
    assert any(s["id"] == sub_id for s in list_res.json())

    # 3. Teacher inspects code
    inspect_res = await client.get(
        f"/api/v1/teacher/submissions/{sub_id}",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert inspect_res.status_code == 200
    assert inspect_res.json()["source_code"] == "def two_sum():\n    return [0, 1]"

    # 4. Teacher saves draft evaluation (publish: False)
    eval_draft = await client.put(
        f"/api/v1/teacher/submissions/{sub_id}/evaluate",
        json={"marks": 85.5, "teacher_feedback": "Great logic, minor formatting issues.", "publish": False},
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert eval_draft.status_code == 200
    assert eval_draft.json()["status"] == "EVALUATED"

    # 5. Student checks submission while unpublished: marks and feedback MUST BE CONCEALED
    student_check = await client.get(
        f"/api/v1/submissions/{sub_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert student_check.status_code == 200
    assert student_check.json()["marks"] is None
    assert student_check.json()["teacher_feedback"] is None

    # 6. Teacher cannot award marks higher than max_marks (100)
    invalid_eval = await client.put(
        f"/api/v1/teacher/submissions/{sub_id}/evaluate",
        json={"marks": 150.0, "teacher_feedback": "Too generous", "publish": True},
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert invalid_eval.status_code == 400
    assert "cannot exceed maximum marks" in invalid_eval.json()["detail"]

    # 7. Teacher publishes evaluation
    pub_res = await client.put(
        f"/api/v1/teacher/submissions/{sub_id}/publish",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "PUBLISHED"

    # 8. Student checks submission now: marks and feedback ARE VISIBLE
    student_pub_check = await client.get(
        f"/api/v1/submissions/{sub_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert student_pub_check.status_code == 200
    assert student_pub_check.json()["marks"] == 85.5
    assert student_pub_check.json()["teacher_feedback"] == "Great logic, minor formatting issues."


# ========================================================
# 2. Online Test Management & Candidate Evaluation
# ========================================================

@pytest.mark.asyncio
async def test_online_test_full_workflow(client):
    teacher_token = await create_teacher(client, username="dr_smith", email="smith@bytevipers.edu")
    student_token = await create_student(client, username="carol_student", email="carol@bytevipers.edu")

    # 1. Teacher creates online test
    create_test_res = await client.post(
        "/api/v1/teacher/tests",
        json={
            "title": "Python Midterm Test",
            "description": "Assessment on core Python, data structures, and algorithms",
            "instructions": "No external assistance allowed. Auto-saved as draft.",
            "duration_minutes": 60,
            "total_marks": 50,
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert create_test_res.status_code == 201
    test_id = create_test_res.json()["id"]

    # 2. Teacher adds questions:
    # 2a. MCQ Question
    mcq_res = await client.post(
        f"/api/v1/teacher/tests/{test_id}/questions",
        json={
            "title": "Binary Search Complexity",
            "description": "What is the worst-case time complexity of binary search?",
            "question_type": "MCQ",
            "marks": 10.0,
            "order_index": 1,
            "options": {"a": "O(1)", "b": "O(log n)", "c": "O(n)", "d": "O(n log n)"},
            "correct_option": "b",
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert mcq_res.status_code == 201
    q1_id = mcq_res.json()["id"]

    # 2b. Short Answer Question
    sa_res = await client.post(
        f"/api/v1/teacher/tests/{test_id}/questions",
        json={
            "title": "Python Generators",
            "description": "Explain the difference between yield and return in Python.",
            "question_type": "SHORT_ANSWER",
            "marks": 15.0,
            "order_index": 2,
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert sa_res.status_code == 201
    q2_id = sa_res.json()["id"]

    # 2c. Programming Question
    prog_res = await client.post(
        f"/api/v1/teacher/tests/{test_id}/questions",
        json={
            "title": "Palindrome String Function",
            "description": "Write a function is_palindrome(s: str) -> bool that checks if s is palindrome.",
            "question_type": "PROGRAMMING",
            "marks": 25.0,
            "order_index": 3,
            "programming_language": "python",
            "starter_code": "def is_palindrome(s: str) -> bool:\n    pass\n",
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert prog_res.status_code == 201
    q3_id = prog_res.json()["id"]

    # 3. Publish test
    pub_res = await client.post(
        f"/api/v1/teacher/tests/{test_id}/publish",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "PUBLISHED"

    # 4. Student views test overview - Questions are concealed before start, question count is visible
    student_view_test = await client.get(
        f"/api/v1/tests/{test_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert student_view_test.status_code == 200
    assert student_view_test.json()["question_count"] == 3
    assert student_view_test.json()["questions"] is None

    # 5. Student starts test attempt - questions are loaded and correct_option is strictly concealed!
    start_res = await client.post(
        f"/api/v1/tests/{test_id}/start",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert start_res.status_code in (200, 201)
    attempt_data = start_res.json()
    attempt_id = attempt_data["id"]
    assert attempt_data["status"] == "IN_PROGRESS"
    assert len(attempt_data["answers"]) == 3
    for ans in attempt_data["answers"]:
        assert ans["question"]["correct_option"] is None

    # 6. Student saves answers (draft auto-save)
    save_ans1 = await client.put(
        f"/api/v1/tests/attempts/{attempt_id}/answers",
        json={"question_id": q1_id, "selected_option": "b"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert save_ans1.status_code == 200
    assert save_ans1.json()["selected_option"] == "b"

    save_ans2 = await client.put(
        f"/api/v1/tests/attempts/{attempt_id}/answers",
        json={"question_id": q2_id, "text_answer": "Yield produces a generator item lazily, while return exits."},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert save_ans2.status_code == 200
    assert "Yield produces" in save_ans2.json()["text_answer"]

    save_ans3 = await client.put(
        f"/api/v1/tests/attempts/{attempt_id}/answers",
        json={"question_id": q3_id, "code_answer": "def is_palindrome(s):\n    return s == s[::-1]"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert save_ans3.status_code == 200

    # 7. Student submits final test attempt
    submit_res = await client.post(
        f"/api/v1/tests/attempts/{attempt_id}/submit",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert submit_res.status_code == 200

    # 8. Student checks result before publishing: scores must be concealed
    unpub_result = await client.get(
        f"/api/v1/tests/{test_id}/my-result",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert unpub_result.status_code == 200
    assert unpub_result.json()["total_score"] is None
    assert unpub_result.json()["feedback"] is None
    for a in unpub_result.json()["answers"]:
        assert a["score"] is None
        assert a["teacher_feedback"] is None

    # 9. Teacher reviews attempt answer sheet
    teacher_sheet = await client.get(
        f"/api/v1/teacher/tests/attempts/{attempt_id}",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert teacher_sheet.status_code == 200
    assert len(teacher_sheet.json()["answers"]) == 3

    # 10. Teacher evaluates answer sheet and publishes
    eval_res = await client.put(
        f"/api/v1/teacher/tests/attempts/{attempt_id}/evaluate",
        json={
            "question_scores": {
                str(q1_id): {"marks": 10.0, "feedback": "Correct option selected."},
                str(q2_id): {"marks": 14.0, "feedback": "Good explanation of lazy evaluation."},
                str(q3_id): {"marks": 25.0, "feedback": "Clean Pythonic slice reversal."},
            },
            "overall_feedback": "Outstanding performance on the midterm!",
            "publish": True,
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert eval_res.status_code == 200
    assert eval_res.json()["status"] == "PUBLISHED"
    assert eval_res.json()["total_score"] == 49.0

    # 11. Student checks published result: all scores and feedback visible!
    pub_result = await client.get(
        f"/api/v1/tests/{test_id}/my-result",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert pub_result.status_code == 200
    assert pub_result.json()["total_score"] == 49.0
    assert pub_result.json()["feedback"] == "Outstanding performance on the midterm!"
    assert len(pub_result.json()["answers"]) == 3
    assert pub_result.json()["answers"][0]["score"] == 10.0
    assert pub_result.json()["answers"][1]["score"] == 14.0
    assert pub_result.json()["answers"][2]["score"] == 25.0
