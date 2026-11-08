
import concurrent.futures
import threading
import uuid
from datetime import date, timedelta

import requests


BASE_URL = "http://127.0.0.1:8000"
PROJECT = f"Concurrency Test {uuid.uuid4().hex[:8]}"
VISIT_DATE = (date.today() + timedelta(days=7)).isoformat()
SLOT_TIME = "10:00"

# Both booking threads wait here before sending their requests.
barrier = threading.Barrier(2)


def create_test_lead(name: str, phone: str) -> str:
    """Create a test lead and return its ID."""
    response = requests.post(
        f"{BASE_URL}/api/leads",
        json={
            "name": name,
            "phone": phone,
            "source": "Website",
            "project": PROJECT,
            "bhk": "2 BHK",
            "budget": 5000000,
            "consent": True,
        },
        timeout=15,
    )

    if response.status_code not in (200, 201):
        print(f"\nFailed to create lead: {name}")
        print("HTTP status:", response.status_code)
        print("Response body:", response.text)
        response.raise_for_status()

    body = response.json()

    if body.get("duplicate"):
        raise RuntimeError(
            f"Duplicate phone detected for test lead: {name}"
        )

    lead = body.get("lead")
    if not lead or not lead.get("id"):
        raise RuntimeError(
            f"Unexpected lead creation response: {body}"
        )

    print(f"Created test lead: {lead['id']} ({name})")
    return lead["id"]


def attempt_booking(lead_id: str) -> dict:
    """Attempt to book the same slot concurrently."""
    payload = {
        "lead_id": lead_id,
        "project": PROJECT,
        "visit_date": VISIT_DATE,
        "slot_time": SLOT_TIME,
    }

    # Wait until both workers are ready to send their requests.
    barrier.wait(timeout=15)

    response = requests.post(
        f"{BASE_URL}/api/visits/book",
        json=payload,
        timeout=30,
    )

    try:
        body = response.json()
    except ValueError:
        body = {"raw_response": response.text}

    return {
        "lead_id": lead_id,
        "status_code": response.status_code,
        "body": body,
    }


def verify_saved_booking() -> int:
    """Count active bookings for this test project and slot."""
    response = requests.get(
        f"{BASE_URL}/api/visits",
        timeout=15,
    )
    response.raise_for_status()

    body = response.json()
    visits = body.get("visits", [])

    expected_visit_time = f"{VISIT_DATE}T{SLOT_TIME}:00"

    matching_visits = [
        visit
        for visit in visits
        if visit.get("project") == PROJECT
        and visit.get("visit_time") == expected_visit_time
        and visit.get("visit_status") == "Booked"
    ]

    return len(matching_visits)


def main():
    # 1. Confirm the API is running.
    try:
        health = requests.get(
            f"{BASE_URL}/health",
            timeout=5,
        )
        health.raise_for_status()
    except requests.RequestException as exc:
        raise SystemExit(
            f"Cannot reach the API at {BASE_URL}. "
            "Start Uvicorn and try again.\n"
            f"Details: {exc}"
        )

    # 2. Generate a unique test project and 10-digit phone numbers.
    suffix = uuid.uuid4().int % 100_000_000

    phone_a = f"7{suffix:08d}1"
    phone_b = f"8{suffix:08d}2"

    print("=" * 55)
    print("ESTATEMATE AI - CONCURRENT BOOKING TEST")
    print("=" * 55)
    print(f"Project: {PROJECT}")
    print(f"Date: {VISIT_DATE}")
    print(f"Slot: {SLOT_TIME}")
    print(f"Phone A: {phone_a}")
    print(f"Phone B: {phone_b}")

    # 3. Create two different leads in the same project.
    lead_ids = [
        create_test_lead("Concurrency Test A", phone_a),
        create_test_lead("Concurrency Test B", phone_b),
    ]

    print(f"\nLead IDs: {lead_ids}")
    print("\nSubmitting both booking requests concurrently...")

    # 4. Send the booking requests using two worker threads.
    try:
        with concurrent.futures.ThreadPoolExecutor(
            max_workers=2
        ) as executor:
            futures = [
                executor.submit(attempt_booking, lead_id)
                for lead_id in lead_ids
            ]

            results = [
                future.result()
                for future in futures
            ]
    except Exception:
        # Avoid leaving a worker stuck at the barrier after a failure.
        barrier.abort()
        raise

    # 5. Print both responses.
    for result in results:
        print("\n" + "-" * 40)
        print(f"Lead ID: {result['lead_id']}")
        print(f"HTTP status: {result['status_code']}")
        print(f"Response: {result['body']}")

    codes = sorted(
        result["status_code"]
        for result in results
    )

    # 6. Expect exactly one successful booking and one conflict.
    if codes != [201, 409]:
        raise AssertionError(
            "Concurrency test failed. "
            f"Expected status codes [201, 409], got {codes}. "
            "Inspect the responses and API server logs."
        )

    conflict_result = next(
        result for result in results
        if result["status_code"] == 409
    )

    print("\nConflict response:", conflict_result["body"])

    # 7. Confirm that exactly one matching booking was persisted.
    saved_count = verify_saved_booking()

    if saved_count != 1:
        raise AssertionError(
            "Database verification failed. "
            f"Expected one active booking, found {saved_count}."
        )

    print("\n" + "=" * 55)
    print("PASS: Exactly one booking returned HTTP 201.")
    print("PASS: The competing booking returned HTTP 409.")
    print("PASS: Exactly one matching active booking is saved.")
    print("=" * 55)


if __name__ == "__main__":
    main()
