
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.visit import SiteVisitCreate
from services.visit_service import (
    get_available_slots,
    book_site_visit as book_visit_service,
    get_all_visits,
)

router = APIRouter(
    prefix="/api/visits",
    tags=["Site Visits"],
)


@router.get(
    "/slots",
    status_code=status.HTTP_200_OK,
    summary="Get available site-visit slots",
    description=(
        "Returns available appointment slots for a project "
        "on the selected date."
    ),
)
def available_slots(
    project: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="Project name, for example Project 1",
    ),
    visit_date: date = Query(
        ...,
        description="Visit date in YYYY-MM-DD format",
    ),
    db: Session = Depends(get_db),
):
    return get_available_slots(
        project=project,
        visit_date=visit_date,
        db=db,
    )


@router.post(
    "/book",
    status_code=status.HTTP_201_CREATED,
    summary="Book a site visit",
    description=(
        "Books an available appointment slot for an existing lead."
    ),
)
def create_visit(
    payload: SiteVisitCreate,
    db: Session = Depends(get_db),
):
    return book_visit_service(payload, db)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    summary="List site visits",
    description=(
        "Returns leads with booked or completed site visits."
    ),
)
def list_visits(db: Session = Depends(get_db)):
    return get_all_visits(db)
