from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import os
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import (
    Permission, Tag, Problem, TestCase, User, StudentVerification, VerificationStatus, AuditLog
)

SYSTEM_PERMISSIONS = [
    ("verification.review", "Review and approve/reject student verification requests"),
    ("problems.create", "Create new programming problems"),
    ("problems.edit", "Edit existing problems and test cases"),
    ("problems.publish", "Publish or unpublish coding problems"),
    ("assignments.create", "Create assignments for student classes"),
    ("assignments.manage", "Edit, publish, and close assignments"),
    ("classes.manage", "Create classes and manage student enrollments"),
    ("submissions.review", "Inspect student submissions and logs across the platform"),
    ("users.manage", "Manage user accounts, roles, and suspensions"),
    ("platform.configure", "Configure platform-wide settings and limits"),
    ("audit_logs.view", "View platform audit logs and security events"),
    ("tests.create", "Create, edit, and publish online tests and questions"),
    ("tests.evaluate", "Manually evaluate online tests and coding submissions"),
    ("platform.superadmin", "Full platform access and permission administration"),
]

DEFAULT_TAGS = [
    ("Python Basics", "python-basics"),
    ("Strings", "strings"),
    ("Arrays & Lists", "arrays-lists"),
    ("Math", "math"),
    ("Conditionals & Logic", "conditionals-logic"),
    ("Algorithms", "algorithms"),
    ("Data Structures", "data-structures"),
]

SEED_PROBLEMS = [
    {
        "title": "Reverse String",
        "slug": "reverse-string",
        "difficulty": "Easy",
        "description": "Write a Python program that reads a string from standard input and prints the string in reverse.",
        "input_description": "A single line containing a string `s`.",
        "output_description": "Print the reversed string.",
        "constraints": "1 <= len(s) <= 1000\nContains standard ASCII characters.",
        "starter_code": "import sys\n\ndef solve():\n    s = sys.stdin.read().rstrip('\\r\\n')\n    # Reverse string logic here\n    print(s[::-1])\n\nif __name__ == '__main__':\n    solve()\n",
        "tags": ["Python Basics", "Strings"],
        "test_cases": [
            {
                "input_data": "bytevipers",
                "expected_output": "srepivetyb",
                "is_sample": True,
                "sample_explanation": "Reversing 'bytevipers' yields 'srepivetyb'.",
                "order_index": 1,
            },
            {
                "input_data": "hello world",
                "expected_output": "dlrow olleh",
                "is_sample": True,
                "sample_explanation": "Reversing 'hello world' preserves spaces.",
                "order_index": 2,
            },
            {
                "input_data": "Python3",
                "expected_output": "3nohtyP",
                "is_sample": False,
                "sample_explanation": None,
                "order_index": 3,
            },
            {
                "input_data": "1234567890",
                "expected_output": "0987654321",
                "is_sample": False,
                "sample_explanation": None,
                "order_index": 4,
            },
        ],
    },
    {
        "title": "Sum of Two Numbers",
        "slug": "sum-of-two-numbers",
        "difficulty": "Easy",
        "description": "Given two space-separated integers `a` and `b` on a single line, calculate and output their sum.",
        "input_description": "Two space-separated integers `a` and `b`.",
        "output_description": "Print the sum of `a` and `b`.",
        "constraints": "-10^9 <= a, b <= 10^9",
        "starter_code": "import sys\n\ndef solve():\n    parts = sys.stdin.read().split()\n    if len(parts) >= 2:\n        a, b = int(parts[0]), int(parts[1])\n        print(a + b)\n\nif __name__ == '__main__':\n    solve()\n",
        "tags": ["Python Basics", "Math"],
        "test_cases": [
            {
                "input_data": "12 25",
                "expected_output": "37",
                "is_sample": True,
                "sample_explanation": "12 + 25 = 37",
                "order_index": 1,
            },
            {
                "input_data": "-5 15",
                "expected_output": "10",
                "is_sample": True,
                "sample_explanation": "-5 + 15 = 10",
                "order_index": 2,
            },
            {
                "input_data": "1000000 2000000",
                "expected_output": "3000000",
                "is_sample": False,
                "sample_explanation": None,
                "order_index": 3,
            },
            {
                "input_data": "-99 -1",
                "expected_output": "-100",
                "is_sample": False,
                "sample_explanation": None,
                "order_index": 4,
            },
        ],
    },
    {
        "title": "Palindrome Checker",
        "slug": "palindrome-checker",
        "difficulty": "Medium",
        "description": "Determine whether a given string is a palindrome, considering only alphanumeric characters and ignoring cases. Print `true` if it is a palindrome, or `false` otherwise.",
        "input_description": "A single line containing the string `s`.",
        "output_description": "Print `true` or `false` in lowercase.",
        "constraints": "1 <= len(s) <= 2 * 10^5",
        "starter_code": "import sys\n\ndef solve():\n    raw = sys.stdin.read().rstrip('\\r\\n')\n    cleaned = [c.lower() for c in raw if c.isalnum()]\n    if cleaned == cleaned[::-1]:\n        print('true')\n    else:\n        print('false')\n\nif __name__ == '__main__':\n    solve()\n",
        "tags": ["Strings", "Algorithms"],
        "test_cases": [
            {
                "input_data": "A man, a plan, a canal: Panama",
                "expected_output": "true",
                "is_sample": True,
                "sample_explanation": "'amanaplanacanalpanama' is a palindrome.",
                "order_index": 1,
            },
            {
                "input_data": "race a car",
                "expected_output": "false",
                "is_sample": True,
                "sample_explanation": "'raceacar' is not a palindrome.",
                "order_index": 2,
            },
            {
                "input_data": "Was it a car or a cat I saw?",
                "expected_output": "true",
                "is_sample": False,
                "sample_explanation": None,
                "order_index": 3,
            },
            {
                "input_data": "12321",
                "expected_output": "true",
                "is_sample": False,
                "sample_explanation": None,
                "order_index": 4,
            },
        ],
    },
]

