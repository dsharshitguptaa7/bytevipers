import pytest
import pytest_asyncio
import httpx
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models import User, Permission, AuditLog
from app.services.bootstrap import SYSTEM_PERMISSIONS
from app.api.v1.teacher.platform import clear_recovery_rate_limits
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
    clear_recovery_rate_limits()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        for p_name, p_desc in SYSTEM_PERMISSIONS:
            session.add(Permission(name=p_name, description=p_desc))
        await session.commit()

    yield
    clear_recovery_rate_limits()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c

async def create_user(
    session: AsyncSession,
    email: str,
    username: str,
    role: str = "student",
    password: str = "Secret123!",
    permissions: list = None,
) -> User:
    perm_objs = []
    if permissions:
        res = await session.execute(select(Permission).where(Permission.name.in_(permissions)))
        perm_objs = list(res.scalars().all())

    user = User(
        email=email,
        username=username,
        full_name=username.capitalize(),
        hashed_password=get_password_hash(password),
        role=role,
        gender="Male",
        is_active=True,
        is_suspended=False,
        permissions=perm_objs,
        token_version=1,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@pytest.mark.asyncio
async def test_authorized_staff_can_assist_student_password_recovery(client):
    async with TestSessionLocal() as session:
        admin = await create_user(
            session,
            "superadmin@bytevipers.com",
            "superadmin",
            role="teacher",
            permissions=["platform.superadmin", "users.manage"],
        )
        student = await create_user(
            session,
            "student1@bytevipers.com",
            "student1",
            role="student",
        )

    # Login as admin
    login_res = await client.post("/api/v1/auth/login", json={
        "username_or_email": "superadmin",
        "password": "Secret123!",
    })
    assert login_res.status_code == 200
    admin_token = login_res.json()["access_token"]

    # Trigger password assistance for student
    res = await client.post(
        f"/api/v1/teacher/platform/users/{student.id}/password-assistance",
        headers={"Authorization": f"Bearer Admin_token"}
    )
    # With valid token:
    res = await client.post(
        f"/api/v1/teacher/platform/users/{student.id}/password-assistance",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "temporary_password" in data
    assert data["must_change_password"] is True
    assert data["user_id"] == student.id
    temp_pw = data["temporary_password"]
    assert len(temp_pw) >= 14

    # Verify audit log exists and does NOT contain plaintext password
    async with TestSessionLocal() as session:
        log_res = await session.execute(
            select(AuditLog).where(
                AuditLog.action == "ADMIN_PASSWORD_ASSISTANCE",
                AuditLog.entity_id == str(student.id),
            )
        )
        audit_log = log_res.scalar_one_or_none()
        assert audit_log is not None
        assert temp_pw not in audit_log.details
        assert audit_log.user_id == admin.id

@pytest.mark.asyncio
async def test_unauthorized_roles_cannot_trigger_password_assistance(client):
    async with TestSessionLocal() as session:
        student = await create_user(session, "student@bytevipers.com", "student", role="student")
        coordinator = await create_user(session, "coord@bytevipers.com", "coord", role="coordinator")
        target = await create_user(session, "target@bytevipers.com", "target", role="student")

    # Anonymous user -> 401
    anon_res = await client.post(f"/api/v1/teacher/platform/users/{target.id}/password-assistance")
    assert anon_res.status_code == 401

    # Student user -> 403
    s_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "student", "password": "Secret123!"
    })
    s_token = s_login.json()["access_token"]
    s_res = await client.post(
        f"/api/v1/teacher/platform/users/{target.id}/password-assistance",
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert s_res.status_code == 403

    # Coordinator user -> 403
    c_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "coord", "password": "Secret123!"
    })
    c_token = c_login.json()["access_token"]
    c_res = await client.post(
        f"/api/v1/teacher/platform/users/{target.id}/password-assistance",
        headers={"Authorization": f"Bearer {c_token}"}
    )
    assert c_res.status_code == 403

