
import os

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Project, Property

router = APIRouter(
    prefix="/api/dev/properties",
    tags=["Development Property Preview"],
)


def require_development():
    environment = os.getenv("APP_ENV", "development").lower()

    if environment != "development":
        raise HTTPException(
            status_code=404,
            detail="Development preview is disabled.",
        )


@router.get("")
def get_development_properties(
    bhk: str | None = Query(default=None),
    location: str | None = Query(default=None),
    min_budget_inr: int | None = Query(default=None, gt=0),
    max_budget_inr: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    _development=Depends(require_development),
):
    allowed_bhk = {
        "1 BHK",
        "2 BHK",
        "3 BHK",
        "4 BHK",
    }

    if bhk and bhk not in allowed_bhk:
        raise HTTPException(
            status_code=422,
            detail="Invalid BHK configuration.",
        )

    if (
        min_budget_inr is not None
        and max_budget_inr is not None
        and min_budget_inr > max_budget_inr
    ):
        raise HTTPException(
            status_code=422,
            detail="Minimum budget cannot exceed maximum budget.",
        )

    query = (
        select(Property, Project)
        .join(Project, Property.project_id == Project.id)
        .where(
            Project.name.like("EstateMate DEV Sample%"),
            Property.availability == "available",
        )
    )

    if bhk:
        query = query.where(Property.bhk == bhk)

    if location and location.strip():
        query = query.where(
            Project.city.ilike(f"%{location.strip()}%")
        )

    if min_budget_inr is not None:
        query = query.where(Property.price_inr >= min_budget_inr)

    if max_budget_inr is not None:
        query = query.where(Property.price_inr <= max_budget_inr)

    rows = db.execute(
        query.order_by(Property.price_inr.asc())
    ).all()

    return [
        {
            "property_id": unit.id,
            "project_id": project.id,
            "project_name": project.name,
            "bhk": unit.bhk,
            "price_inr": unit.price_inr,
            "unit_number": unit.unit_number,
            "location": project.city,
            "state": project.state,
            "address": project.address,
            "amenities": project.amenities or [],
            "availability": unit.availability,
            "possession_date": (
                project.possession_date.isoformat()
                if project.possession_date
                else None
            ),
            "rera_number": project.rera_number,
            "area_sqft": unit.area_sqft,
            "floor_number": unit.floor_number,
            "verification_status": unit.verification_status,
            "project_verification_status": (
                project.verification_status
            ),
            "is_development_sample": True,
        }
        for unit, project in rows
    ]
