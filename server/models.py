
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


# ============================================================
# LEAD MODEL
# ============================================================

class Lead(Base):
    __tablename__ = "leads"

    __table_args__ = (
        UniqueConstraint("phone", name="uq_leads_phone"),
        CheckConstraint(
            "budget IS NULL OR budget > 0",
            name="ck_leads_budget_positive",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(30),
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    phone: Mapped[str] = mapped_column(
        String(15),
        nullable=False,
    )

    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    project: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    project_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    bhk: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    budget: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="New",
    )

    visit_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="Not booked",
    )

    visit_time: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # ========================================================
    # NEW: FIRST RESPONSE TRACKING
    # ========================================================

    # Time when a salesperson first actually contacts the lead.
    # NULL means no first response has been recorded.
    first_response_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # ========================================================
    # NEW: SITE VISIT OUTCOME TRACKING
    # ========================================================

    # Supported values: attended, cancelled, no_show.
    # NULL means the outcome has not been verified or recorded.
    visit_outcome: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    # Time when the visit outcome was recorded.
    visit_outcome_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    assigned_to: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    consent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )


# ============================================================
# HANDOFF REQUEST MODEL
# ============================================================

class HandoffRequest(Base):
    __tablename__ = "handoff_requests"

    __table_args__ = (
        CheckConstraint(
            "status IN "
            "('pending', 'in_progress', 'resolved', 'cancelled')",
            name="ck_handoff_requests_status",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    lead_id: Mapped[str | None] = mapped_column(
        String(30),
        ForeignKey("leads.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    reason: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="buyer_requested_human",
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )

    consent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    buyer_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    buyer_phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    project: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    assigned_to: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


# ============================================================
# USER MODEL
# ============================================================

class User(Base):
    """
    Application account for EstateMate AI.

    Roles:
      - admin: manages accounts and all handoff requests.
      - sales: accesses handoffs assigned to their username.
    """

    __tablename__ = "users"

    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'sales')",
            name="ck_users_role",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="sales",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ============================================================
# PROJECT MODEL
# ============================================================

class Project(Base):
    """
    Real estate project information.

    Only projects marked 'verified' should be recommended
    to buyers. Populate details from approved sources.
    """

    __tablename__ = "projects"

    __table_args__ = (
        CheckConstraint(
            "verification_status IN "
            "('pending', 'verified', 'rejected')",
            name="ck_projects_verification_status",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Ahmedabad",
        index=True,
    )

    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Gujarat",
    )

    address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    amenities: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    rera_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    possession_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    verification_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )

    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ============================================================
# PROPERTY / APARTMENT MODEL
# ============================================================

class Property(Base):
    """
    Individual apartment or unit within a real estate project.

    Each unit belongs to a project. Only verified, available
    units in verified projects should appear in recommendations.
    """

    __tablename__ = "properties"

    __table_args__ = (
        CheckConstraint(
            "price_inr > 0",
            name="ck_properties_price_positive",
        ),
        CheckConstraint(
            "bhk IN ('1 BHK', '2 BHK', '3 BHK', '4 BHK')",
            name="ck_properties_bhk",
        ),
        CheckConstraint(
            "availability IN "
            "('available', 'reserved', 'sold', 'unavailable')",
            name="ck_properties_availability",
        ),
        CheckConstraint(
            "verification_status IN "
            "('pending', 'verified', 'rejected')",
            name="ck_properties_verification_status",
        ),
        CheckConstraint(
            "area_sqft IS NULL OR area_sqft > 0",
            name="ck_properties_area_positive",
        ),
        UniqueConstraint(
            "project_id",
            "unit_number",
            name="uq_properties_project_unit",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    unit_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    bhk: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    price_inr: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    area_sqft: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    floor_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    availability: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="available",
        index=True,
    )

    verification_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )

    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
