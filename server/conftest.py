
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

load_dotenv()

TEST_DATABASE_NAME = "estatemate_test_db"
test_database_url = os.getenv("TEST_DATABASE_URL")

if not test_database_url:
    raise RuntimeError(
        "TEST_DATABASE_URL is missing from server/.env"
    )

parsed_url = make_url(test_database_url)

if parsed_url.database != TEST_DATABASE_NAME:
    raise RuntimeError(
        "Tests stopped: TEST_DATABASE_URL must point to "
        f"{TEST_DATABASE_NAME!r}, not {parsed_url.database!r}."
    )

# main.py imports database.py, so redirect its engine before
# importing the application. Do not change the .env development URL.
os.environ["DATABASE_URL"] = test_database_url

# Verify the actual PostgreSQL database before application startup.
verification_engine = create_engine(
    test_database_url,
    pool_pre_ping=True,
)

try:
    with verification_engine.connect() as connection:
        actual_database = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

    if actual_database != TEST_DATABASE_NAME:
        raise RuntimeError(
            "Tests stopped: connected to unexpected database "
            f"{actual_database!r}."
        )
finally:
    verification_engine.dispose()

# Import only after the database has been verified.
from fastapi.testclient import TestClient
from sqlalchemy import delete

from database import Base, SessionLocal, engine, get_db
from models import Lead
from main import app


def override_get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def pytest_configure(config):
    # The main module's initialization has already run on import,
    # but only after the test database was verified.
    if engine.url.database != TEST_DATABASE_NAME:
        raise RuntimeError("Unexpected SQLAlchemy database for tests.")


import pytest


@pytest.fixture(scope="session", autouse=True)
def prepare_test_database():
    with engine.connect() as connection:
        actual_database = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

    if actual_database != TEST_DATABASE_NAME:
        raise RuntimeError("Refusing to prepare an unexpected database.")

    Base.metadata.create_all(bind=engine)
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def clean_test_leads():
    # This fixture deletes records only from the verified test database.
    with SessionLocal() as db:
        db.execute(delete(Lead))
        db.commit()

    yield

    with SessionLocal() as db:
        db.execute(delete(Lead))
        db.commit()


@pytest.fixture
def client(clean_test_leads):
    with TestClient(app) as test_client:
        yield test_client
