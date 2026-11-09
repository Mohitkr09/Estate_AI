
from typing import Optional
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from database import get_db
from schemas.lead import LeadCreate
from services.lead_service import create_lead as create_lead_service
from data.store import booking_lock


router = APIRouter(
    prefix="/api/public/enquiries",
    tags=["Public Enquiries"],
)

# Basic per-process rate limit. For multiple server workers,
# use a shared limiter such as Redis in production.
_request_lock = Lock()
_request_counts = {}
MAX_REQUESTS = 5
WINDOW_SECONDS = 60


class PublicEnquiry(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=25)
    source: str = Field(default="Property Website", min_length=2, max_length=50)
    project: str = Field(min_length=1, max_length=100)
    bhk: Optional[str] = Field(default=None, max_length=20)
    budget: Optional[float] = Field(default=None, gt=0)
    consent: bool = False

    email: EmailStr
    message: str = Field(default="", max_length=2000)
    property_id: Optional[str] = Field(default=None, max_length=100)

    @field_validator("name", "source", "project")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        value = value.strip()
        digits = "".join(ch for ch in value if ch.isdigit())

        if not 7 <= len(digits) <= 15:
            raise ValueError(
                "Phone number must contain 7 to 15 digits."
            )

        return value


@router.post("", status_code=status.HTTP_201_CREATED)
def create_public_enquiry(
    payload: PublicEnquiry,
    request: Request,
    db: Session = Depends(get_db),
):
    # A basic IP-based limit; configure trusted proxy handling
    # correctly before relying on forwarded IP headers.
    client_ip = request.client.host if request.client else "unknown"

    import time
    now = time.time()

    with _request_lock:
        timestamps = _request_counts.get(client_ip, [])
        timestamps = [
            timestamp
            for timestamp in timestamps
            if now - timestamp < WINDOW_SECONDS
        ]

        if len(timestamps) >= MAX_REQUESTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many enquiries. Please try again later.",
            )

        timestamps.append(now)
        _request_counts[client_ip] = timestamps

    # Reuse the existing lead model and service. The current LeadCreate
    # schema does not persist email/message/property_id, so the lead record
    # stores the fields supported by your existing database model.
    lead_payload = LeadCreate(
        name=payload.name,
        phone=payload.phone,
        source=payload.source,
        project=payload.project,
        bhk=payload.bhk,
        budget=payload.budget,
        consent=payload.consent,
    )

    try:
        with booking_lock:
            result = create_lead_service(
                lead_payload,
                db,
                assigned_to=None,
            )

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database conflict occurred. Please try again.",
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save your enquiry at this time.",
        )

    if result.get("error"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result["error"],
        )

    if result.get("duplicate"):
        return {
            "duplicate": True,
            "message": (
                "An enquiry with this phone number already exists."
            ),
        }

    return {
        "duplicate": False,
        "message": "Your enquiry has been submitted successfully.",
    }
