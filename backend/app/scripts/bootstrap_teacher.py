#!/usr/bin/env python3
"""
ByteVipers Coding Arena — One-Time Initial Teacher/Super Admin Setup Script

Usage:
  Interactive Mode:
    python -m app.scripts.bootstrap_teacher
    OR from project root:
    python backend/app/scripts/bootstrap_teacher.py

  Non-Interactive / Environment-Driven Mode:
    TEACHER_NAME="Prof. Alan Turing" TEACHER_USERNAME="admin_alan" TEACHER_EMAIL="alan@bytevipers.edu" TEACHER_PASSWORD="..." python -m app.scripts.bootstrap_teacher

Security Guarantees:
  - Password hashed using bcrypt via get_password_hash.
  - Password strength validation enforced.
  - Strictly prevents creation if ANY Teacher/Super Admin account already exists.
  - Connects securely to the active database (Neon PostgreSQL or SQLite configured via DATABASE_URL).
"""

import asyncio
import getpass
import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import settings
from app.core.database import verify_database_connectivity, engine
from app.services.bootstrap import bootstrap_initial_teacher


async def run_bootstrap():
    print("=" * 65)
    print("  ByteVipers Coding Arena - Initial Teacher Setup")
    print("  Tagline: Think. Code. Conquer.")
    print("=" * 65)

    # 1. Verify DB Connectivity
    print("\n[1/3] Verifying database connectivity...")
    try:
        db_info = await verify_database_connectivity()
        print(f"      Connected to: {db_info['dialect']} (Driver: {db_info['driver']})")
    except Exception as e:
        print(f"[-] ERROR: Failed to connect to database: {e}")
        sys.exit(1)

    # 2. Collect Teacher Credentials
    print("\n[2/3] Collecting initial Teacher/Super Admin account details...")
    
    # Check env vars first, else prompt interactively
    name = os.environ.get("TEACHER_NAME", "").strip()
    username = os.environ.get("TEACHER_USERNAME", "").strip()
    email = os.environ.get("TEACHER_EMAIL", "").strip()
    password = os.environ.get("TEACHER_PASSWORD", "").strip()

    if not name:
        name = input("Enter Teacher Full Name: ").strip()
    else:
        print(f"Teacher Full Name: {name} (from environment)")

    if not username:
        username = input("Enter Teacher Username (Login ID): ").strip()
    else:
        print(f"Teacher Username: {username} (from environment)")

    if not email:
        email = input("Enter Teacher Email: ").strip()
    else:
        print(f"Teacher Email: {email} (from environment)")

    if not password:
        while True:
            p1 = getpass.getpass("Enter Secure Password (min 10 chars): ")
            p2 = getpass.getpass("Confirm Secure Password: ")
            if p1 != p2:
                print("[-] Passwords do not match. Please re-enter.")
                continue
            if len(p1) < 10:
                print("[-] Password must be at least 10 characters.")
                continue
            password = p1
            break
    else:
        print("Password: [PROVIDED VIA ENVIRONMENT]")

    if not (name and username and email and password):
        print("[-] ERROR: All fields (Name, Username, Email, Password) are required.")
        sys.exit(1)

    # 3. Provision Account
    print("\n[3/3] Creating initial Teacher account...")
    try:
        teacher = await bootstrap_initial_teacher(
            email=email,
            username=username,
            full_name=name,
            password=password,
            environment=settings.ENVIRONMENT,
        )
        print("\n" + "=" * 65)
        print("  SUCCESS! Initial Teacher Account Created Successfully")
        print("=" * 65)
        print(f"  User ID:        {teacher.id}")
        print(f"  Full Name:      {teacher.full_name}")
        print(f"  Username:       {teacher.username}")
        print(f"  Email:          {teacher.email}")
        print(f"  Role:           {teacher.role}")
        print(f"  Permissions:    {len(teacher.permissions)} system permissions granted")
        print("=" * 65)
        print("\nNext steps:")
        print("1. Start frontend: npm run dev (http://localhost:3000)")
        print("2. Log in at: http://localhost:3000/login using your username/email and password.")
        print("3. You will be automatically redirected to the Teacher Dashboard (/teacher).")
        print("4. Navigate to 'Student Coordinators' (/teacher/coordinators) to initialize the 4 coordinator accounts.")
        print("=" * 65)
    except ValueError as ve:
        print(f"\n[-] BOOTSTRAP REJECTED: {ve}")
        sys.exit(1)
    except Exception as ex:
        print(f"\n[-] UNEXPECTED ERROR: {ex}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_bootstrap())
