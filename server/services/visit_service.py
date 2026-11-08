
from datetime import date, datetime, time

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models import Lead
from data.store import booking_lock, normalize_project
from schemas.visit import VISIT_SLOTS, SiteVisitCreate


BOOKING_CONSTRAINT = "uq_active_project_visit_time"


def parse_slot_time(slot_time: str) -> time:
    if slot_time not in VISIT_SLOTS:
        raise HTTPException(
            status_code=422,
            detail="Invalid appointment slot. Please select an available slot.",
        )
    return time.fromisoformat(slot_time)


def get_available_slots(
    project: str, visit_date: date, db: Session
) -> dict:
    project_key = normalize_project(project)

    if not project_key:
        raise HTTPException(
            status_code=422,
            detail="Project is required.",
        )

    if visit_date < date.today():
        raise HTTPException(
            status_code=422,
            detail="Cannot view slots for a past date.",
        )

    now = datetime.now()

    booked_times = set(
        db.scalars(
            select(Lead.visit_time).where(
                Lead.project_key == project_key,
                Lead.visit_status == "Booked",
                Lead.visit_time.is_not(None),
            )
        ).all()
    )

    available = []

    for slot in VISIT_SLOTS:
        slot_dt = datetime.combine(
            visit_date,
            time.fromisoformat(slot),
        )

        if slot_dt > now and slot_dt not in booked_times:
            available.append(slot)

    return {
        "project": project.strip(),
        "visit_date": visit_date.isoformat(),
        "available_slots": available,
    }


def book_site_visit(
    payload: SiteVisitCreate, db: Session
) -> dict:
    now = datetime.now()

    if payload.visit_date < date.today():
        raise HTTPException(
            status_code=422,
            detail="Cannot book a visit for a past date.",
        )

    selected_time = parse_slot_time(payload.slot_time)
    visit_datetime = datetime.combine(
        payload.visit_date,
        selected_time,
    )

    if visit_datetime <= now:
        raise HTTPException(
            status_code=422,
            detail="Please select a future appointment time.",
        )

    project_key = normalize_project(payload.project)

    if not project_key:
        raise HTTPException(
            status_code=422,
            detail="Project is required.",
        )

    # This lock coordinates requests only within this Python process.
    # PostgreSQL's unique index protects against cross-process conflicts.
    with booking_lock:
        lead = db.get(Lead, payload.lead_id)

        if lead is None:
            raise HTTPException(
                status_code=404,
                detail="Lead not found.",
            )

        if lead.project_key != project_key:
            raise HTTPException(
                status_code=422,
                detail="The selected project does not match this lead.",
            )

        if (
            lead.visit_status == "Booked"
            and lead.visit_time is not None
            and lead.visit_time > now
        ):
            raise HTTPException(
                status_code=409,
                detail="This lead already has a booked site visit.",
            )

        slot_owner = db.scalar(
            select(Lead).where(
                Lead.project_key == project_key,
                Lead.visit_time == visit_datetime,
                Lead.visit_status == "Booked",
                Lead.id != lead.id,
            )
        )

        if slot_owner is not None:
            raise HTTPException(
                status_code=409,
                detail="This appointment slot has already been booked.",
            )

        lead.visit_status = "Booked"
        lead.visit_time = visit_datetime

        if lead.status == "New":
            lead.status = "Contacted"

        try:
            db.commit()
            db.refresh(lead)

        except IntegrityError as exc:
            db.rollback()

            # Return 409 specifically for the PostgreSQL booking index.
            original_error = exc.orig
            diagnostics = getattr(original_error, "diag", None)
            constraint_name = getattr(
                diagnostics, "constraint_name", None
            )

            if constraint_name == BOOKING_CONSTRAINT:
                raise HTTPException(
                    status_code=409,
                    detail="This appointment slot has already been booked.",
                ) from exc

            # Do not disguise unrelated database integrity errors
            # as booking conflicts.
            raise

        except Exception:
            db.rollback()
            raise

        return {
            "message": "Site visit booked successfully.",
            "visit": {
                "lead_id": lead.id,
                "lead_name": lead.name,
                "project": lead.project,
                "visit_date": payload.visit_date.isoformat(),
                "slot_time": payload.slot_time,
                "visit_time": lead.visit_time.isoformat(),
                "visit_status": lead.visit_status,
            },
        }


def get_all_visits(db: Session) -> dict:
    leads = db.scalars(
        select(Lead)
        .where(Lead.visit_status.in_(["Booked", "Visited"]))
        .order_by(Lead.visit_time.asc())
    ).all()

    visits = [
        {
            "lead_id": lead.id,
            "lead_name": lead.name,
            "project": lead.project,
            "visit_status": lead.visit_status,
            "visit_time": (
                lead.visit_time.isoformat()
                if lead.visit_time
                else None
            ),
        }
        for lead in leads
    ]

    return {
        "total": len(visits),
        "visits": visits,
    }
