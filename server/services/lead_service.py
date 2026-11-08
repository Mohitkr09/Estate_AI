
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from models import Lead
from data.store import (
    normalize_phone,
    normalize_project,
    public_lead,
    generate_lead_id,
)


ALLOWED_LEAD_STATUSES = {
    "New",
    "Contacted",
    "Qualified",
    "Visited",
}

MIN_PHONE_DIGITS = 7
MAX_PHONE_DIGITS = 15


# ---------------------------------------------------------
# VALIDATION HELPERS
# ---------------------------------------------------------

def _normalize_and_validate_phone(phone: str) -> str:
    """Normalize and validate a phone number."""
    normalized = normalize_phone(phone or "")

    if not MIN_PHONE_DIGITS <= len(normalized) <= MAX_PHONE_DIGITS:
        raise ValueError(
            "Please provide a valid phone number containing "
            "7 to 15 digits."
        )

    return normalized


def _clean_required_text(value: Optional[str], field_name: str) -> str:
    """Validate and clean a required text field."""
    cleaned = (value or "").strip()

    if not cleaned:
        raise ValueError(f"{field_name} cannot be empty.")

    return cleaned


def _clean_optional_text(value: Optional[str]) -> Optional[str]:
    """Trim optional text and convert empty strings to None."""
    cleaned = (value or "").strip()
    return cleaned or None


def _validate_payload(payload):
    """
    Validate and normalize lead data.

    Returns a dictionary containing normalized values.
    """
    phone = _normalize_and_validate_phone(payload.phone)
    name = _clean_required_text(payload.name, "Name")
    source = _clean_required_text(payload.source, "Lead source")
    project = _clean_required_text(payload.project, "Project")

    bhk = _clean_optional_text(payload.bhk)

    budget = payload.budget

    if budget is not None and budget < 0:
        raise ValueError("Budget cannot be negative.")

    return {
        "phone": phone,
        "name": name,
        "source": source,
        "project": project,
        "project_key": normalize_project(project),
        "bhk": bhk,
        "budget": budget,
        "consent": bool(payload.consent),
    }


def _find_lead_by_phone(
    db: Session,
    phone: str,
    exclude_lead_id: Optional[str] = None,
):
    """Find a lead by normalized phone, optionally excluding one ID."""
    query = select(Lead).where(Lead.phone == phone)

    if exclude_lead_id is not None:
        query = query.where(Lead.id != exclude_lead_id)

    return db.scalar(query)


def _duplicate_response(existing: Lead) -> dict:
    """Return a consistent duplicate-lead response."""
    return {
        "duplicate": True,
        "message": "A lead with this phone number already exists.",
        "existing_lead": public_lead(existing),
    }


# ---------------------------------------------------------
# READ LEADS
# ---------------------------------------------------------

def get_all_leads(db: Session) -> dict:
    """Return all leads, newest first."""
    leads = db.scalars(
        select(Lead).order_by(Lead.created_at.desc())
    ).all()

    return {
        "total": len(leads),
        "leads": [public_lead(lead) for lead in leads],
    }


def get_lead_by_id(lead_id: str, db: Session):
    """Return a public lead dictionary or None."""
    lead = db.get(Lead, lead_id)
    return public_lead(lead) if lead else None


# ---------------------------------------------------------
# CREATE LEAD
# ---------------------------------------------------------

def create_lead(payload, db: Session) -> dict:
    """
    Create a lead with duplicate-phone detection.

    A duplicate returns the existing lead instead of creating
    another record.

    Important: reliable concurrent duplicate prevention also
    requires a database UNIQUE constraint on the normalized phone.
    """
    try:
        data = _validate_payload(payload)
    except ValueError as exc:
        return {
            "duplicate": False,
            "error": str(exc),
        }

    existing = _find_lead_by_phone(db, data["phone"])

    if existing:
        return _duplicate_response(existing)

    lead = Lead(
        id=generate_lead_id(db),
        name=data["name"],
        phone=data["phone"],
        source=data["source"],
        project=data["project"],
        project_key=data["project_key"],
        bhk=data["bhk"],
        budget=data["budget"],
        status="New",
        visit_status="Not booked",
        visit_time=None,
        assigned_to=None,
        consent=data["consent"],
        created_at=datetime.now(),
    )

    try:
        db.add(lead)
        db.commit()
        db.refresh(lead)

        return {
            "duplicate": False,
            "message": "Lead created successfully.",
            "lead": public_lead(lead),
        }

    except IntegrityError:
        db.rollback()

        # A concurrent request may have inserted this phone number.
        existing = _find_lead_by_phone(db, data["phone"])

        if existing:
            return _duplicate_response(existing)

        # The integrity failure may have another cause, such as
        # a different unique constraint or a database constraint.
        raise

    except SQLAlchemyError:
        db.rollback()
        raise


# ---------------------------------------------------------
# UPDATE LEAD
# ---------------------------------------------------------

