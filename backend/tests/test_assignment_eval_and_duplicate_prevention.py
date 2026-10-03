import pytest
import pytest_asyncio
import httpx
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models import (
    User, StudentVerification, Permission, Problem, Submission,
    SubmissionStatus, Class, ClassMember, Assignment, AssignmentProblem,
    AssignmentSubmission, ProblemProgress
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

async def create_student(client, username="alice_assign", email="alice_assign@bytevipers.edu"):
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "username": username,
        "full_name": "Alice Assignee",
        "password": "Password123!",
        "gender": "Female",
    })

    async with TestSessionLocal() as session:
        stmt = select(User).where(User.username == username)
        res = await session.execute(stmt)
        user_obj = res.scalar_one_or_none()
        if user_obj:
            v = StudentVerification(
                user_id=user_obj.id,
                full_name=user_obj.full_name,
                institution_name="Test Univ",
                department="CS",
                course="CS",
                semester="1",
                roll_number="ROLL_ASSIGN",
                institutional_email="test_assign@univ.edu",
                verification_method="student_id",
                status="approved",
            )
            session.add(v)
            await session.commit()

    res = await client.post("/api/v1/auth/login", json={
        "username_or_email": username,
        "password": "Password123!",
    })
    return res.json()["access_token"], user_obj.id

async def create_teacher(client, username="prof_assign", email="prof_assign@bytevipers.edu"):
    async with TestSessionLocal() as session:
        perms = (await session.execute(select(Permission))).scalars().all()
        t = User(
            email=email,
            username=username,
            full_name="Prof Assign",
            hashed_password=get_password_hash("Password123!"),
            role="teacher",
            is_active=True,
            is_suspended=False,
            permissions=list(perms),
        )
        session.add(t)
        await session.commit()
        await session.refresh(t)
        teacher_id = t.id

    res = await client.post("/api/v1/auth/login", json={
        "username_or_email": username,
        "password": "Password123!",
    })
    return res.json()["access_token"], teacher_id

async def seed_problem(title="Assignment Problem", slug="assignment-problem", max_marks=100.0):
    async with TestSessionLocal() as session:
        p = Problem(
            title=title,
            slug=slug,
            description="Problem description",
            difficulty="Easy",
            is_published=True,
            max_marks=max_marks,
            starter_code="def solve():\n    pass\n",
        )
        session.add(p)
        await session.commit()
        await session.refresh(p)
        return p.id

