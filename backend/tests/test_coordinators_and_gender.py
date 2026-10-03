import pytest
import pytest_asyncio
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models import (
    User, StudentVerification, VerificationStatus, Permission, VerificationAuditLog
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

async def create_teacher_user(client, username="super_teacher", email="teacher@bytevipers.edu"):
    async with TestSessionLocal() as session:
        perm_res = await session.execute(select(Permission))
        all_perms = perm_res.scalars().all()
        teacher = User(
            email=email,
            username=username,
            full_name="Super Teacher",
            hashed_password=get_password_hash("TeacherPass123!"),
            role="teacher",
            is_active=True,
            is_suspended=False,
            permissions=list(all_perms),
        )
        session.add(teacher)
        await session.commit()

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": "TeacherPass123!"},
    )
    return login_res.json()["access_token"]

@pytest.mark.asyncio
async def test_gender_validation_during_student_registration(client):
    # 1. Invalid gender should fail validation (HTTP 422)
    invalid_res = await client.post("/api/v1/auth/register", json={
        "email": "invalid_gender@example.com",
        "username": "invalid_gender",
        "full_name": "Invalid Gender",
        "password": "Password123!",
        "gender": "Other"
    })
    assert invalid_res.status_code == 422

    # 2. Valid Male registration succeeds
    male_res = await client.post("/api/v1/auth/register", json={
        "email": "male_student@example.com",
        "username": "male_student",
        "full_name": "Male Student",
        "password": "Password123!",
        "gender": "Male"
    })
    assert male_res.status_code == 201
    assert male_res.json()["gender"] == "Male"

    # 3. Valid Female registration succeeds (case-insensitive input normalized to Female)
    female_res = await client.post("/api/v1/auth/register", json={
        "email": "female_student@example.com",
        "username": "female_student",
        "full_name": "Female Student",
        "password": "Password123!",
        "gender": "female"
    })
    assert female_res.status_code == 201
    assert female_res.json()["gender"] == "Female"

