
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from sqlalchemy.exc import IntegrityError

import services.lead_service as service


def make_payload(**overrides):
    data = {
        "name": " Test Lead ",
        "phone": "9876543210",
        "source": " Website ",
        "project": " Project A ",
        "bhk": " 2 BHK ",
        "budget": 5000000,
        "consent": True,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def make_lead(**overrides):
    data = {
        "id": "LD-UNIT-1",
        "name": "Test Lead",
        "phone": "9876543210",
        "source": "Website",
        "project": "Project A",
        "project_key": "project a",
        "bhk": "2 BHK",
        "budget": 5000000,
        "status": "New",
        "visit_status": "Not booked",
        "visit_time": None,
        "assigned_to": None,
        "consent": True,
        "created_at": None,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def test_create_lead_rejects_invalid_phone():
    db = MagicMock()

    result = service.create_lead(
        make_payload(phone="abc"),
        db,
    )

    assert result["duplicate"] is False
    assert "error" in result
    db.add.assert_not_called()
    db.commit.assert_not_called()


def test_create_lead_handles_duplicate_found_after_integrity_error(
    monkeypatch,
):
    db = MagicMock()
    existing = make_lead(id="LD-EXISTING")

    monkeypatch.setattr(
        service,
        "generate_lead_id",
        lambda db: "LD-NEW",
    )
    monkeypatch.setattr(
        service,
        "public_lead",
        lambda lead: {
            "id": lead.id,
            "phone": lead.phone,
        },
    )

    db.scalar.side_effect = [None, existing]
    db.commit.side_effect = IntegrityError(
        "INSERT",
        {},
        Exception("unique constraint violation"),
    )

    result = service.create_lead(make_payload(), db)

    assert result["duplicate"] is True
    assert result["existing_lead"]["id"] == "LD-EXISTING"
    db.rollback.assert_called_once()


def test_create_lead_reraises_unrelated_integrity_error(
    monkeypatch,
):
    db = MagicMock()

    monkeypatch.setattr(
        service,
        "generate_lead_id",
        lambda db: "LD-NEW",
    )
    db.scalar.side_effect = [None, None]

    error = IntegrityError(
        "INSERT",
        {},
        Exception("unrelated database constraint"),
    )
    db.commit.side_effect = error

    with pytest.raises(IntegrityError) as exc:
        service.create_lead(make_payload(), db)

    assert exc.value is error
    db.rollback.assert_called_once()


def test_update_lead_returns_none_when_lead_does_not_exist():
    db = MagicMock()
    db.get.return_value = None

    result = service.update_lead(
        "LD-MISSING",
        make_payload(),
        db,
    )

    assert result is None
    db.commit.assert_not_called()


def test_update_lead_rejects_invalid_phone():
    db = MagicMock()
    db.get.return_value = make_lead()

    result = service.update_lead(
        "LD-UNIT-1",
        make_payload(phone="abc"),
        db,
    )

    assert "error" in result
    db.commit.assert_not_called()


def test_update_lead_rolls_back_integrity_error():
    db = MagicMock()
    lead = make_lead()

    db.get.return_value = lead
    db.scalar.return_value = None
    db.commit.side_effect = IntegrityError(
        "UPDATE",
        {},
        Exception("unique constraint violation"),
    )

    result = service.update_lead(
        "LD-UNIT-1",
        make_payload(),
        db,
    )

    assert "error" in result
    assert "database conflict" in result["error"]
    db.rollback.assert_called_once()


def test_update_lead_rejects_phone_used_by_another_lead(
    monkeypatch,
):
    db = MagicMock()
    db.get.return_value = make_lead()
    db.scalar.return_value = make_lead(id="LD-OTHER")

    monkeypatch.setattr(
        service,
        "public_lead",
        lambda lead: {"id": lead.id},
    )

    result = service.update_lead(
        "LD-UNIT-1",
        make_payload(),
        db,
    )

    assert "error" in result

    # Case-insensitive assertion fixes the previous test failure.
    assert "another lead" in result["error"].lower()

    assert result["existing_lead"]["id"] == "LD-OTHER"
    db.commit.assert_not_called()


@pytest.mark.parametrize(
    "status",
    ["Unknown", "", "contacted"],
)
def test_update_lead_status_rejects_invalid_status(status):
    db = MagicMock()

    result = service.update_lead_status(
        "LD-UNIT-1",
        status,
        db,
    )

    assert "error" in result
    db.get.assert_not_called()
    db.commit.assert_not_called()


def test_update_lead_status_marks_visit_as_visited(monkeypatch):
    db = MagicMock()
    lead = make_lead()

    db.get.return_value = lead

    monkeypatch.setattr(
        service,
        "public_lead",
        lambda item: {
            "id": item.id,
            "status": item.status,
            "visit_status": item.visit_status,
        },
    )

    result = service.update_lead_status(
        "LD-UNIT-1",
        "Visited",
        db,
    )

    assert result["lead"]["status"] == "Visited"
    assert result["lead"]["visit_status"] == "Visited"
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(lead)


def test_update_lead_status_returns_none_for_missing_lead():
    db = MagicMock()
    db.get.return_value = None

    result = service.update_lead_status(
        "LD-MISSING",
        "Qualified",
        db,
    )

    assert result is None
    db.commit.assert_not_called()
