from typing import Optional, List, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, StudentVerification, VerificationAuditLog, VerificationStatus
from app.schemas import CoordinatorPositionOut, CoordinatorAccountOut

DESIGNATED_COORDINATOR_POSITIONS = [
    {
        "position": "male_1",
        "title": "Male Student Coordinator 1",
        "gender": "Male",
    },
    {
        "position": "male_2",
        "title": "Male Student Coordinator 2",
        "gender": "Male",
    },
    {
        "position": "female_1",
        "title": "Female Student Coordinator 1",
        "gender": "Female",
    },
    {
        "position": "female_2",
        "title": "Female Student Coordinator 2",
        "gender": "Female",
    },
]

async def assign_coordinator_for_student(
    db: AsyncSession, student_gender: str
) -> Optional[User]:
    """
    Assigns a pending student verification request to an eligible active coordinator
    of the SAME gender using the least-pending-work strategy.
    """
    if not student_gender:
        return None

    norm_gender = student_gender.strip().capitalize()

    # Find active coordinators matching the student's gender
    stmt = (
        select(User)
        .where(
            User.role == "coordinator",
            User.is_active == True,
            User.is_suspended == False,
            func.lower(User.gender) == norm_gender.lower(),
        )
        .order_by(User.id.asc())
    )
    res = await db.execute(stmt)
    coordinators = res.scalars().all()

    if not coordinators:
        return None

    # Count pending verifications for each candidate
    coordinator_workloads = []
    for coord in coordinators:
        count_stmt = select(func.count(StudentVerification.id)).where(
            StudentVerification.assigned_coordinator_id == coord.id,
            func.lower(StudentVerification.status) == "pending",
        )
        count_res = await db.execute(count_stmt)
        pending_count = count_res.scalar_one() or 0
        coordinator_workloads.append((pending_count, coord))

    # Pick the coordinator with minimum pending count (least-pending-work)
    coordinator_workloads.sort(key=lambda x: (x[0], x[1].id))
    return coordinator_workloads[0][1]

async def get_all_coordinator_positions(db: AsyncSession) -> List[CoordinatorPositionOut]:
    """
    Returns the four designated coordinator positions along with their linked
    account details, workload counts, and activation statuses.
    """
    positions_out = []

    for pos in DESIGNATED_COORDINATOR_POSITIONS:
        pos_id = pos["position"]
        # Find user assigned to this coordinator position
        stmt = select(User).where(
            User.role == "coordinator",
            User.coordinator_position == pos_id,
        )
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        account_out = None
        if user:
            # Query workload counts
            pending_stmt = select(func.count(StudentVerification.id)).where(
                StudentVerification.assigned_coordinator_id == user.id,
                func.lower(StudentVerification.status) == "pending",
            )
            approved_stmt = select(func.count(StudentVerification.id)).where(
                StudentVerification.assigned_coordinator_id == user.id,
                func.lower(StudentVerification.status) == "approved",
            )
            rejected_stmt = select(func.count(StudentVerification.id)).where(
                StudentVerification.assigned_coordinator_id == user.id,
                func.lower(StudentVerification.status) == "rejected",
            )

            p_count = (await db.execute(pending_stmt)).scalar_one() or 0
            a_count = (await db.execute(approved_stmt)).scalar_one() or 0
            r_count = (await db.execute(rejected_stmt)).scalar_one() or 0

            account_out = CoordinatorAccountOut(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                gender=user.gender or pos["gender"],
                coordinator_position=pos_id,
                is_active=user.is_active,
                pending_count=p_count,
                approved_count=a_count,
                rejected_count=r_count,
                created_at=user.created_at,
            )

        positions_out.append(
            CoordinatorPositionOut(
                position=pos_id,
                title=pos["title"],
                gender=pos["gender"],
                account=account_out,
            )
        )

    return positions_out
