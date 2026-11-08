
import json
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Project, Property


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/assistant",
    tags=["Property Recommendations"],
)

FACTS_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "project_facts.json"
)


class RecommendationRequest(BaseModel):
    bhk: Literal["2 BHK", "3 BHK"]
    budget_inr: int = Field(gt=0, le=1_000_000_000)
    location: str | None = Field(default=None, max_length=100)
    amenities: list[str] = Field(default_factory=list, max_length=20)


class PropertyMatch(BaseModel):
    property_id: str
    project_id: str
    project_name: str
    bhk: str
    price_inr: int
    unit_number: str
    location: str
    address: str | None
    amenities: list[str]
    availability: str
    possession_date: str | None
    rera_number: str | None
    area_sqft: int | None


class RecommendationResponse(BaseModel):
    bhk: str
    budget_inr: int
    overall_price_minimum_inr: int
    overall_price_maximum_inr: int
    budget_fits_overall_range: bool
    recommendation_status: str
    message: str
    requires_sales_confirmation: bool = True
    properties: list[PropertyMatch] = Field(default_factory=list)


def load_price_range() -> tuple[list[str], int, int]:
    try:
        with FACTS_PATH.open("r", encoding="utf-8") as file:
            facts = json.load(file)

        property_options = facts["property_options"]
        price_range = facts["overall_price_range"]

        minimum = int(price_range["minimum_inr"])
        maximum = int(price_range["maximum_inr"])

        if minimum <= 0 or maximum < minimum:
            raise ValueError("Invalid approved price range")

        return property_options, minimum, maximum

    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        logger.exception("Unable to load approved property facts")
        raise HTTPException(
            status_code=503,
            detail="Approved property information is temporarily unavailable.",
        ) from None


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    summary="Match buyer requirements to verified property listings",
)
def recommend_property(
    payload: RecommendationRequest,
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    property_options, minimum, maximum = load_price_range()

    if payload.bhk not in property_options:
        raise HTTPException(
            status_code=422,
            detail="That apartment type is not listed in the approved property facts.",
        )

    # Only verified projects and verified units can be recommended.
    query = (
        db.query(Property, Project)
        .join(Project, Property.project_id == Project.id)
        .filter(
            Property.bhk == payload.bhk,
            Property.price_inr <= payload.budget_inr,
            Property.availability == "available",
            Property.verification_status == "verified",
            Project.verification_status == "verified",
        )
    )

    if payload.location and payload.location.strip():
        query = query.filter(
            Project.city.ilike(f"%{payload.location.strip()}%")
        )

    rows = (
        query.order_by(Property.price_inr.asc())
        .limit(20)
        .all()
    )

    requested_amenities = {
        item.strip().casefold()
        for item in payload.amenities
        if item.strip()
    }

    matches: list[PropertyMatch] = []

    for unit, project in rows:
        verified_amenities = project.amenities or []

        # Amenity filters use only amenities recorded for the verified project.
        available_amenities = {
            item.casefold()
            for item in verified_amenities
            if isinstance(item, str)
        }

        if not requested_amenities.issubset(available_amenities):
            continue

        matches.append(
            PropertyMatch(
                property_id=unit.id,
                project_id=project.id,
                project_name=project.name,
                bhk=unit.bhk,
                price_inr=unit.price_inr,
                unit_number=unit.unit_number,
                location=project.city,
                address=project.address,
                amenities=verified_amenities,
                availability=unit.availability,
                possession_date=(
                    project.possession_date.isoformat()
                    if project.possession_date
                    else None
                ),
                rera_number=project.rera_number,
                area_sqft=unit.area_sqft,
            )
        )

    budget_fits = minimum <= payload.budget_inr <= maximum

    if matches:
        status = "matching_properties_found"
        message = (
            f"Found {len(matches)} verified {payload.bhk} listing(s) "
            f"priced within your budget of ₹{payload.budget_inr:,.0f}. "
            "Prices and availability should be reconfirmed by a sales executive."
        )
    elif payload.budget_inr < minimum:
        status = "below_overall_range"
        message = (
            f"Your budget of ₹{payload.budget_inr:,.0f} is below the "
            f"published overall range of ₹{minimum:,.0f}–₹{maximum:,.0f}. "
            "No verified matching listing was found. A sales executive "
            "can confirm whether other options are available."
        )
    elif payload.budget_inr > maximum:
        status = "no_verified_listing_match"
        message = (
            f"Your budget is above the published overall range of "
            f"₹{minimum:,.0f}–₹{maximum:,.0f}, but no verified listing "
            "matched all your requirements. A sales executive can help "
            "confirm available options."
        )
    else:
        status = "no_verified_listing_match"
        message = (
            f"Your budget falls within the published overall range of "
            f"₹{minimum:,.0f}–₹{maximum:,.0f}, but no verified listing "
            "matched all your requirements. This does not mean that no "
            "suitable property exists; a sales executive can confirm availability."
        )

    return RecommendationResponse(
        bhk=payload.bhk,
        budget_inr=payload.budget_inr,
        overall_price_minimum_inr=minimum,
        overall_price_maximum_inr=maximum,
        budget_fits_overall_range=budget_fits,
        recommendation_status=status,
        message=message,
        requires_sales_confirmation=True,
        properties=matches,
    )