@pytest.mark.asyncio
async def test_privilege_escalation_and_self_recovery_prevention(client):
    async with TestSessionLocal() as session:
        # Standard teacher with users.manage but NO superadmin
        standard_teacher = await create_user(
            session,
            "teacher@bytevipers.com",
            "standard_teacher",
            role="teacher",
            permissions=["users.manage"],
        )
        # Super admin
        super_admin = await create_user(
            session,
            "superadmin@bytevipers.com",
            "super_admin",
            role="teacher",
            permissions=["platform.superadmin", "users.manage"],
        )
        # Another teacher
        other_teacher = await create_user(
            session,
            "otherteacher@bytevipers.com",
            "other_teacher",
            role="teacher",
            permissions=["problems.create"],
        )

    # Login as standard teacher
    t_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "standard_teacher", "password": "Secret123!"
    })
    t_token = t_login.json()["access_token"]

    # 1. Standard teacher cannot reset themselves
    self_res = await client.post(
        f"/api/v1/teacher/platform/users/{standard_teacher.id}/password-assistance",
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert self_res.status_code == 400
    assert "own account" in self_res.json()["detail"].lower()

    # 2. Standard teacher cannot reset Super Admin (403)
    admin_res = await client.post(
        f"/api/v1/teacher/platform/users/{super_admin.id}/password-assistance",
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert admin_res.status_code == 403

    # 3. Standard teacher cannot reset another Teacher (403)
    other_t_res = await client.post(
        f"/api/v1/teacher/platform/users/{other_teacher.id}/password-assistance",
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert other_t_res.status_code == 403

@pytest.mark.asyncio
async def test_temporary_credentials_login_and_mandatory_rotation(client):
    async with TestSessionLocal() as session:
        admin = await create_user(
            session, "admin@bytevipers.com", "admin", role="teacher",
            permissions=["platform.superadmin", "users.manage"]
        )
        student = await create_user(
            session, "targetstudent@bytevipers.com", "targetstudent", role="student"
        )

    # Admin issues temporary credential
    a_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "admin", "password": "Secret123!"
    })
    a_token = a_login.json()["access_token"]

    assist_res = await client.post(
        f"/api/v1/teacher/platform/users/{student.id}/password-assistance",
        headers={"Authorization": f"Bearer {a_token}"}
    )
    assert assist_res.status_code == 200
    temp_pw = assist_res.json()["temporary_password"]

    # Old password no longer works
    old_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "targetstudent", "password": "Secret123!"
    })
    assert old_login.status_code == 401

    # Temporary password succeeds login and indicates must_change_password
    temp_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "targetstudent", "password": temp_pw
    })
    assert temp_login.status_code == 200
    login_data = temp_login.json()
    assert login_data["user"]["must_change_password"] is True
    temp_session_token = login_data["access_token"]

    # User rotates password using /api/v1/auth/change-password
    change_res = await client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {temp_session_token}"},
        json={
            "current_password": temp_pw,
            "new_password": "NewPermanentPassword456!",
        }
    )
    assert change_res.status_code == 200
    change_data = change_res.json()
    assert change_data["user"]["must_change_password"] is False
    new_token = change_data["access_token"]

    # Check user in DB
    async with TestSessionLocal() as session:
        u_res = await session.execute(select(User).where(User.id == student.id))
        updated_student = u_res.scalar_one()
        assert updated_student.must_change_password is False
        assert updated_student.temp_password_expires_at is None

        # Verify audit log for password rotation
        log_res = await session.execute(
            select(AuditLog).where(
                AuditLog.action == "USER_PASSWORD_CHANGE",
                AuditLog.entity_id == str(student.id),
            )
        )
        rot_log = log_res.scalar_one_or_none()
        assert rot_log is not None
        assert "NewPermanentPassword456!" not in rot_log.details

    # New permanent password works for fresh login
    perm_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "targetstudent", "password": "NewPermanentPassword456!"
    })
    assert perm_login.status_code == 200
    assert perm_login.json()["user"]["must_change_password"] is False

@pytest.mark.asyncio
async def test_expired_temporary_credentials_fail_login(client):
    async with TestSessionLocal() as session:
        admin = await create_user(
            session, "admin2@bytevipers.com", "admin2", role="teacher",
            permissions=["platform.superadmin", "users.manage"]
        )
        student = await create_user(
            session, "expstudent@bytevipers.com", "expstudent", role="student"
        )

    # Issue temporary credential
    a_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "admin2", "password": "Secret123!"
    })
    assist_res = await client.post(
        f"/api/v1/teacher/platform/users/{student.id}/password-assistance",
        headers={"Authorization": f"Bearer {a_login.json()['access_token']}"}
    )
    temp_pw = assist_res.json()["temporary_password"]

    # Manually expire the temporary password in database
    async with TestSessionLocal() as session:
        u_res = await session.execute(select(User).where(User.id == student.id))
        st = u_res.scalar_one()
        st.temp_password_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        await session.commit()

    # Login attempt should now be rejected as expired
    exp_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "expstudent", "password": temp_pw
    })
    assert exp_login.status_code == 400
    assert "expired" in exp_login.json()["detail"].lower()

@pytest.mark.asyncio
async def test_session_and_token_invalidation(client):
    async with TestSessionLocal() as session:
        admin = await create_user(
            session, "admin3@bytevipers.com", "admin3", role="teacher",
            permissions=["platform.superadmin", "users.manage"]
        )
        student = await create_user(
            session, "sessionuser@bytevipers.com", "sessionuser", role="student"
        )

    # Student logs in
    s_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "sessionuser", "password": "Secret123!"
    })
    student_token = s_login.json()["access_token"]

    # Student token works for authenticated endpoint
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {student_token}"})
    assert me_res.status_code == 200

    # Admin issues temporary credentials (increments token_version)
    a_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "admin3", "password": "Secret123!"
    })
    await client.post(
        f"/api/v1/teacher/platform/users/{student.id}/password-assistance",
        headers={"Authorization": f"Bearer {a_login.json()['access_token']}"}
    )

    # The student's old token is now invalidated!
    me_res_invalid = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {student_token}"})
    assert me_res_invalid.status_code == 401

@pytest.mark.asyncio
async def test_recovery_rate_limiting(client):
    async with TestSessionLocal() as session:
        admin = await create_user(
            session, "admin_rate@bytevipers.com", "admin_rate", role="teacher",
            permissions=["platform.superadmin", "users.manage"]
        )
        students = []
        for i in range(6):
            s = await create_user(session, f"target{i}@bytevipers.com", f"target{i}", role="student")
            students.append(s)

    a_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "admin_rate", "password": "Secret123!"
    })
    token = a_login.json()["access_token"]

    # First 5 attempts should succeed
    for i in range(5):
        res = await client.post(
            f"/api/v1/teacher/platform/users/{students[i].id}/password-assistance",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200

    # 6th attempt within window should be rate-limited (429)
    res_limited = await client.post(
        f"/api/v1/teacher/platform/users/{students[5].id}/password-assistance",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_limited.status_code == 429
    assert "rate limit" in res_limited.json()["detail"].lower()