async def init_db_and_seed():
    """
    Initializes database tables and seeds permissions, tags, and starter problems.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed Permissions
        perm_map = {}
        for p_name, p_desc in SYSTEM_PERMISSIONS:
            stmt = select(Permission).where(Permission.name == p_name)
            res = await session.execute(stmt)
            perm = res.scalar_one_or_none()
            if not perm:
                perm = Permission(name=p_name, description=p_desc)
                session.add(perm)
                await session.flush()
            perm_map[p_name] = perm

        # 2. Seed Tags
        tag_map = {}
        for t_name, t_slug in DEFAULT_TAGS:
            stmt = select(Tag).where(Tag.slug == t_slug)
            res = await session.execute(stmt)
            tag = res.scalar_one_or_none()
            if not tag:
                tag = Tag(name=t_name, slug=t_slug)
                session.add(tag)
                await session.flush()
            tag_map[t_name] = tag

        # 3. Seed Starter Problems
        for p_data in SEED_PROBLEMS:
            stmt = select(Problem).where(Problem.slug == p_data["slug"])
            res = await session.execute(stmt)
            problem = res.scalar_one_or_none()
            if not problem:
                problem = Problem(
                    title=p_data["title"],
                    slug=p_data["slug"],
                    difficulty=p_data["difficulty"],
                    description=p_data["description"],
                    input_description=p_data["input_description"],
                    output_description=p_data["output_description"],
                    constraints=p_data["constraints"],
                    starter_code=p_data["starter_code"],
                    is_published=True,
                )
                for t_name in p_data["tags"]:
                    if t_name in tag_map:
                        problem.tags.append(tag_map[t_name])

                session.add(problem)
                await session.flush()

                for tc_data in p_data["test_cases"]:
                    tc = TestCase(
                        problem_id=problem.id,
                        input_data=tc_data["input_data"],
                        expected_output=tc_data["expected_output"],
                        is_sample=tc_data["is_sample"],
                        sample_explanation=tc_data["sample_explanation"],
                        order_index=tc_data["order_index"],
                    )
                    session.add(tc)

        await session.commit()

INSECURE_DEFAULT_PASSWORDS = {
    "password", "password123!", "password123", "admin", "admin123", "admin123!",
    "changeme", "bytevipers", "12345678", "qwerty"
}

def validate_admin_password_strength(password: str, environment: str = "development") -> None:
    """Enforce strict password requirements for administrative accounts."""
    if len(password) < 10:
        raise ValueError("Administrator password must be at least 10 characters long.")
    if password.lower() in INSECURE_DEFAULT_PASSWORDS:
        raise ValueError("Insecure password detected: Cannot use common default passwords. Choose a unique passphrase.")
    if environment == "production":
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(not c.isalnum() for c in password)
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError(
                "Production administrator password must contain uppercase, lowercase, numbers, and special characters."
            )

async def bootstrap_initial_teacher(
    email: str,
    username: str,
    full_name: str,
    password: str,
    environment: str = "development",
    db_session: Optional[AsyncSession] = None,
) -> User:
    """
    Creates the first initial Teacher / Super Admin account.
    Enforces the one-time bootstrap invariant: if ANY Teacher already exists in the system,
    it strictly aborts to prevent unauthorized creation of extra admins via bootstrap.
    """
    validate_admin_password_strength(password, environment)

    async def _do_bootstrap(session: AsyncSession) -> User:
        # 1. Enforce strict single initial teacher bootstrap invariant
        teacher_stmt = select(func.count(User.id)).where(User.role == "teacher")
        teacher_count = (await session.execute(teacher_stmt)).scalar() or 0
        if teacher_count > 0:
            raise ValueError(
                "Initial teacher bootstrap is locked: A Teacher / Super Admin account already exists in ByteVipers. "
                "Additional accounts must be created or managed by existing authenticated administrators."
            )

        # 2. Check collision on email or username
        collision_stmt = select(User).where((User.email == email) | (User.username == username))
        existing_user = (await session.execute(collision_stmt)).scalar_one_or_none()
        if existing_user:
            raise ValueError(
                f"User collision: An account with email '{email}' or username '{username}' already exists. "
                "Bootstrap cannot overwrite existing accounts."
            )

        # 3. Ensure all system permissions exist in database
        perm_res = await session.execute(select(Permission))
        all_perms = list(perm_res.scalars().all())
        existing_perm_names = {p.name for p in all_perms}

        for p_name, p_desc in SYSTEM_PERMISSIONS:
            if p_name not in existing_perm_names:
                new_p = Permission(name=p_name, description=p_desc)
                session.add(new_p)
                all_perms.append(new_p)
        await session.flush()

        # 4. Create Teacher user with full Super Admin permissions
        teacher = User(
            email=email.strip().lower(),
            username=username.strip(),
            full_name=full_name.strip(),
            hashed_password=get_password_hash(password),
            role="teacher",
            is_active=True,
            is_suspended=False,
            permissions=all_perms,
        )
        session.add(teacher)
        await session.flush()

        # Audit log
        session.add(AuditLog(
            user_id=teacher.id,
            action="INITIAL_TEACHER_BOOTSTRAP",
            entity_type="user",
            entity_id=str(teacher.id),
            details=f"Initial Teacher/Super Admin account '{teacher.username}' ({teacher.email}) bootstrapped.",
        ))

        await session.commit()
        await session.refresh(teacher)
        return teacher

    if db_session:
        return await _do_bootstrap(db_session)
    else:
        async with AsyncSessionLocal() as session:
            return await _do_bootstrap(session)