@pytest.mark.asyncio
async def test_teacher_coordinator_initialization_and_management(client):
    teacher_token = await create_teacher_user(client)
    headers = {"Authorization": f"Bearer {teacher_token}"}

    # 1. Fetch coordinator positions list
    list_res = await client.get("/api/v1/teacher/coordinators", headers=headers)
    assert list_res.status_code == 200
    positions = list_res.json()
    assert len(positions) == 4
    position_codes = [p["position"] for p in positions]
    assert "male_1" in position_codes
    assert "male_2" in position_codes
    assert "female_1" in position_codes
    assert "female_2" in position_codes

    # 2. Teacher initializes male_1 coordinator account
    init_res = await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "male_1",
        "full_name": "John Coordinator",
        "username": "coord_john",
        "email": "john.coord@bytevipers.edu",
        "password": "CoordPassword123!"
    }, headers=headers)
    assert init_res.status_code == 200
    updated_positions = init_res.json()
    male_1_pos = next(p for p in updated_positions if p["position"] == "male_1")
    assert male_1_pos["account"] is not None
    coord_user = male_1_pos["account"]
    assert coord_user["gender"] == "Male"
    assert coord_user["coordinator_position"] == "male_1"
    coord_user_id = coord_user["id"]

    # 3. Initializing again for the same position should fail with HTTP 400
    dup_res = await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "male_1",
        "full_name": "Duplicate John",
        "username": "coord_john2",
        "email": "john2.coord@bytevipers.edu",
        "password": "CoordPassword123!"
    }, headers=headers)
    assert dup_res.status_code == 400
    assert "already assigned" in dup_res.json()["detail"].lower()

    # 4. Teacher updates coordinator details
    update_res = await client.put(f"/api/v1/teacher/coordinators/{coord_user_id}", json={
        "full_name": "John Updated",
        "username": "coord_john_upd",
        "email": "john.upd@bytevipers.edu",
        "is_active": True
    }, headers=headers)
    assert update_res.status_code == 200
    upd_positions = update_res.json()
    upd_male_1 = next(p for p in upd_positions if p["position"] == "male_1")
    assert upd_male_1["account"]["full_name"] == "John Updated"
    assert upd_male_1["account"]["username"] == "coord_john_upd"

    # 5. Teacher resets coordinator password
    reset_res = await client.post(f"/api/v1/teacher/coordinators/{coord_user_id}/reset-password", json={
        "new_password": "NewSecretPass456!"
    }, headers=headers)
    assert reset_res.status_code == 200

    # 6. Coordinator can log in with new credentials
    login_res = await client.post("/api/v1/auth/login", json={
        "username_or_email": "coord_john_upd",
        "password": "NewSecretPass456!"
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["role"] == "coordinator"

@pytest.mark.asyncio
async def test_gender_routing_and_least_pending_assignment(client):
    teacher_token = await create_teacher_user(client)
    t_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Initialize 2 Male Coordinators: male_1 and male_2
    await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "male_1",
        "full_name": "Male Coord 1",
        "username": "male_coord1",
        "email": "m1@bytevipers.edu",
        "password": "Password123!"
    }, headers=t_headers)

    await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "male_2",
        "full_name": "Male Coord 2",
        "username": "male_coord2",
        "email": "m2@bytevipers.edu",
        "password": "Password123!"
    }, headers=t_headers)

    # Initialize 1 Female Coordinator: female_1
    await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "female_1",
        "full_name": "Female Coord 1",
        "username": "female_coord1",
        "email": "f1@bytevipers.edu",
        "password": "Password123!"
    }, headers=t_headers)

    # Register Male Student 1
    await client.post("/api/v1/auth/register", json={
        "email": "m_stu1@bytevipers.edu",
        "username": "m_stu1",
        "full_name": "Male Student 1",
        "password": "Password123!",
        "gender": "Male"
    })
    m1_login = await client.post("/api/v1/auth/login", json={"username_or_email": "m_stu1", "password": "Password123!"})
    m1_token = m1_login.json()["access_token"]
    m1_headers = {"Authorization": f"Bearer {m1_token}"}

    # Male Student 1 submits verification -> assigned to male_coord1 (both male_1 and male_2 had 0, male_1 chosen)
    sub1 = await client.post("/api/v1/verification/applications", json={
        "full_name": "Male Student 1",
        "gender": "Male",
        "institution_name": "Viper Tech",
        "department": "CS",
        "course": "B.Tech",
        "semester": "3",
        "roll_number": "M-001",
        "institutional_email": "m_stu1@bytevipers.edu",
        "verification_method": "student_id"
    }, headers=m1_headers)
    assert sub1.status_code == 200
    v1_id = sub1.json()["id"]
    assigned1_name = sub1.json()["assigned_coordinator_name"]
    assert assigned1_name == "Male Coord 1"

    # Register Male Student 2
    await client.post("/api/v1/auth/register", json={
        "email": "m_stu2@bytevipers.edu",
        "username": "m_stu2",
        "full_name": "Male Student 2",
        "password": "Password123!",
        "gender": "Male"
    })
    m2_login = await client.post("/api/v1/auth/login", json={"username_or_email": "m_stu2", "password": "Password123!"})
    m2_token = m2_login.json()["access_token"]
    m2_headers = {"Authorization": f"Bearer {m2_token}"}

    # Male Student 2 submits verification -> assigned to male_coord2 due to least-pending-work!
    sub2 = await client.post("/api/v1/verification/applications", json={
        "full_name": "Male Student 2",
        "gender": "Male",
        "institution_name": "Viper Tech",
        "department": "CS",
        "course": "B.Tech",
        "semester": "3",
        "roll_number": "M-002",
        "institutional_email": "m_stu2@bytevipers.edu",
        "verification_method": "student_id"
    }, headers=m2_headers)
    assert sub2.status_code == 200
    assert sub2.json()["assigned_coordinator_name"] == "Male Coord 2"

    # Register Female Student 1
    await client.post("/api/v1/auth/register", json={
        "email": "f_stu1@bytevipers.edu",
        "username": "f_stu1",
        "full_name": "Female Student 1",
        "password": "Password123!",
        "gender": "Female"
    })
    f1_login = await client.post("/api/v1/auth/login", json={"username_or_email": "f_stu1", "password": "Password123!"})
    f1_token = f1_login.json()["access_token"]
    f1_headers = {"Authorization": f"Bearer {f1_token}"}

    # Female Student 1 submits verification -> assigned to female_coord1
    sub_f = await client.post("/api/v1/verification/applications", json={
        "full_name": "Female Student 1",
        "gender": "Female",
        "institution_name": "Viper Tech",
        "department": "CS",
        "course": "B.Tech",
        "semester": "3",
        "roll_number": "F-001",
        "institutional_email": "f_stu1@bytevipers.edu",
        "verification_method": "student_id"
    }, headers=f1_headers)
    assert sub_f.status_code == 200
    assert sub_f.json()["assigned_coordinator_name"] == "Female Coord 1"

