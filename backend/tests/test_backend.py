import pytest
import pytest_asyncio
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models import (
    User, StudentVerification, VerificationStatus, Permission, Problem, TestCase
)
from app.services.bootstrap import SYSTEM_PERMISSIONS
from app.services.judge0 import judge0_service
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

async def create_test_user(client, username="alice_coder", email="alice@student.edu", role="student", verified=False, gender="Female"):
    # Register via API
    reg_data = {
        "email": email,
        "username": username,
        "full_name": "Alice Coder",
        "password": "Password123!",
        "gender": gender,
    }
    await client.post("/api/v1/auth/register", json=reg_data)

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

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": "Password123!"},
    )
    return login_res.json()["access_token"]

async def create_test_teacher(client, username="prof_alan", email="alan@bytevipers.edu"):
    async with TestSessionLocal() as session:
        perm_res = await session.execute(select(Permission))
        all_perms = perm_res.scalars().all()
        teacher = User(
            email=email,
            username=username,
            full_name="Prof. Alan Turing",
            hashed_password=get_password_hash("Turing123!"),
            role="teacher",
            is_active=True,
            is_suspended=False,
            permissions=list(all_perms),
        )
        session.add(teacher)
        await session.commit()

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": "Turing123!"},
    )
    return login_res.json()["access_token"]

