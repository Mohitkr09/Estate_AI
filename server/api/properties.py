
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies.auth import require_admin
from models import Project, Property, User


router = APIRouter(
    prefix="/api/properties",
    tags=["Property Management"],
)


# ============================================================
# PYDANTIC SCHEMAS
# ============================================================

VerificationStatus = Literal["pending", "verified", "rejected"]

AvailabilityStatus = Literal[
    "available",
    "reserved",
    "sold",
    "unavailable",
]

BHKType = Literal["1 BHK", "2 BHK", "3 BHK", "4 BHK"]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    address: str | None = Field(default=None, max_length=2000)
    description: str | None = Field(default=None, max_length=5000)
    amenities: list[str] = Field(default_factory=list, max_length=50)
    rera_number: str | None = Field(default=None, max_length=100)
    possession_date: date | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    state: str | None = Field(default=None, min_length=2, max_length=100)
    address: str | None = Field(default=None, max_length=2000)
    description: str | None = Field(default=None, max_length=5000)
    amenities: list[str] | None = Field(default=None, max_length=50)
    rera_number: str | None = Field(default=None, max_length=100)
    possession_date: date | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    city: str
    state: str
    address: str | None
    description: str | None
    amenities: list[str]
    rera_number: str | None
    possession_date: date | None
    verification_status: str
    verified_at: datetime | None
    created_at: datetime


class PropertyCreate(BaseModel):
    project_id: str = Field(min_length=1, max_length=36)
    unit_number: str = Field(min_length=1, max_length=50)
    bhk: BHKType
    price_inr: int = Field(gt=0, le=1_000_000_000)
    area_sqft: int | None = Field(default=None, gt=0, le=1_000_000)
    floor_number: int | None = Field(default=None, ge=0, le=300)
    availability: AvailabilityStatus = "available"


class PropertyUpdate(BaseModel):
    unit_number: str | None = Field(default=None, min_length=1, max_length=50)
    bhk: BHKType | None = None
    price_inr: int | None = Field(default=None, gt=0, le=1_000_000_000)
    area_sqft: int | None = Field(default=None, gt=0, le=1_000_000)
    floor_number: int | None = Field(default=None, ge=0, le=300)
    availability: AvailabilityStatus | None = None


class PropertyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    unit_number: str
    bhk: str
    price_inr: int
    area_sqft: int | None
    floor_number: int | None
    availability: str
    verification_status: str
    verified_at: datetime | None
    created_at: datetime


class VerificationRequest(BaseModel):
    verification_status: VerificationStatus


class PropertyListingResponse(BaseModel):
    property_id: str
    project_id: str
    project_name: str
    bhk: str
    price_inr: int
    unit_number: str
    location: str
    state: str
    address: str | None
    amenities: list[str]
    availability: str
    possession_date: date | None
    rera_number: str | None
    area_sqft: int | None
    floor_number: int | None


# ============================================================
# HELPERS
# ============================================================

def require_admin_user(
    current_user: User = Depends(require_admin),
) -> User:
    return current_user


def normalize_amenities(amenities: list[str]) -> list[str]:
    cleaned = []
    seen = set()

    for amenity in amenities:
        value = amenity.strip()

        if not value:
            continue

        if len(value) > 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Each amenity must be 100 characters or fewer.",
            )

        key = value.casefold()

        if key not in seen:
            seen.add(key)
            cleaned.append(value)

    return cleaned


def get_project_or_404(db: Session, project_id: str) -> Project:
    project = db.get(Project, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return project


def get_property_or_404(db: Session, property_id: str) -> Property:
    unit = db.get(Property, property_id)

    if unit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property listing not found.",
        )

    return unit


def clear_project_verification(project: Project) -> None:
    """Project edits require project re-verification."""
    project.verification_status = "pending"
    project.verified_at = None


def clear_property_verification(unit: Property) -> None:
    """Property edits require property re-verification."""
    unit.verification_status = "pending"
    unit.verified_at = None


# ============================================================
# ADMIN: CREATE PROJECT
# ============================================================