def update_lead(lead_id: str, payload, db: Session):
    """Update an existing lead without permitting duplicate phones."""
    lead = db.get(Lead, lead_id)

    if not lead:
        return None

    try:
        data = _validate_payload(payload)
    except ValueError as exc:
        return {"error": str(exc)}

    existing = _find_lead_by_phone(
        db,
        data["phone"],
        exclude_lead_id=lead_id,
    )

    if existing:
        return {
            "error": "Another lead already uses this phone number.",
            "existing_lead": public_lead(existing),
        }

    lead.name = data["name"]
    lead.phone = data["phone"]
    lead.source = data["source"]
    lead.project = data["project"]
    lead.project_key = data["project_key"]
    lead.bhk = data["bhk"]
    lead.budget = data["budget"]
    lead.consent = data["consent"]

    try:
        db.commit()
        db.refresh(lead)

        return {
            "message": "Lead updated successfully.",
            "lead": public_lead(lead),
        }

    except IntegrityError:
        db.rollback()

        existing = _find_lead_by_phone(
            db,
            data["phone"],
            exclude_lead_id=lead_id,
        )

        if existing:
            return {
                "error": "Another lead already uses this phone number.",
                "existing_lead": public_lead(existing),
            }

        return {
            "error": (
                "Could not update the lead because of a database conflict."
            )
        }

    except SQLAlchemyError:
        db.rollback()
        raise


# ---------------------------------------------------------
# UPDATE LEAD STATUS
# ---------------------------------------------------------

def update_lead_status(
    lead_id: str,
    status: str,
    db: Session,
):
    """Update a lead's CRM status."""
    normalized_status = (status or "").strip()

    if normalized_status not in ALLOWED_LEAD_STATUSES:
        return {
            "error": (
                "Invalid lead status. Allowed statuses: "
                + ", ".join(sorted(ALLOWED_LEAD_STATUSES))
                + "."
            )
        }

    lead = db.get(Lead, lead_id)

    if not lead:
        return None

    lead.status = normalized_status

    if normalized_status == "Visited":
        lead.visit_status = "Visited"

    try:
        db.commit()
        db.refresh(lead)

        return {
            "message": "Lead status updated successfully.",
            "lead": public_lead(lead),
        }

    except SQLAlchemyError:
        db.rollback()
        raise

from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from models import Lead
from data.store import (
    normalize_phone,
    normalize_project,
    public_lead,
    generate_lead_id,
)


ALLOWED_LEAD_STATUSES = {
    "New",
    "Contacted",
    "Qualified",
    "Visited",
}

MIN_PHONE_DIGITS = 7
MAX_PHONE_DIGITS = 15


# ============================================================
# VALIDATION HELPERS
# ============================================================

def _normalize_and_validate_phone(phone: str) -> str:
    """Normalize and validate a phone number."""
    normalized = normalize_phone(phone or "")

    if not MIN_PHONE_DIGITS <= len(normalized) <= MAX_PHONE_DIGITS:
        raise ValueError(
            "Please provide a valid phone number containing "
            "7 to 15 digits."
        )

    return normalized


def _required_text(value, field_name: str) -> str:
    """Validate a required text value."""
    cleaned = (value or "").strip()

    if not cleaned:
        raise ValueError(f"{field_name} cannot be empty.")

    return cleaned


def _optional_text(value) -> Optional[str]:
    """Normalize optional text."""
    cleaned = (value or "").strip()
    return cleaned or None


def _validate_payload(payload) -> dict:
    """Validate and normalize lead creation/update fields."""
    name = _required_text(payload.name, "Name")
    phone = _normalize_and_validate_phone(payload.phone)
    source = _required_text(payload.source, "Lead source")
    project = _required_text(payload.project, "Project")

    budget = payload.budget

    if budget is not None and budget <= 0:
        raise ValueError("Budget must be greater than zero.")

    bhk = _optional_text(payload.bhk)

    if len(name) > 100:
        raise ValueError("Name cannot exceed 100 characters.")

    if len(phone) > 15:
        raise ValueError("Phone number cannot exceed 15 digits.")

    if len(source) > 50:
        raise ValueError("Lead source cannot exceed 50 characters.")

    if len(project) > 100:
        raise ValueError("Project cannot exceed 100 characters.")

    if bhk and len(bhk) > 20:
        raise ValueError("BHK value cannot exceed 20 characters.")

    return {
        "name": name,
        "phone": phone,
        "source": source,
        "project": project,
        "project_key": normalize_project(project),
        "bhk": bhk,
        "budget": budget,
        "consent": bool(payload.consent),
    }


def _find_lead_by_phone(
    db: Session,
    phone: str,
    exclude_lead_id: Optional[str] = None,
):
    """Find a lead by normalized phone number."""
    query = select(Lead).where(Lead.phone == phone)

    if exclude_lead_id is not None:
        query = query.where(Lead.id != exclude_lead_id)

    return db.scalar(query)


