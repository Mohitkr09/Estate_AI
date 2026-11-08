
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from main import app
from schemas.visit import VISIT_SLOTS


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def valid_lead_payload(**overrides):
    payload = {
        "name": "Test Lead",
        "phone": "7414527831",
        "source": "Website",
        "project": "Test Project",
        "bhk": "2 BHK",
        "budget": 5000000,
        "consent": True,
    }
    payload.update(overrides)
    return payload


def create_test_lead(client, **overrides):
    """Create a lead and return its public representation."""
    response = client.post(
        "/api/leads",
        json=valid_lead_payload(**overrides),
    )
    assert response.status_code == 201, response.text
    return response.json()["lead"]


def future_visit_date():
    """Return a date that is safely in the future."""
    return (date.today() + timedelta(days=1)).isoformat()


def book_visit_payload(lead_id, **overrides):
    payload = {
        "lead_id": lead_id,
        "project": "Test Project",
        "visit_date": future_visit_date(),
        "slot_time": VISIT_SLOTS[0],
    }
    payload.update(overrides)
    return payload


# --------------------------------------------------
# HEALTH
# --------------------------------------------------

def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# --------------------------------------------------
# LEAD LISTING AND CREATION
# --------------------------------------------------

def test_list_leads_returns_expected_structure(client):
    response = client.get("/api/leads")

    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, dict)
    assert isinstance(data["total"], int)
    assert isinstance(data["leads"], list)
    assert data["total"] == len(data["leads"])


def test_create_lead(client):
    response = client.post(
        "/api/leads",
        json=valid_lead_payload(),
    )

    assert response.status_code == 201, response.text

    data = response.json()
    assert data["duplicate"] is False
    assert "lead" in data
    assert data["lead"]["name"] == "Test Lead"
    assert data["lead"]["id"]


def test_create_lead_rejects_missing_required_field(client):
    payload = valid_lead_payload()
    del payload["name"]

    response = client.post("/api/leads", json=payload)

    assert response.status_code == 422


def test_create_lead_rejects_invalid_phone(client):
    response = client.post(
        "/api/leads",
        json=valid_lead_payload(phone="123"),
    )

    assert response.status_code == 422


def test_create_lead_rejects_non_positive_budget(client):
    response = client.post(
        "/api/leads",
        json=valid_lead_payload(budget=0),
    )

    assert response.status_code == 422


def test_duplicate_phone_returns_existing_lead(client):
    first_lead = create_test_lead(client)

    response = client.post(
        "/api/leads",
        json=valid_lead_payload(name="Another Test Lead"),
    )

    assert response.status_code == 201, response.text

    data = response.json()
    assert data["duplicate"] is True
    assert data["existing_lead"]["id"] == first_lead["id"]


def test_create_lead_trims_text_fields(client):
    response = client.post(
        "/api/leads",
        json=valid_lead_payload(
            name="  Test Lead  ",
            source="  Website  ",
            project="  Test Project  ",
        ),
    )

    assert response.status_code == 201, response.text

    lead = response.json()["lead"]
    assert lead["name"] == "Test Lead"
    assert lead["source"] == "Website"
    assert lead["project"] == "Test Project"


# --------------------------------------------------
# LEAD RETRIEVAL
# --------------------------------------------------

def test_retrieve_missing_lead_returns_404(client):
    response = client.get("/api/leads/LD-DOES-NOT-EXIST")

    assert response.status_code == 404


def test_retrieve_created_lead_by_id(client):
    created_lead = create_test_lead(client)
    lead_id = created_lead["id"]

    response = client.get(f"/api/leads/{lead_id}")

    assert response.status_code == 200
    assert response.json()["id"] == lead_id
    assert response.json()["name"] == "Test Lead"


# --------------------------------------------------
# LEAD UPDATES
# --------------------------------------------------

def test_update_lead_successfully(client):
    lead = create_test_lead(client)

    response = client.put(
        f"/api/leads/{lead['id']}",
        json=valid_lead_payload(
            name="Updated Test Lead",
            phone="7414527832",
            source="Referral",
        ),
    )

    assert response.status_code == 200, response.text
    assert response.json()["lead"]["name"] == "Updated Test Lead"


def test_update_nonexistent_lead_returns_404(client):
    response = client.put(
        "/api/leads/LD-DOES-NOT-EXIST",
        json=valid_lead_payload(phone="7414527833"),
    )

    assert response.status_code == 404


def test_update_lead_rejects_invalid_phone(client):
    lead = create_test_lead(client)

    response = client.put(
        f"/api/leads/{lead['id']}",
        json=valid_lead_payload(phone="123"),
    )

    assert response.status_code == 422


# --------------------------------------------------
# LEAD STATUS
# --------------------------------------------------

@pytest.mark.parametrize("new_status", ["Contacted", "Qualified"])
def test_change_lead_status_successfully(client, new_status):
    lead = create_test_lead(client)

    response = client.patch(
        f"/api/leads/{lead['id']}/status",
        json={"status": new_status},
    )

    assert response.status_code == 200, response.text