@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user),
):
    project = Project(
        name=payload.name.strip(),
        city=payload.city.strip(),
        state=payload.state.strip(),
        address=payload.address.strip() if payload.address else None,
        description=(
            payload.description.strip()
            if payload.description
            else None
        ),
        amenities=normalize_amenities(payload.amenities),
        rera_number=(
            payload.rera_number.strip()
            if payload.rera_number
            else None
        ),
        possession_date=payload.possession_date,
        verification_status="pending",
        verified_at=None,
    )

    db.add(project)

    try:
        db.commit()
        db.refresh(project)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create project due to a database constraint.",
        ) from None

    return project


# ============================================================
# ADMIN: UPDATE PROJECT
# ============================================================

@router.patch(
    "/projects/{project_id}",
    response_model=ProjectResponse,
)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user),
):
    project = get_project_or_404(db, project_id)
    changes = payload.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No project changes were supplied.",
        )

    for field, value in changes.items():
        if field in {"name", "city", "state"} and value is not None:
            value = value.strip()

        if field in {"address", "description", "rera_number"} and value:
            value = value.strip()

        if field == "amenities" and value is not None:
            value = normalize_amenities(value)

        setattr(project, field, value)

    clear_project_verification(project)

    try:
        db.commit()
        db.refresh(project)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not update project due to a database constraint.",
        ) from None

    return project


# ============================================================
# ADMIN: VERIFY OR REJECT PROJECT
# ============================================================

@router.patch(
    "/projects/{project_id}/verification",
    response_model=ProjectResponse,
)
def verify_project(
    project_id: str,
    payload: VerificationRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user),
):
    project = get_project_or_404(db, project_id)

    if payload.verification_status == "verified":
        project.verification_status = "verified"
        project.verified_at = datetime.now(timezone.utc)
    else:
        project.verification_status = payload.verification_status
        project.verified_at = None

    db.commit()
    db.refresh(project)

    return project


# ============================================================
# ADMIN: CREATE PROPERTY
# ============================================================

@router.post(
    "",
    response_model=PropertyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_property(
    payload: PropertyCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user),
):
    project = get_project_or_404(db, payload.project_id)

    unit = Property(
        project_id=project.id,
        unit_number=payload.unit_number.strip(),
        bhk=payload.bhk,
        price_inr=payload.price_inr,
        area_sqft=payload.area_sqft,
        floor_number=payload.floor_number,
        availability=payload.availability,
        verification_status="pending",
        verified_at=None,
    )

    db.add(unit)

    try:
        db.commit()
        db.refresh(unit)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This unit number already exists in the project.",
        ) from None

    return unit


# ============================================================
# ADMIN: UPDATE PROPERTY
# ============================================================

@router.patch(
    "/{property_id}",
    response_model=PropertyResponse,
)
def update_property(
    property_id: str,
    payload: PropertyUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user),
):
    unit = get_property_or_404(db, property_id)
    changes = payload.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No property changes were supplied.",
        )

    for field, value in changes.items():
        if field == "unit_number" and value is not None:
            value = value.strip()

        setattr(unit, field, value)

    clear_property_verification(unit)

    try:
        db.commit()
        db.refresh(unit)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The updated unit number conflicts with another unit.",
        ) from None

    return unit


# ============================================================
# ADMIN: VERIFY OR REJECT PROPERTY
# ============================================================

@router.patch(
    "/{property_id}/verification",
    response_model=PropertyResponse,
)
def verify_property(
    property_id: str,
    payload: VerificationRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user),
):
    unit = get_property_or_404(db, property_id)
    project = get_project_or_404(db, unit.project_id)

    if payload.verification_status == "verified":
        if project.verification_status != "verified":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Verify the project before verifying its apartment listings."
                ),
            )

        unit.verification_status = "verified"
        unit.verified_at = datetime.now(timezone.utc)
    else:
        unit.verification_status = payload.verification_status
        unit.verified_at = None

    db.commit()
    db.refresh(unit)

    return unit