def _duplicate_response(existing: Lead) -> dict:
    """Return the existing lead when a duplicate is detected."""
    return {
        "duplicate": True,
        "message": "A lead with this phone number already exists.",
        "existing_lead": public_lead(existing),
    }


# ============================================================
# GET LEADS
# ============================================================

def get_all_leads(
    db: Session,
    assigned_to: Optional[str] = None,
) -> dict:
    """
    Return leads, newest first.

    If assigned_to is provided, return only leads assigned
    to that salesperson.
    """
    query = select(Lead)

    if assigned_to is not None:
        query = query.where(Lead.assigned_to == assigned_to)

    leads = db.scalars(
        query.order_by(Lead.created_at.desc())
    ).all()

    return {
        "total": len(leads),
        "leads": [public_lead(lead) for lead in leads],
    }


def get_lead_by_id(lead_id: str, db: Session):
    """Return a public lead dictionary or None."""
    lead = db.get(Lead, lead_id)
    return public_lead(lead) if lead else None


# ============================================================
# CREATE LEAD
# ============================================================

def create_lead(
    payload,
    db: Session,
    assigned_to: Optional[str] = None,
) -> dict:
    """
    Create a lead.

    Existing normalized phone numbers return a duplicate response.
    Database uniqueness remains the final concurrency safeguard.
    """
    try:
        data = _validate_payload(payload)
    except ValueError as exc:
        return {
            "duplicate": False,
            "error": str(exc),
        }

    existing = _find_lead_by_phone(db, data["phone"])

    if existing:
        return _duplicate_response(existing)

    lead = Lead(
        id=generate_lead_id(db),
        name=data["name"],
        phone=data["phone"],
        source=data["source"],
        project=data["project"],
        project_key=data["project_key"],
        bhk=data["bhk"],
        budget=data["budget"],
        status="New",
        visit_status="Not booked",
        visit_time=None,
        assigned_to=assigned_to,
        consent=data["consent"],
        created_at=datetime.now(),
    )

    try:
        db.add(lead)
        db.commit()
        db.refresh(lead)

        return {
            "duplicate": False,
            "message": "Lead created successfully.",
            "lead": public_lead(lead),
        }

    except IntegrityError:
        db.rollback()

        # Another request may have inserted the same phone
        # after our initial lookup.
        existing = _find_lead_by_phone(db, data["phone"])

        if existing:
            return _duplicate_response(existing)

        # The conflict was not the phone constraint.
        raise

    except SQLAlchemyError:
        db.rollback()
        raise


# ============================================================
# UPDATE LEAD
# ============================================================

def update_lead(
    lead_id: str,
    payload,
    db: Session,
):
    """Update a lead without changing its salesperson assignment."""
    lead = db.get(Lead, lead_id)

    if not lead:
        return None

    try:
        data = _validate_payload(payload)
    except ValueError as exc:
        return {"error": str(exc)}

    existing = _find_lead_by_phone(
        db,
        data["phone"],
        exclude_lead_id=lead_id,
    )

    if existing:
        return {
            "error": "Another lead already uses this phone number.",
            "existing_lead": public_lead(existing),
        }

    lead.name = data["name"]
    lead.phone = data["phone"]
    lead.source = data["source"]
    lead.project = data["project"]
    lead.project_key = data["project_key"]
    lead.bhk = data["bhk"]
    lead.budget = data["budget"]
    lead.consent = data["consent"]

    try:
        db.commit()
        db.refresh(lead)

        return {
            "message": "Lead updated successfully.",
            "lead": public_lead(lead),
        }

    except IntegrityError:
        db.rollback()

        existing = _find_lead_by_phone(
            db,
            data["phone"],
            exclude_lead_id=lead_id,
        )

        if existing:
            return {
                "error": "Another lead already uses this phone number.",
                "existing_lead": public_lead(existing),
            }

        raise

    except SQLAlchemyError:
        db.rollback()
        raise


# ============================================================
# UPDATE LEAD STATUS
# ============================================================

def update_lead_status(
    lead_id: str,
    status: str,
    db: Session,
):
    """Update the CRM status of a lead."""
    normalized_status = (status or "").strip()

    if normalized_status not in ALLOWED_LEAD_STATUSES:
        return {
            "error": (
                "Invalid lead status. Allowed statuses: "
                + ", ".join(sorted(ALLOWED_LEAD_STATUSES))
                + "."
            )
        }

    lead = db.get(Lead, lead_id)

    if not lead:
        return None

    lead.status = normalized_status

    if normalized_status == "Visited":
        lead.visit_status = "Visited"

    try:
        db.commit()
        db.refresh(lead)

        return {
            "message": "Lead status updated successfully.",
            "lead": public_lead(lead),
        }

    except SQLAlchemyError:
        db.rollback()
        raise