def test_change_lead_status_rejects_invalid_status(client):
    lead = create_test_lead(client)

    response = client.patch(
        f"/api/leads/{lead['id']}/status",
        json={"status": "InvalidStatus"},
    )

    assert response.status_code == 422


def test_change_status_for_nonexistent_lead_returns_404(client):
    response = client.patch(
        "/api/leads/LD-DOES-NOT-EXIST/status",
        json={"status": "Contacted"},
    )

    assert response.status_code == 404


# --------------------------------------------------
# SITE VISIT LISTING
# --------------------------------------------------

def test_list_site_visits_returns_expected_structure(client):
    response = client.get("/api/visits")

    assert response.status_code == 200, response.text

    data = response.json()
    assert isinstance(data["total"], int)
    assert isinstance(data["visits"], list)
    assert data["total"] == len(data["visits"])


# --------------------------------------------------
# AVAILABLE VISIT SLOTS
# --------------------------------------------------

def test_get_available_slots_returns_expected_structure(client):
    visit_date = future_visit_date()

    response = client.get(
        "/api/visits/slots",
        params={
            "project": "Test Project",
            "visit_date": visit_date,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()
    assert data["project"] == "Test Project"
    assert data["visit_date"] == visit_date
    assert isinstance(data["available_slots"], list)
    assert all(
        slot in VISIT_SLOTS
        for slot in data["available_slots"]
    )


def test_get_available_slots_rejects_past_date(client):
    past_date = (
        date.today() - timedelta(days=1)
    ).isoformat()

    response = client.get(
        "/api/visits/slots",
        params={
            "project": "Test Project",
            "visit_date": past_date,
        },
    )

    assert response.status_code == 422


def test_get_available_slots_requires_project(client):
    response = client.get(
        "/api/visits/slots",
        params={"visit_date": future_visit_date()},
    )

    assert response.status_code == 422


# --------------------------------------------------
# SITE VISIT BOOKING
# --------------------------------------------------

def test_book_site_visit_successfully(client):
    lead = create_test_lead(client)

    response = client.post(
        "/api/visits/book",
        json=book_visit_payload(lead["id"]),
    )

    assert response.status_code == 201, response.text

    data = response.json()
    visit = data["visit"]

    assert visit["lead_id"] == lead["id"]
    assert visit["visit_status"] == "Booked"
    assert visit["slot_time"] == VISIT_SLOTS[0]
    assert visit["visit_date"] == future_visit_date()


def test_book_site_visit_rejects_nonexistent_lead(client):
    response = client.post(
        "/api/visits/book",
        json=book_visit_payload("LD-DOES-NOT-EXIST"),
    )

    assert response.status_code == 404


def test_book_site_visit_rejects_invalid_slot(client):
    lead = create_test_lead(client)

    response = client.post(
        "/api/visits/book",
        json=book_visit_payload(
            lead["id"],
            slot_time="03:17",
        ),
    )

    assert response.status_code == 422


def test_book_site_visit_rejects_past_date(client):
    lead = create_test_lead(client)

    response = client.post(
        "/api/visits/book",
        json=book_visit_payload(
            lead["id"],
            visit_date=(
                date.today() - timedelta(days=1)
            ).isoformat(),
        ),
    )

    assert response.status_code == 422


def test_book_site_visit_rejects_project_mismatch(client):
    lead = create_test_lead(client)

    response = client.post(
        "/api/visits/book",
        json=book_visit_payload(
            lead["id"],
            project="Another Project",
        ),
    )

    assert response.status_code == 422


def test_lead_cannot_book_two_active_site_visits(client):
    lead = create_test_lead(client)

    first_response = client.post(
        "/api/visits/book",
        json=book_visit_payload(lead["id"]),
    )

    assert first_response.status_code == 201, first_response.text

    another_slot = (
        VISIT_SLOTS[1]
        if len(VISIT_SLOTS) > 1
        else VISIT_SLOTS[0]
    )

    second_response = client.post(
        "/api/visits/book",
        json=book_visit_payload(
            lead["id"],
            slot_time=another_slot,
        ),
    )

    assert second_response.status_code == 409


def test_two_leads_cannot_book_same_project_slot(client):
    first_lead = create_test_lead(client)
    second_lead = create_test_lead(
        client,
        name="Second Test Lead",
        phone="7414527832",
    )

    first_response = client.post(
        "/api/visits/book",
        json=book_visit_payload(first_lead["id"]),
    )

    assert first_response.status_code == 201, first_response.text

    second_response = client.post(
        "/api/visits/book",
        json=book_visit_payload(second_lead["id"]),
    )

    assert second_response.status_code == 409


def test_booked_visit_appears_in_visit_list(client):
    lead = create_test_lead(client)

    booking_response = client.post(
        "/api/visits/book",
        json=book_visit_payload(lead["id"]),
    )

    assert booking_response.status_code == 201, booking_response.text

    response = client.get("/api/visits")

    assert response.status_code == 200, response.text
    data = response.json()

    matching_visits = [
        visit
        for visit in data["visits"]
        if visit["lead_id"] == lead["id"]
    ]

    assert len(matching_visits) == 1
    assert matching_visits[0]["visit_status"] == "Booked"
