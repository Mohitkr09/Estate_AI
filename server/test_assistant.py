
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_assistant_rejects_empty_message():
    response = client.post(
        "/api/assistant/chat",
        json={"message": ""},
    )

    assert response.status_code == 422


def test_assistant_rejects_invalid_language():
    response = client.post(
        "/api/assistant/chat",
        json={
            "message": "Tell me about your properties",
            "language": "fr",
        },
    )

    assert response.status_code == 422


def test_assistant_returns_grounded_response():
    with patch(
        "api.assistant.generate_reply",
        return_value=(
            "We offer 2 and 3 BHK apartments.",
            False,
            None,
        ),
    ):
        response = client.post(
            "/api/assistant/chat",
            json={
                "message": "What apartment types are available?",
                "language": "en",
            },
        )

    assert response.status_code == 200

    data = response.json()
    assert data["reply"] == "We offer 2 and 3 BHK apartments."
    assert data["handoff_required"] is False
    assert data["handoff_reason"] is None
    assert data["language"] == "en"


def test_assistant_flags_human_handoff():
    with patch(
        "api.assistant.generate_reply",
        return_value=(
            "Please contact our sales team.",
            True,
            "buyer_requested_human",
        ),
    ):
        response = client.post(
            "/api/assistant/chat",
            json={
                "message": "I want to speak to a human",
                "language": "en",
            },
        )

    assert response.status_code == 200

    data = response.json()
    assert data["handoff_required"] is True
    assert data["handoff_reason"] == "buyer_requested_human"


def test_assistant_rejects_unknown_lead():
    response = client.post(
        "/api/assistant/chat",
        json={
            "message": "Tell me about your properties",
            "lead_id": "nonexistent-lead-id",
        },
    )

    assert response.status_code == 404