# ============================================================
# ADMIN: LIST ALL PROJECTS INCLUDING UNVERIFIED PROJECTS
# ============================================================

@router.get(
    "/admin/projects",
    response_model=list[ProjectResponse],
)
def list_all_projects(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user),
):
    return list(
        db.scalars(
            select(Project).order_by(Project.created_at.desc())
        ).all()
    )


# ============================================================
# ADMIN: LIST ALL PROPERTIES INCLUDING UNVERIFIED PROPERTIES
# ============================================================

@router.get(
    "/admin/listings",
    response_model=list[PropertyResponse],
)
def list_all_properties(
    project_id: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_user),
):
    query = select(Property).order_by(Property.created_at.desc())

    if project_id:
        query = query.where(Property.project_id == project_id)

    return list(db.scalars(query).all())


# ============================================================
# PUBLIC: SEARCH VERIFIED AND AVAILABLE PROPERTIES
# ============================================================

@router.get(
    "",
    response_model=list[PropertyListingResponse],
)
def search_properties(
    bhk: BHKType | None = None,
    max_budget_inr: int | None = Query(default=None, gt=0),
    location: str | None = Query(default=None, max_length=100),
    availability: AvailabilityStatus = "available",
    amenities: list[str] = Query(default=[]),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    # Public endpoint: no login or JWT token required.
    # Pending and rejected projects/properties are never returned.
    query = (
        select(Property, Project)
        .join(Project, Property.project_id == Project.id)
        .where(
            Project.verification_status == "verified",
            Property.verification_status == "verified",
            Property.availability == "available",
        )
    )

    if bhk:
        query = query.where(Property.bhk == bhk)

    if max_budget_inr is not None:
        query = query.where(Property.price_inr <= max_budget_inr)

    if location and location.strip():
        query = query.where(
            Project.city.ilike(f"%{location.strip()}%")
        )

    rows = db.execute(
        query.order_by(Property.price_inr.asc()).limit(limit)
    ).all()

    requested_amenities = {
        item.strip().casefold()
        for item in amenities
        if item.strip()
    }

    results = []

    for unit, project in rows:
        project_amenities = project.amenities or []

        available_amenities = {
            item.casefold()
            for item in project_amenities
            if isinstance(item, str)
        }

        if not requested_amenities.issubset(available_amenities):
            continue

        results.append(
            PropertyListingResponse(
                property_id=unit.id,
                project_id=project.id,
                project_name=project.name,
                bhk=unit.bhk,
                price_inr=unit.price_inr,
                unit_number=unit.unit_number,
                location=project.city,
                state=project.state,
                address=project.address,
                amenities=project_amenities,
                availability=unit.availability,
                possession_date=project.possession_date,
                rera_number=project.rera_number,
                area_sqft=unit.area_sqft,
                floor_number=unit.floor_number,
            )
        )

    return results


# ============================================================
# PUBLIC: GET ONE VERIFIED PROPERTY
# ============================================================

@router.get(
    "/{property_id}",
    response_model=PropertyListingResponse,
)
def get_property_details(
    property_id: str,
    db: Session = Depends(get_db),
):
    # Public endpoint: no login or JWT token required.
    # Only verified projects and available, verified properties
    # can be retrieved through this endpoint.
    result = db.execute(
        select(Property, Project)
        .join(Project, Property.project_id == Project.id)
        .where(
            Property.id == property_id,
            Property.verification_status == "verified",
            Project.verification_status == "verified",
            Property.availability == "available",
        )
    ).first()

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or unavailable.",
        )

    unit, project = result

    return PropertyListingResponse(
        property_id=unit.id,
        project_id=project.id,
        project_name=project.name,
        bhk=unit.bhk,
        price_inr=unit.price_inr,
        unit_number=unit.unit_number,
        location=project.city,
        state=project.state,
        address=project.address,
        amenities=project.amenities or [],
        availability=unit.availability,
        possession_date=project.possession_date,
        rera_number=project.rera_number,
        area_sqft=unit.area_sqft,
        floor_number=unit.floor_number,
    )
