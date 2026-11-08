
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from models import Lead
from api.auth import get_current_user


router = APIRouter(
    prefix="/api/tracking",
    tags=["Lead and Visit Tracking"],
)

ALLOWED_OUTCOMES = {"attended", "cancelled", "no_show"}

def normalize_role(user) -> str:
    role = getattr(user, "role", "")
    if hasattr(role, "value"):
        role = role.value
    return str(role or "").strip().lower()


def get_accessible_lead(lead_id: str, db: Session, user) -> Lead:
    lead = db.get(Lead, lead_id)

    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found.")

    role = normalize_role(user)

    if role == "admin":
        return lead

    if role == "sales":
        username = str(getattr(user, "username", "") or "").strip()

        if not username or lead.assigned_to != username:
            raise HTTPException(
                status_code=403,
                detail="You cannot update this lead.",
            )
        return lead

    raise HTTPException(
        status_code=403,
        detail="You are not authorized to update tracking data.",
    )


class VisitOutcomeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    outcome: str


@router.patch(
    "/leads/{lead_id}/first-response",
    summary="Record a lead's first actual response",
)
def record_first_response(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    lead = get_accessible_lead(lead_id, db, current_user)

    if lead.first_response_at is None:
        lead.first_response_at = datetime.now()

        if lead.status == "New":
            lead.status = "Contacted"

        try:
            db.commit()
            db.refresh(lead)
        except Exception:
            db.rollback()
            raise

    response_seconds = max(
        0,
        int((lead.first_response_at - lead.created_at).total_seconds()),
    )

    return {
        "message": "First response recorded.",
        "lead_id": lead.id,
        "first_response_at": lead.first_response_at,
        "response_time_seconds": response_seconds,
    }


@router.patch(
    "/leads/{lead_id}/visit-outcome",
    summary="Record the actual site-visit outcome",
)
def record_visit_outcome(
    lead_id: str,
    payload: VisitOutcomeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    lead = get_accessible_lead(lead_id, db, current_user)

    outcome = payload.outcome.strip().lower()

    if outcome not in ALLOWED_OUTCOMES:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Invalid visit outcome.",
                "allowed_values": sorted(ALLOWED_OUTCOMES),
            },
        )

    if lead.visit_time is None or lead.visit_status != "Booked":
        raise HTTPException(
            status_code=409,
            detail="Only a lead with a currently booked visit can receive an outcome.",
        )

    lead.visit_outcome = outcome
    lead.visit_outcome_at = datetime.now()

    if outcome == "attended":
        lead.visit_status = "Visited"
        lead.status = "Visited"
    elif outcome == "cancelled":
        lead.visit_status = "Cancelled"
    else:
        lead.visit_status = "No-show"

    try:
        db.commit()
        db.refresh(lead)
    except Exception:
        db.rollback()
        raise

    return {
        "message": "Visit outcome recorded.",
        "lead_id": lead.id,
        "visit_outcome": lead.visit_outcome,
        "visit_outcome_at": lead.visit_outcome_at,
        "visit_status": lead.visit_status,
    }
