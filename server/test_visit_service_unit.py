
from datetime import date, timedelta, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from data.store import normalize_project
from models import Lead
from schemas.visit import VISIT_SLOTS, SiteVisitCreate
from services.visit_service import (
    BOOKING_CONSTRAINT,
    book_site_visit,
    get_available_slots,
    get_all_visits,
    parse_slot_time,
)


def make_payload(**overrides):
    data = {
        "lead_id": "LD-UNIT-1",
        "project": "Project A",
        "visit_date": date.today() + timedelta(days=7),
        "slot_time": VISIT_SLOTS[0],
    }
    data.update(overrides)
    return SiteVisitCreate(**data)


def make_lead(**overrides):
    data = {
        "id": "LD-UNIT-1",
        "name": "Test Lead",
        "phone": "9876543210",
        "source": "Website",
        "project": "Project A",
        "project_key": normalize_project("Project A"),
        "status": "New",
        "visit_status": "Not Booked",
        "visit_time": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def test_parse_slot_time_rejects_invalid_slot():
    with pytest.raises(HTTPException) as exc:
        parse_slot_time("25:99")

    assert exc.value.status_code == 422


def test_available_slots_excludes_booked_time():
    visit_date = date.today() + timedelta(days=7)
    booked_slot = VISIT_SLOTS[0]
    booked_datetime = datetime.combine(
        visit_date,
        datetime.strptime(booked_slot, "%H:%M").time(),
    )

    db = MagicMock()
    db.scalars.return_value.all.return_value = [booked_datetime]

    result = get_available_slots(" Project A ", visit_date, db)

    assert result["project"] == "Project A"
    assert booked_slot not in result["available_slots"]


def test_booking_rejects_lead_with_existing_future_visit():
    visit_date = date.today() + timedelta(days=7)
    lead = make_lead(
        visit_status="Booked",
        visit_time=datetime.combine(
            visit_date,
            datetime.strptime(VISIT_SLOTS[0], "%H:%M").time(),
        ),
    )

    db = MagicMock()
    db.get.return_value = lead

    with pytest.raises(HTTPException) as exc:
        book_site_visit(make_payload(), db)

    assert exc.value.status_code == 409
    assert "already has a booked site visit" in exc.value.detail
    db.commit.assert_not_called()


def test_booking_constraint_integrity_error_returns_conflict():
    lead = make_lead()
    db = MagicMock()
    db.get.return_value = lead
    db.scalar.return_value = None

    original_error = SimpleNamespace(
        diag=SimpleNamespace(
            constraint_name=BOOKING_CONSTRAINT
        )
    )
    db.commit.side_effect = IntegrityError(
        "INSERT",
        {},
        original_error,
    )

    with pytest.raises(HTTPException) as exc:
        book_site_visit(make_payload(), db)

    assert exc.value.status_code == 409
    db.rollback.assert_called_once()


def test_unrelated_integrity_error_is_reraised():
    lead = make_lead()
    db = MagicMock()
    db.get.return_value = lead
    db.scalar.return_value = None

    original_error = SimpleNamespace(
        diag=SimpleNamespace(
            constraint_name="some_other_constraint"
        )
    )
    error = IntegrityError("INSERT", {}, original_error)
    db.commit.side_effect = error

    with pytest.raises(IntegrityError) as exc:
        book_site_visit(make_payload(), db)

    assert exc.value is error
    db.rollback.assert_called_once()


def test_unexpected_commit_error_rolls_back():
    lead = make_lead()
    db = MagicMock()
    db.get.return_value = lead
    db.scalar.return_value = None

    error = RuntimeError("Simulated database failure")
    db.commit.side_effect = error

    with pytest.raises(RuntimeError) as exc:
        book_site_visit(make_payload(), db)

    assert exc.value is error
    db.rollback.assert_called_once()


def test_get_all_visits_includes_booked_and_visited_leads():
    booked = make_lead(
        id="LD-BOOKED",
        visit_status="Booked",
        visit_time=datetime(2026, 11, 10, 10, 0),
    )
    visited = make_lead(
        id="LD-VISITED",
        visit_status="Visited",
        visit_time=None,
    )

    db = MagicMock()
    db.scalars.return_value.all.return_value = [booked, visited]

    result = get_all_visits(db)

    assert result["total"] == 2
    assert {v["visit_status"] for v in result["visits"]} == {
        "Booked",
        "Visited",
    }
    assert result["visits"][1]["visit_time"] is None
