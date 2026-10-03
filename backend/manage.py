import argparse
import asyncio
import getpass
import os
import sys
from app.core.config import settings
from app.services.bootstrap import init_db_and_seed, bootstrap_initial_teacher

def main():
    parser = argparse.ArgumentParser(description="ByteVipers Management CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Seed command
    subparsers.add_parser("seed", help="Initialize database and seed standard data (permissions, tags, starter problems)")

    # Create admin / bootstrap-teacher command
    for cmd_name in ("create-admin", "bootstrap-teacher"):
        admin_parser = subparsers.add_parser(cmd_name, help="Bootstrap the initial teacher/super admin account (one-time)")
        admin_parser.add_argument("--email", required=False, help="User email")
        admin_parser.add_argument("--username", required=False, help="Username")
        admin_parser.add_argument("--name", required=False, help="Full name")
        admin_parser.add_argument("--password", required=False, help="Password (interactive prompt used if omitted)")

    args = parser.parse_args()

    if args.command == "seed":
        print("Initializing database and seeding starter content...")
        asyncio.run(init_db_and_seed())
        print("Database seeded successfully.")
    elif args.command in ("create-admin", "bootstrap-teacher"):
        email = args.email or os.getenv("TEACHER_EMAIL") or os.getenv("ADMIN_EMAIL")
        username = args.username or os.getenv("TEACHER_USERNAME") or os.getenv("ADMIN_USERNAME")
        name = args.name or os.getenv("TEACHER_NAME") or os.getenv("ADMIN_NAME")
        password = args.password or os.getenv("TEACHER_PASSWORD") or os.getenv("ADMIN_PASSWORD")

        if not email:
            email = input("Enter Teacher Email: ").strip()
        if not username:
            username = input("Enter Teacher Username (Login ID): ").strip()
        if not name:
            name = input("Enter Teacher Full Name: ").strip()

        if not password:
            p1 = getpass.getpass("Enter secure administrator password (min 10 chars): ")
            p2 = getpass.getpass("Confirm password: ")
            if p1 != p2:
                print("Error: Passwords do not match.", file=sys.stderr)
                sys.exit(1)
            password = p1

        print(f"Bootstrapping initial Teacher / Super Admin account for {email}...")
        try:
            user = asyncio.run(bootstrap_initial_teacher(
                email=email,
                username=username,
                full_name=name,
                password=password,
                environment=settings.ENVIRONMENT,
            ))
            print(f"Successfully created initial Teacher account: {user.username} ({user.email}) with all system permissions.")
        except ValueError as ve:
            print(f"Provisioning Error: {ve}", file=sys.stderr)
            sys.exit(1)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