@pytest.mark.asyncio
async def test_cross_gender_isolation_and_coordinator_permissions(client):
    teacher_token = await create_teacher_user(client)
    t_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Initialize 1 Male Coordinator and 1 Female Coordinator
    await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "male_1",
        "full_name": "Male Coord 1",
        "username": "male_coord_iso",
        "email": "m_iso@bytevipers.edu",
        "password": "Password123!"
    }, headers=t_headers)

    await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "female_1",
        "full_name": "Female Coord 1",
        "username": "female_coord_iso",
        "email": "f_iso@bytevipers.edu",
        "password": "Password123!"
    }, headers=t_headers)

    # Log in as Male Coordinator
    m_login = await client.post("/api/v1/auth/login", json={"username_or_email": "male_coord_iso", "password": "Password123!"})
    assert m_login.status_code == 200
    m_token = m_login.json()["access_token"]
    m_headers = {"Authorization": f"Bearer {m_token}"}

    # Log in as Female Coordinator
    f_login = await client.post("/api/v1/auth/login", json={"username_or_email": "female_coord_iso", "password": "Password123!"})
    assert f_login.status_code == 200
    f_token = f_login.json()["access_token"]
    f_headers = {"Authorization": f"Bearer {f_token}"}

    # Register Male Student & Submit
    await client.post("/api/v1/auth/register", json={
        "email": "m_iso_stu@bytevipers.edu",
        "username": "m_iso_stu",
        "full_name": "Male Iso Student",
        "password": "Password123!",
        "gender": "Male"
    })
    m_stu_login = await client.post("/api/v1/auth/login", json={"username_or_email": "m_iso_stu", "password": "Password123!"})
    m_stu_token = m_stu_login.json()["access_token"]
    m_sub = await client.post("/api/v1/verification/applications", json={
        "full_name": "Male Iso Student",
        "gender": "Male",
        "institution_name": "Viper Tech",
        "department": "CS",
        "course": "B.Tech",
        "semester": "3",
        "roll_number": "M-ISO-1",
        "institutional_email": "m_iso_stu@bytevipers.edu",
        "verification_method": "student_id"
    }, headers={"Authorization": f"Bearer {m_stu_token}"})
    male_verif_id = m_sub.json()["id"]

    # Register Female Student & Submit
    await client.post("/api/v1/auth/register", json={
        "email": "f_iso_stu@bytevipers.edu",
        "username": "f_iso_stu",
        "full_name": "Female Iso Student",
        "password": "Password123!",
        "gender": "Female"
    })
    f_stu_login = await client.post("/api/v1/auth/login", json={"username_or_email": "f_iso_stu", "password": "Password123!"})
    f_stu_token = f_stu_login.json()["access_token"]
    f_sub = await client.post("/api/v1/verification/applications", json={
        "full_name": "Female Iso Student",
        "gender": "Female",
        "institution_name": "Viper Tech",
        "department": "CS",
        "course": "B.Tech",
        "semester": "3",
        "roll_number": "F-ISO-1",
        "institutional_email": "f_iso_stu@bytevipers.edu",
        "verification_method": "student_id"
    }, headers={"Authorization": f"Bearer {f_stu_token}"})
    female_verif_id = f_sub.json()["id"]

    # 1. Male coordinator queue should ONLY show male students
    m_queue_res = await client.get("/api/v1/coordinator/verifications", headers=m_headers)
    assert m_queue_res.status_code == 200
    m_items = m_queue_res.json()
    assert any(item["id"] == male_verif_id for item in m_items)
    assert not any(item["id"] == female_verif_id for item in m_items)

    # 2. Female coordinator queue should ONLY show female students
    f_queue_res = await client.get("/api/v1/coordinator/verifications", headers=f_headers)
    assert f_queue_res.status_code == 200
    f_items = f_queue_res.json()
    assert any(item["id"] == female_verif_id for item in f_items)
    assert not any(item["id"] == male_verif_id for item in f_items)

    # 3. Cross-gender detail view must return 403 Forbidden
    cross_detail = await client.get(f"/api/v1/coordinator/verifications/{female_verif_id}", headers=m_headers)
    assert cross_detail.status_code == 403
    assert "Forbidden" in cross_detail.json()["detail"]

    # 4. Cross-gender approval attempt must return 403 Forbidden
    cross_approve = await client.post(
        f"/api/v1/coordinator/verifications/{female_verif_id}/approve",
        json={"reviewer_notes": "Unauthorized cross approval attempt"},
        headers=m_headers
    )
    assert cross_approve.status_code == 403
    assert "Access Denied" in cross_approve.json()["detail"]

    # 5. Cross-gender rejection attempt must return 403 Forbidden
    cross_reject = await client.post(
        f"/api/v1/coordinator/verifications/{female_verif_id}/reject",
        json={"reviewer_notes": "Unauthorized cross rejection attempt", "reason": "Cross rejection"},
        headers=m_headers
    )
    assert cross_reject.status_code == 403

    # 6. Coordinator attempting teacher-only management endpoints must return 403 Forbidden
    coord_teacher_access = await client.get("/api/v1/teacher/coordinators", headers=m_headers)
    assert coord_teacher_access.status_code == 403

    # 7. Valid same-gender approval succeeds
    valid_approve = await client.post(
        f"/api/v1/coordinator/verifications/{male_verif_id}/approve",
        json={"reviewer_notes": "Credentials verified by male coordinator."},
        headers=m_headers
    )
    assert valid_approve.status_code == 200
    assert valid_approve.json()["status"] == "approved"

