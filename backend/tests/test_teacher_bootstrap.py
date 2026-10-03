import pytest
import pytest_asyncio
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.core.security import get_password_hash, verify_password
from app.models import User, Permission
from app.services.bootstrap import bootstrap_initial_teacher, SYSTEM_PERMISSIONS
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

@pytest.mark.asyncio
async def test_public_registration_never_allows_teacher_or_coordinator_role(client):
    """
    Public registration endpoint (/api/v1/auth/register) must strictly register
    users as students, never teachers, admins, or coordinators, even if submitted.
    """
    reg_data = {
        "email": "hacker@example.com",
        "username": "hacker_user",
        "full_name": "Wannabe Admin",
        "password": "Password123!",
        "gender": "Male",
        "role": "teacher"  # Attempt to elevate role during registration
    }
    res = await client.post("/api/v1/auth/register", json=reg_data)
    assert res.status_code == 201
    user_data = res.json()
    assert user_data["role"] == "student"  # Strictly defaulted to student
    assert user_data["role"] != "teacher"
    assert user_data["role"] != "coordinator"

    # Confirm in database
    async with TestSessionLocal() as session:
        db_user = (await session.execute(select(User).where(User.username == "hacker_user"))).scalar_one()
        assert db_user.role == "student"

@pytest.mark.asyncio
async def test_initial_teacher_bootstrap_succeeds_once():
    """
    Initial teacher bootstrap creates a Teacher account with all permissions
    and hashed password.
    """
    async with TestSessionLocal() as session:
        teacher = await bootstrap_initial_teacher(
            email="alan@bytevipers.edu",
            username="alan_turing",
            full_name="Prof. Alan Turing",
            password="SecurePassphrase123!",
            environment="development",
            db_session=session,
        )
        assert teacher.id is not None
        assert teacher.role == "teacher"
        assert teacher.username == "alan_turing"
        assert teacher.email == "alan@bytevipers.edu"
        assert verify_password("SecurePassphrase123!", teacher.hashed_password)
        assert len(teacher.permissions) >= 14
        perm_names = [p.name for p in teacher.permissions]
        assert "platform.superadmin" in perm_names
        assert "verification.review" in perm_names

@pytest.mark.asyncio
async def test_initial_teacher_bootstrap_prevents_duplicate_creation():
    """
    Once a Teacher account exists, any further attempts to bootstrap
    must be rejected with a ValueError.
    """
    async with TestSessionLocal() as session:
        # First creation succeeds
        await bootstrap_initial_teacher(
            email="alan@bytevipers.edu",
            username="alan_turing",
            full_name="Prof. Alan Turing",
            password="SecurePassphrase123!",
            environment="development",
            db_session=session,
        )

        # Second creation attempt MUST raise ValueError
        with pytest.raises(ValueError, match="Initial teacher bootstrap is locked"):
            await bootstrap_initial_teacher(
                email="second@bytevipers.edu",
                username="second_teacher",
                full_name="Second Teacher",
                password="AnotherPassword123!",
                environment="development",
                db_session=session,
            )

@pytest.mark.asyncio
async def test_initial_teacher_bootstrap_rejects_weak_passwords():
    """
    Enforces password complexity/length.
    """
    async with TestSessionLocal() as session:
        # Too short (< 10 chars)
        with pytest.raises(ValueError, match="at least 10 characters"):
            await bootstrap_initial_teacher(
                email="test@bytevipers.edu",
                username="test_admin",
                full_name="Test Admin",
                password="short",
                environment="development",
                db_session=session,
            )

        # Insecure common password
        with pytest.raises(ValueError, match="Insecure password detected"):
            await bootstrap_initial_teacher(
                email="test@bytevipers.edu",
                username="test_admin",
                full_name="Test Admin",
                password="password123!",
                environment="development",
                db_session=session,
            )

@pytest.mark.asyncio
async def test_bootstrapped_teacher_login_and_coordinator_access(client):
    """
    Verifies that a bootstrapped Teacher can log in, receive a valid JWT,
    and access the Coordinator Management endpoints.
    """
    async with TestSessionLocal() as session:
        await bootstrap_initial_teacher(
            email="ada@bytevipers.edu",
            username="ada_lovelace",
            full_name="Ada Lovelace",
            password="AdaLovelacePass123!",
            environment="development",
            db_session=session,
        )

    # 1. Log in via API
    login_res = await client.post("/api/v1/auth/login", json={
        "username_or_email": "ada_lovelace",
        "password": "AdaLovelacePass123!"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    token = data["access_token"]
    user_info = data["user"]
    assert user_info["role"] == "teacher"
    assert "platform.superadmin" in user_info["permissions"]

    # 2. Access Coordinator Management endpoint
    headers = {"Authorization": f"Bearer {token}"}
    coord_res = await client.get("/api/v1/teacher/coordinators", headers=headers)
    assert coord_res.status_code == 200
    positions = coord_res.json()
    assert len(positions) == 4

    # 3. Initialize a coordinator position
    init_res = await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "male_1",
        "full_name": "Male Coordinator Alpha",
        "username": "m_coord_alpha",
        "email": "m_alpha@bytevipers.edu",
        "password": "CoordinatorPass123!"
    }, headers=headers)
    assert init_res.status_code == 200

    # 4. Coordinator logs in and verifies role
    c_login = await client.post("/api/v1/auth/login", json={
        "username_or_email": "m_coord_alpha",
        "password": "CoordinatorPass123!"
    })
    assert c_login.status_code == 200
    c_data = c_login.json()
    assert c_data["user"]["role"] == "coordinator"
    assert c_data["user"]["coordinator_position"] == "male_1"

    # 5. Coordinator is forbidden from accessing Teacher Coordinator Management
    c_token = c_data["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}
    forbidden_res = await client.get("/api/v1/teacher/coordinators", headers=c_headers)
    assert forbidden_res.status_code == 403
