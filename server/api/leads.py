
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from schemas.lead import LeadCreate
from services.lead_service import (
    get_all_leads,
    get_lead_by_id,
    create_lead as create_lead_service,
    update_lead as update_lead_service,
    update_lead_status as update_lead_status_service,
)
from data.store import booking_lock
from api.auth import get_current_user


router = APIRouter(
    prefix="/api/leads",
    tags=["Leads"],
)


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class LeadStatusUpdate(BaseModel):
    status: Literal[
        "New",
        "Contacted",
        "Qualified",
        "Visited",
    ] = Field(
        ...,
        description="Allowed lead statuses",
    )


# ============================================================
# AUTHORIZATION HELPERS
# ============================================================

def _user_value(user, key: str, default=None):
    """Read a value from either a user object or a dictionary."""
    if isinstance(user, dict):
        return user.get(key, default)

    return getattr(user, key, default)


def _user_role(user) -> str:
    """Return a normalized role."""
    role = _user_value(user, "role", "")
    if hasattr(role, "value"):
        role = role.value

    return str(role or "").strip().lower()


def _username(user) -> str:
    """Return the authenticated username."""
    return str(_user_value(user, "username", "") or "").strip()


def _require_lead_access(lead: dict, user):
    """
    Admins can access all leads.
    Sales users can access only leads assigned to their username.
    """
    role = _user_role(user)

    if role == "admin":
        return

    if role != "sales":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access leads.",
        )

    username = _username(user)

    if not username or lead.get("assigned_to") != username:
        # Use 404 to avoid revealing whether another user's lead exists.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )


def _raise_database_conflict(db: Session):
    """Roll back a failed transaction and return a safe conflict error."""
    db.rollback()

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            "A database conflict occurred. The lead may already exist. "
            "Refresh the lead list and try again."
        ),
    )


def _raise_service_error(result):
    """Convert a service-layer validation error to HTTP 422."""
    if isinstance(result, dict) and result.get("error"):
        message = result["error"]

        if "already uses this phone number" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=message,
            )

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        )


# ============================================================
# LIST LEADS
# ============================================================

@router.get("", status_code=status.HTTP_200_OK)
def list_leads(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all leads for admins or assigned leads for sales users."""
    role = _user_role(current_user)

    if role == "admin":
        return get_all_leads(db)

    if role == "sales":
        username = _username(current_user)

        if not username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The authenticated user has no valid username.",
            )

        return get_all_leads(db, assigned_to=username)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not authorized to list leads.",
    )


# ============================================================
# GET LEAD BY ID
# ============================================================

@router.get("/{lead_id}", status_code=status.HTTP_200_OK)
def retrieve_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve a lead subject to role-based access."""
    lead = get_lead_by_id(lead_id, db)

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )

    _require_lead_access(lead, current_user)

    return lead


# ============================================================
# CREATE LEAD
# ============================================================

@router.post("", status_code=status.HTTP_201_CREATED)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Create a lead.

    Newly created leads submitted by sales users are assigned
    to that salesperson. Admin-created leads remain unassigned.
    Duplicate responses return HTTP 200 when the existing lead
    can safely be shown to the authenticated user.
    """
    role = _user_role(current_user)

    if role not in {"admin", "sales"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to create leads.",
        )

    assigned_to = None

    if role == "sales":
        assigned_to = _username(current_user)

        if not assigned_to:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The authenticated user has no valid username.",
            )

    try:
        with booking_lock:
            result = create_lead_service(
                payload,
                db,
                assigned_to=assigned_to,
            )

    except IntegrityError:
        _raise_database_conflict(db)

    if result.get("error"):
        _raise_service_error(result)

    if result.get("duplicate"):
        existing_lead = result.get("existing_lead") or {}

        # Do not disclose another salesperson's lead details.
        if role == "sales":
            if existing_lead.get("assigned_to") != assigned_to:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "A lead with this phone number already exists. "
                        "Contact an administrator to resolve the duplicate."
                    ),
                )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result,
        )

    return result


# ============================================================
# UPDATE LEAD
# ============================================================

@router.put("/{lead_id}", status_code=status.HTTP_200_OK)
def edit_lead(
    lead_id: str,
    payload: LeadCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a lead that the authenticated user is allowed to access."""
    existing_lead = get_lead_by_id(lead_id, db)

    if existing_lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )

    _require_lead_access(existing_lead, current_user)

    try:
        with booking_lock:
            result = update_lead_service(
                lead_id,
                payload,
                db,
            )

    except IntegrityError:
        _raise_database_conflict(db)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )

    _raise_service_error(result)

    return result


# ============================================================
# UPDATE LEAD STATUS
# ============================================================

@router.patch(
    "/{lead_id}/status",
    status_code=status.HTTP_200_OK,
)
def change_lead_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update the status of a lead the user is allowed to access."""
    existing_lead = get_lead_by_id(lead_id, db)

    if existing_lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )

    _require_lead_access(existing_lead, current_user)

    try:
        with booking_lock:
            result = update_lead_status_service(
                lead_id,
                payload.status,
                db,
            )

    except IntegrityError:
        _raise_database_conflict(db)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )

    _raise_service_error(result)

    return result