@pytest.mark.asyncio
async def test_teacher_reassignment_and_audit_history(client):
    teacher_token = await create_teacher_user(client)
    t_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Initialize male_1, male_2, and female_1
    init_res = await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "male_1",
        "full_name": "Male Coord Alpha",
        "username": "m_alpha",
        "email": "m_alpha@bytevipers.edu",
        "password": "Password123!"
    }, headers=t_headers)
    m1_id = next(p["account"]["id"] for p in init_res.json() if p["position"] == "male_1")

    init_res2 = await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "male_2",
        "full_name": "Male Coord Beta",
        "username": "m_beta",
        "email": "m_beta@bytevipers.edu",
        "password": "Password123!"
    }, headers=t_headers)
    m2_id = next(p["account"]["id"] for p in init_res2.json() if p["position"] == "male_2")

    init_res3 = await client.post("/api/v1/teacher/coordinators/initialize", json={
        "position": "female_1",
        "full_name": "Female Coord Gamma",
        "username": "f_gamma",
        "email": "f_gamma@bytevipers.edu",
        "password": "Password123!"
    }, headers=t_headers)
    f1_id = next(p["account"]["id"] for p in init_res3.json() if p["position"] == "female_1")

    # Register Male Student & submit application (auto-assigned to male_1)
    await client.post("/api/v1/auth/register", json={
        "email": "stu_reassign@bytevipers.edu",
        "username": "stu_reassign",
        "full_name": "Reassign Student",
        "password": "Password123!",
        "gender": "Male"
    })
    s_login = await client.post("/api/v1/auth/login", json={"username_or_email": "stu_reassign", "password": "Password123!"})
    s_token = s_login.json()["access_token"]
    sub = await client.post("/api/v1/verification/applications", json={
        "full_name": "Reassign Student",
        "gender": "Male",
        "institution_name": "Viper Tech",
        "department": "CS",
        "course": "B.Tech",
        "semester": "3",
        "roll_number": "R-001",
        "institutional_email": "stu_reassign@bytevipers.edu",
        "verification_method": "student_id"
    }, headers={"Authorization": f"Bearer {s_token}"})
    v_id = sub.json()["id"]

    # 1. Cross-gender reassignment attempt by teacher (reassigning male student to female coordinator) must fail (HTTP 400)
    cross_reassign = await client.post(
        f"/api/v1/teacher/verifications/{v_id}/reassign",
        json={
            "coordinator_id": f1_id,
            "reason": "Accidental cross-gender assignment attempt"
        },
        headers=t_headers
    )
    assert cross_reassign.status_code == 400
    assert "must be same gender" in cross_reassign.json()["detail"].lower()

    # 2. Valid same-gender reassignment by teacher to male_2
    valid_reassign = await client.post(
        f"/api/v1/teacher/verifications/{v_id}/reassign",
        json={
            "coordinator_id": m2_id,
            "reason": "Balancing workload between male coordinators"
        },
        headers=t_headers
    )
    assert valid_reassign.status_code == 200
    assert valid_reassign.json()["assigned_coordinator_id"] == m2_id
    assert valid_reassign.json()["assigned_coordinator_name"] == "Male Coord Beta"

    # 3. Global verification audit history should contain the submission and reassignment
    audit_res = await client.get("/api/v1/teacher/verifications/audit-history", headers=t_headers)
    assert audit_res.status_code == 200
    audit_logs = audit_res.json()
    actions = [log["action"] for log in audit_logs if log["verification_id"] == v_id]
    assert "submitted" in actions
    assert "reassigned" in actions