@pytest.mark.asyncio
async def test_health_check(client):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_student_registration_starts_not_submitted(client):
    reg_data = {
        "email": "newbie@student.edu",
        "username": "newbie_coder",
        "full_name": "Newbie Coder",
        "password": "Password123!",
        "gender": "Male",
    }
    res = await client.post("/api/v1/auth/register", json=reg_data)
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "student"
    assert data["verification_status"] == "not_submitted"

    # GET /verification/me returns not_submitted without creating dummy DB record
    token_res = await client.post("/api/v1/auth/login", json={"username_or_email": "newbie_coder", "password": "Password123!"})
    token = token_res.json()["access_token"]
    me_res = await client.get("/api/v1/verification/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["status"] == "not_submitted"

@pytest.mark.asyncio
async def test_unverified_student_cannot_access_protected_dashboard(client):
    token = await create_test_user(client, username="unverified_stu", email="unv@student.edu", verified=False)
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access student dashboard
    dash_res = await client.get("/api/v1/student/dashboard", headers=headers)
    assert dash_res.status_code == 403
    assert "Student verification required" in dash_res.json()["detail"]

@pytest.mark.asyncio
async def test_verification_workflow_and_approval(client):
    # 1. Register student
    alice_token = await create_test_user(client, username="alice_v", email="alice_v@student.edu", verified=False)
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # 2. Alice submits verification application
    app_data = {
        "full_name": "Alice V",
        "institution_name": "ByteVipers Institute of Tech",
        "department": "Computer Science",
        "course": "B.Tech CSE",
        "semester": "5th Semester",
        "roll_number": "CS2026-0042",
        "institutional_email": "alice_v@student.bytevipers.edu",
        "verification_method": "student_id",
    }
    v_res = await client.post("/api/v1/verification/applications", json=app_data, headers=alice_headers)
    assert v_res.status_code == 200
    assert v_res.json()["status"].lower() == "pending"
    verification_id = v_res.json()["id"]

    # 2b. Attempting duplicate submission while pending returns HTTP 400
    dup_res = await client.post("/api/v1/verification/applications", json=app_data, headers=alice_headers)
    assert dup_res.status_code == 400
    assert "already pending" in dup_res.json()["detail"].lower()

    # 3. Alice tries to approve her own verification -> Must be forbidden (403)
    self_approve = await client.post(
        f"/api/v1/teacher/verifications/{verification_id}/approve",
        json={"reviewer_notes": "Self approval attempt"},
        headers=alice_headers,
    )
    assert self_approve.status_code == 403

    # 4. Teacher logs in
    teacher_token = await create_test_teacher(client, username="teacher_eval", email="eval@bytevipers.edu")
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # 5. Teacher approves Alice's verification
    approve_res = await client.post(
        f"/api/v1/teacher/verifications/{verification_id}/approve",
        json={"reviewer_notes": "All institutional credentials verified."},
        headers=teacher_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"].lower() == "approved"

    # 5b. Attempting duplicate submission after approval returns HTTP 400
    dup_after_approved = await client.post("/api/v1/verification/applications", json=app_data, headers=alice_headers)
    assert dup_after_approved.status_code == 400
    assert "already been approved" in dup_after_approved.json()["detail"].lower()

    # 6. Alice now has verified access to student dashboard
    dash_res = await client.get("/api/v1/student/dashboard", headers=alice_headers)
    assert dash_res.status_code == 200
    assert dash_res.json()["verified"] is True

@pytest.mark.asyncio
async def test_verification_rejection_and_resubmission(client):
    # 1. Register student Bob
    bob_token = await create_test_user(client, username="bob_v", email="bob_v@student.edu", verified=False)
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # 2. Bob submits verification application
    app_data = {
        "full_name": "Bob V",
        "institution_name": "Tech Academy",
        "department": "IT",
        "course": "BCA",
        "semester": "3rd",
        "roll_number": "BCA-101",
        "institutional_email": "bob@tech.edu",
        "verification_method": "student_id",
    }
    v_res = await client.post("/api/v1/verification/applications", json=app_data, headers=bob_headers)
    assert v_res.status_code == 200
    verification_id = v_res.json()["id"]

    # 3. Teacher rejects with note
    teacher_token = await create_test_teacher(client, username="prof_strict", email="strict@bytevipers.edu")
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    rej_res = await client.post(
        f"/api/v1/teacher/verifications/{verification_id}/reject",
        json={"reviewer_notes": "ID card image is blurry. Please resubmit clear copy."},
        headers=teacher_headers,
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"].lower() == "rejected"

    # 4. Bob checks status
    me_res = await client.get("/api/v1/verification/me", headers=bob_headers)
    assert me_res.status_code == 200
    assert me_res.json()["status"].lower() == "rejected"
    assert "blurry" in me_res.json()["reviewer_notes"]

    # 5. Bob can resubmit corrected application
    corrected_data = dict(app_data, id_document_url="https://valid-url.com/id.pdf")
    resubmit_res = await client.post("/api/v1/verification/applications", json=corrected_data, headers=bob_headers)
    assert resubmit_res.status_code == 200
    assert resubmit_res.json()["status"].lower() == "pending"

@pytest.mark.asyncio
async def test_python_code_execution_verdicts():
    # Test valid python code
    code_ac = "import sys\nprint('hello ' + sys.stdin.read().strip())"
    res_ac = await judge0_service.execute_python(code_ac, stdin_data="world")
    assert res_ac["verdict"] == "Accepted"
    assert res_ac["stdout"].strip() == "hello world"

    # Test runtime error
    code_re = "print(1 / 0)"
    res_re = await judge0_service.execute_python(code_re)
    assert res_re["verdict"] == "Runtime Error"
    assert "ZeroDivisionError" in (res_re["error_message"] or "")

    # Test time limit exceeded
    code_tle = "while True:\n    pass"
    res_tle = await judge0_service.execute_python(code_tle, cpu_time_limit=0.8)
    assert res_tle["verdict"] == "Time Limit Exceeded"

@pytest.mark.asyncio
async def test_problem_hidden_cases_security(client):
    # Log in as teacher
    teacher_token = await create_test_teacher(client, username="prof_case", email="case@bytevipers.edu")
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Teacher creates a problem with public sample and secret hidden case
    prob_payload = {
        "title": "Secret Python Test",
        "description": "Double the number",
        "difficulty": "Easy",
        "starter_code": "import sys\nprint(int(sys.stdin.read()) * 2)",
        "is_published": True,
        "test_cases": [
            {
                "input_data": "5",
                "expected_output": "10",
                "is_sample": True,
                "sample_explanation": "5 * 2 = 10",
                "order_index": 1,
            },
            {
                "input_data": "99999",
                "expected_output": "199998",
                "is_sample": False,
                "order_index": 2,
            },
        ],
    }
    p_res = await client.post("/api/v1/teacher/problems", json=prob_payload, headers=teacher_headers)
    assert p_res.status_code == 201
    prob_slug = p_res.json()["slug"]

    # Public/student endpoint check: Hidden test case must NOT be exposed!
    public_res = await client.get(f"/api/v1/problems/{prob_slug}")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert len(pub_data["sample_cases"]) == 1
    assert pub_data["sample_cases"][0]["input_data"] == "5"
    assert "99999" not in str(pub_data)

@pytest.mark.asyncio
async def test_database_connectivity_and_dialect_check():
    """Verify safe database connectivity check and dialect detection without credential leakage."""
    from app.core.database import verify_database_connectivity
    conn_info = await verify_database_connectivity()
    assert conn_info["status"] == "connected"
    assert "dialect" in conn_info
    assert conn_info["dialect"] in ("postgresql", "sqlite")
    # Verify no credential leaks in metadata
    text_repr = str(conn_info).lower()
    assert "password" not in text_repr
    assert "secret" not in text_repr
    assert "postgres://" not in text_repr
    assert "postgresql://" not in text_repr

@pytest.mark.asyncio
async def test_failed_postgres_connection_never_falls_back_to_sqlite(monkeypatch):
    """Verify that a failing database connection raises ConnectionError and never silently falls back to SQLite."""
    from app.core.database import verify_database_connectivity
    from unittest.mock import AsyncMock

    mock_session = AsyncMock()
    mock_session.__aenter__.side_effect = Exception("SSL connection lost: connection refused")
    
    with monkeypatch.context() as m:
        m.setattr("app.core.database.AsyncSessionLocal", lambda: mock_session)
        with pytest.raises(ConnectionError) as exc_info:
            await verify_database_connectivity()
        
        assert "Database connectivity check failed" in str(exc_info.value)
        assert isinstance(exc_info.value, ConnectionError)

@pytest.mark.asyncio
async def test_authorization_permission_enforcement(client):
    """Verify granular permissions: teacher without specific permission is rejected with 403."""
    # Create teacher with ONLY 'problems.create' permission (no 'users.manage')
    async with TestSessionLocal() as session:
        perm_res = await session.execute(select(Permission).where(Permission.name == "problems.create"))
        prob_perm = perm_res.scalar_one()
        restricted_teacher = User(
            email="author@bytevipers.edu",
            username="prof_author",
            full_name="Prof. Author Only",
            hashed_password=get_password_hash("AuthorPass123!"),
            role="teacher",
            is_active=True,
            is_suspended=False,
            permissions=[prob_perm],
        )
        session.add(restricted_teacher)
        await session.commit()

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "prof_author", "password": "AuthorPass123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access user management endpoint which requires 'users.manage' permission
    res = await client.get(
        "/api/v1/teacher/platform/users",
        headers=headers,
    )
    assert res.status_code == 403
    assert "Missing required permission: users.manage" in res.json()["detail"]

@pytest.mark.asyncio
async def test_execution_failure_safeguards_in_production(monkeypatch):
    """Verify that when fallback is disabled, Judge0 outage produces an internal error rather than running local code."""
    from app.services.judge0 import CodeExecutionService
    from app.models import Verdict
    import httpx

    svc = CodeExecutionService()
    # Force fallback permitted to False
    monkeypatch.setattr(svc, "_is_fallback_permitted", lambda: False)

    # Mock httpx failure
    async def mock_post(*args, **kwargs):
        raise httpx.ConnectError("Judge0 connection refused")

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    result = await svc.execute_python("import os; os.system('echo compromised')")
    assert result["verdict"] == Verdict.InternalError.value
    assert "unavailable" in result["error_message"].lower() or "disabled" in result["error_message"].lower()
    assert result["stdout"] is None

