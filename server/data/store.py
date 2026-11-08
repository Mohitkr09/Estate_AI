
import re
from threading import Lock

booking_lock = Lock()


def normalize_phone(phone: str) -> str:
    return re.sub(r"\D", "", phone or "")


def normalize_project(project: str) -> str:
    return " ".join((project or "").strip().casefold().split())


def public_lead(lead) -> dict:
    """Return a lead without its phone number."""
    return {
        "id": lead.id,
        "name": lead.name,
        "source": lead.source,
        "project": lead.project,
        "bhk": lead.bhk,
        "budget": lead.budget,
        "status": lead.status,
        "visit_status": lead.visit_status,
        "visit_time": (
            lead.visit_time.isoformat()
            if lead.visit_time else None
        ),
        "assigned_to": lead.assigned_to,
        "consent": lead.consent,
        "created_at": lead.created_at.isoformat(),
    }


def generate_lead_id(db) -> str:
    """Generate the next ID while holding the booking lock."""
    from sqlalchemy import select

    numeric_ids = []
    ids = db.scalars(select(__import__(
        "models"
    ).Lead.id)).all()

    for lead_id in ids:
        if (
            isinstance(lead_id, str)
            and lead_id.startswith("LD-")
            and lead_id[3:].isdigit()
        ):
            numeric_ids.append(int(lead_id[3:]))

    return f"LD-{max(numeric_ids, default=58224) + 1}"
