
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import get_db
from models import HandoffRequest
from schemas.handoff import HandoffResponse, HandoffUpdate


router = APIRouter(
    prefix="/api/handoffs",
    tags=["Handoffs"],
)


HandoffStatus = Literal[
    "pending",
    "in_progress",
    "resolved",
    "cancelled",
]


@router.get("", response_model=list[HandoffResponse])
def list_handoffs(
    status: HandoffStatus | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """List handoff requests, optionally filtered by status."""

    statement = select(HandoffRequest)

    if status is not None:
        statement = statement.where(HandoffRequest.status == status)

    statement = statement.order_by(HandoffRequest.created_at.desc())

    return db.scalars(statement).all()


@router.get("/{handoff_id}", response_model=HandoffResponse)
def get_handoff(
    handoff_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve one handoff request by ID."""

    handoff = db.get(HandoffRequest, handoff_id)

    if handoff is None:
        raise HTTPException(
            status_code=404,
            detail="Handoff request not found.",
        )

    return handoff


@router.patch("/{handoff_id}", response_model=HandoffResponse)
def update_handoff(
    handoff_id: str,
    payload: HandoffUpdate,
    db: Session = Depends(get_db),
):
    """Update the assigned sales executive or handoff status."""

    handoff = db.get(HandoffRequest, handoff_id)

    if handoff is None:
        raise HTTPException(
            status_code=404,
            detail="Handoff request not found.",
        )

    changes = payload.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update.",
        )

    if "assigned_to" in changes:
        assigned_to = changes["assigned_to"]

        if assigned_to is not None:
            assigned_to = assigned_to.strip()

            if not assigned_to:
                raise HTTPException(
                    status_code=422,
                    detail="assigned_to cannot be empty.",
                )

        handoff.assigned_to = assigned_to

        # Assigning a pending request moves it into progress.
        if assigned_to and handoff.status == "pending":
            handoff.status = "in_progress"

    if "status" in changes:
        handoff.status = changes["status"]

    if handoff.status == "resolved":
        if handoff.resolved_at is None:
            handoff.resolved_at = datetime.now(timezone.utc)
    else:
        handoff.resolved_at = None

    handoff.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(handoff)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update the handoff request.",
        )

    return handoff