@pytest.mark.asyncio
async def test_assignment_submission_and_duplicate_prevention(client):
    student_token, student_id = await create_student(client)
    teacher_token, teacher_id = await create_teacher(client)

    # 1. Create a class and enroll student
    c_res = await client.post(
        "/api/v1/teacher/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"name": "CS101 Python", "description": "Python fundamentals"},
    )
    assert c_res.status_code == 201
    class_id = c_res.json()["id"]
    class_code = c_res.json()["code"]

    enroll_res = await client.post(
        "/api/v1/classes/enroll",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"code": class_code},
    )
    assert enroll_res.status_code == 200

    # 2. Create problem
    prob_id = await seed_problem(
        title="Assignment Problem 1",
        slug="assignment-problem-1",
        max_marks=100.0,
    )

    # 3. Create published assignment
    due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    a_res = await client.post(
        "/api/v1/teacher/assignments",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Week 1 Lab Assignment",
            "class_id": class_id,
            "start_date": datetime.now(timezone.utc).isoformat(),
            "due_date": due,
            "is_published": True,
            "problems": [{"problem_id": prob_id, "points": 100, "order_index": 0}],
        },
    )
    assert a_res.status_code == 201
    assign_id = a_res.json()["id"]

    # 4. Student submits final solution
    sub_res = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "problem_id": prob_id,
            "source_code": "def solve():\n    return 42\n",
            "language": "python",
            "assignment_id": assign_id,
        },
    )
    assert sub_res.status_code == 201
    sub_data = sub_res.json()
    submission_id = sub_data["id"]
    assert sub_data["status"] == "SUBMITTED"

    # Verify AssignmentSubmission record created
    async with TestSessionLocal() as session:
        as_rec = (await session.execute(
            select(AssignmentSubmission).where(
                AssignmentSubmission.assignment_id == assign_id,
                AssignmentSubmission.student_id == student_id,
                AssignmentSubmission.problem_id == prob_id,
            )
        )).scalar_one_or_none()
        assert as_rec is not None
        assert as_rec.score == 0.0
        assert as_rec.submission_id == submission_id

        # Verify ProblemProgress created with ATTEMPTED
        prog = (await session.execute(
            select(ProblemProgress).where(
                ProblemProgress.user_id == student_id,
                ProblemProgress.problem_id == prob_id,
            )
        )).scalar_one_or_none()
        assert prog is not None
        assert prog.status == "ATTEMPTED"

    # 5. Student attempts duplicate submission -> must be rejected with 400
    dup_res = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "problem_id": prob_id,
            "source_code": "def solve():\n    return 999\n",
            "language": "python",
            "assignment_id": assign_id,
        },
    )
    assert dup_res.status_code == 400
    assert "duplicate" in dup_res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_assignment_evaluation_and_points_sync(client):
    student_token, student_id = await create_student(client, username="bob_assign", email="bob@bytevipers.edu")
    teacher_token, teacher_id = await create_teacher(client, username="prof_eval", email="eval@bytevipers.edu")

    # Create class, problem, assignment
    c_res = await client.post(
        "/api/v1/teacher/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"name": "CS102", "description": "Data Structures"},
    )
    class_id = c_res.json()["id"]
    await client.post(
        "/api/v1/classes/enroll",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"code": c_res.json()["code"]},
    )

    prob_id = await seed_problem(
        title="Reverse Linked List",
        slug="reverse-linked-list",
        max_marks=100.0,
    )

    due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    a_res = await client.post(
        "/api/v1/teacher/assignments",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "DS Assignment 1",
            "class_id": class_id,
            "start_date": datetime.now(timezone.utc).isoformat(),
            "due_date": due,
            "is_published": True,
            "problems": [{"problem_id": prob_id, "points": 80, "order_index": 0}],
        },
    )
    assign_id = a_res.json()["id"]

    # Student submits
    sub_res = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "problem_id": prob_id,
            "source_code": "def reverse(): pass",
            "language": "python",
            "assignment_id": assign_id,
        },
    )
    submission_id = sub_res.json()["id"]

    # Check assignment detail BEFORE evaluation: shows status "Submitted"
    detail_res1 = await client.get(
        f"/api/v1/assignments/{assign_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert detail_res1.status_code == 200
    prob_info1 = detail_res1.json()["problems"][0]
    assert prob_info1["status"] == "Submitted"
    assert prob_info1["best_score"] == 0.0

    # Teacher evaluates: 75 marks out of 100 max_marks
    eval_res = await client.put(
        f"/api/v1/teacher/submissions/{submission_id}/evaluate",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "marks": 75.0,
            "teacher_feedback": "Well structured solution, slight optimization possible.",
            "publish": True,
        },
    )
    assert eval_res.status_code == 200
    assert eval_res.json()["marks"] == 75.0
    assert eval_res.json()["status"] == "PUBLISHED"

    # Check assignment detail AFTER evaluation:
    # Problem points was 80, marks 75/100 -> earned points = 75/100 * 80 = 60.0 pts!
    detail_res2 = await client.get(
        f"/api/v1/assignments/{assign_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert detail_res2.status_code == 200
    prob_info2 = detail_res2.json()["problems"][0]
    assert prob_info2["status"] == "Evaluated"
    assert prob_info2["marks"] == 75.0
    assert prob_info2["best_score"] == 60.0
    assert prob_info2["teacher_feedback"] == "Well structured solution, slight optimization possible."
    assert detail_res2.json()["user_total_score"] == 60.0

    # Student dashboard reflects solved problem and score
    dash_res = await client.get(
        "/api/v1/student/dashboard",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["problems_solved"] == 1
    assert len(dash_data["recent_submissions"]) >= 1
    assert dash_data["recent_submissions"][0]["marks"] == 75.0
    assert dash_data["active_assignments"][0]["user_total_score"] == 60.0

@pytest.mark.asyncio
async def test_reevaluation_idempotency_and_zero_marks(client):
    student_token, student_id = await create_student(client, username="charlie_eval", email="charlie@bytevipers.edu")
    teacher_token, teacher_id = await create_teacher(client, username="prof_zero", email="zero@bytevipers.edu")

    # Setup
    c_res = await client.post(
        "/api/v1/teacher/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"name": "CS103", "description": "Algorithms"},
    )
    class_id = c_res.json()["id"]
    await client.post(
        "/api/v1/classes/enroll",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"code": c_res.json()["code"]},
    )

    prob_id = await seed_problem(
        title="Two Sum Problem Zero",
        slug="two-sum-problem-zero",
        max_marks=100.0,
    )

    due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    a_res = await client.post(
        "/api/v1/teacher/assignments",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Algo Lab 1",
            "class_id": class_id,
            "start_date": datetime.now(timezone.utc).isoformat(),
            "due_date": due,
            "is_published": True,
            "problems": [{"problem_id": prob_id, "points": 100, "order_index": 0}],
        },
    )
    assign_id = a_res.json()["id"]

    # Student submits
    sub_res = await client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "problem_id": prob_id,
            "source_code": "def two_sum(): pass",
            "language": "python",
            "assignment_id": assign_id,
        },
    )
    submission_id = sub_res.json()["id"]

    # Teacher grades with ZERO marks (0.0)
    eval_zero = await client.put(
        f"/api/v1/teacher/submissions/{submission_id}/evaluate",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "marks": 0.0,
            "teacher_feedback": "Code is incomplete and does not run.",
            "publish": True,
        },
    )
    assert eval_zero.status_code == 200
    assert eval_zero.json()["marks"] == 0.0

    # Verify zero marks handling in assignment detail: must NOT be "Unsolved"
    detail_res = await client.get(
        f"/api/v1/assignments/{assign_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert detail_res.status_code == 200
    p_info = detail_res.json()["problems"][0]
    assert p_info["status"] == "Evaluated"
    assert p_info["marks"] == 0.0
    assert p_info["best_score"] == 0.0
    assert p_info["teacher_feedback"] == "Code is incomplete and does not run."

    # Teacher RE-EVALUATES and awards full marks (100.0)
    eval_full = await client.put(
        f"/api/v1/teacher/submissions/{submission_id}/evaluate",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "marks": 100.0,
            "teacher_feedback": "Regraded after viva: full solution verified.",
            "publish": True,
        },
    )
    assert eval_full.status_code == 200
    assert eval_full.json()["marks"] == 100.0

    # Verify only ONE AssignmentSubmission row exists in database
    async with TestSessionLocal() as session:
        cnt_res = await session.execute(
            select(func.count(AssignmentSubmission.id)).where(
                AssignmentSubmission.assignment_id == assign_id,
                AssignmentSubmission.student_id == student_id,
                AssignmentSubmission.problem_id == prob_id,
            )
        )
        assert cnt_res.scalar_one() == 1

    # Assignment detail shows Solved and exactly 100 pts (not duplicated)
    detail_res_full = await client.get(
        f"/api/v1/assignments/{assign_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    p_info_full = detail_res_full.json()["problems"][0]
    assert p_info_full["status"] == "Solved"
    assert p_info_full["best_score"] == 100.0
    assert detail_res_full.json()["user_total_score"] == 100.0
