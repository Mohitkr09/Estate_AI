
import getpass
import re
import sys

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from models import User
from dependencies.auth import hash_password


def main():
    username = input("Admin username: ").strip().lower()

    if not re.fullmatch(r"[a-zA-Z0-9_.-]{3,100}", username):
        sys.exit("Username must contain 3-100 valid characters.")

    password = getpass.getpass("Enter admin password (12+ characters): ")
    confirmation = getpass.getpass("Confirm admin password: ")

    if not 12 <= len(password) <= 128:
        sys.exit("Password must be between 12 and 128 characters.")

    if password != confirmation:
        sys.exit("Passwords do not match.")

    with SessionLocal() as db:
        existing = db.scalar(
            select(User).where(User.username == username)
        )

        if existing:
            sys.exit("This username already exists.")

        admin = User(
            username=username,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )

        db.add(admin)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            sys.exit("Could not create the administrator.")

    print(f"Administrator '{username}' created successfully.")


if __name__ == "__main__":
    main()
