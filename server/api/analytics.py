
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_db
from models import Lead
from api.auth import get_current_user


router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"],
)


def get_user_role(user) -> str:
    role = getattr(user, "role", "")
    if hasattr(role, "value"):
        role = role.value
    return str(role or "").strip().lower()


def get_lead_query(user):
    role = get_user_role(user)

    if role == "admin":
        return select(Lead)

    if role == "sales":
        username = str(
            getattr(user, "username", "") or ""
        ).strip()

        if not username:
            raise HTTPException(
                status_code=403,
                detail="Sales user has no assigned username.",
            )

        return select(Lead).where(
            Lead.assigned_to == username
        )

    raise HTTPException(
        status_code=403,
        detail="Not authorized to access analytics.",
    )


@router.get("/overview", status_code=200)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    base_query = get_lead_query(current_user)

    def count_leads(*conditions):
        query = select(func.count()).select_from(
            base_query.where(*conditions).subquery()
        )
        return db.scalar(query) or 0

    total_leads = count_leads()

    new_leads = count_leads(
        Lead.status == "New"
    )

    contacted_leads = count_leads(
        Lead.status == "Contacted"
    )

    qualified_leads = count_leads(
        Lead.status == "Qualified"
    )

    booked_visits = count_leads(
        Lead.visit_status == "Booked"
    )

    # Only explicitly recorded attendance counts as attended.
    attended_visits = count_leads(
        Lead.visit_outcome == "attended"
    )

    cancelled_visits = count_leads(
        Lead.visit_outcome == "cancelled"
    )

    no_show_visits = count_leads(
        Lead.visit_outcome == "no_show"
    )

    # Exclude cancelled visits and visits without a recorded outcome.
    visits_with_known_attendance = (
        attended_visits + no_show_visits
    )

    show_up_rate = (
        round(
            attended_visits
            / visits_with_known_attendance
            * 100,
            2,
        )
        if visits_with_known_attendance
        else None
    )

    # Calculate response time only for leads with valid timestamps.
    response_time_query = (
        base_query
        .where(
            Lead.first_response_at.is_not(None),
            Lead.created_at.is_not(None),
            Lead.first_response_at >= Lead.created_at,
        )
        .subquery()
    )

    response_stats = db.execute(
        select(
            func.count().label("tracked_leads"),
            func.avg(
                func.extract(
                    "epoch",
                    response_time_query.c.first_response_at
                    - response_time_query.c.created_at,
                )
            ).label("average_seconds"),
        ).select_from(response_time_query)
    ).one()

    tracked_response_leads = response_stats.tracked_leads or 0

    average_response_seconds = (
        round(float(response_stats.average_seconds), 2)
        if response_stats.average_seconds is not None
        else None
    )

    # This project does not yet have a verified conversion field.
    # Do not treat booked or attended visits as sales conversions.
    converted_leads = count_leads(
        Lead.status == "Converted"
    )

    conversion_rate = (
        round(converted_leads / total_leads * 100, 2)
        if total_leads
        else 0.0
    )

    return {
        "scope": get_user_role(current_user),

        "metrics": {
            "total_leads": total_leads,
            "new_leads": new_leads,
            "contacted_leads": contacted_leads,
            "qualified_leads": qualified_leads,

            "booked_visits": booked_visits,
            "completed_visits": attended_visits,
            "attended_visits": attended_visits,
            "cancelled_visits": cancelled_visits,
            "no_show_visits": no_show_visits,

            "visits_with_known_attendance":
                visits_with_known_attendance,

            "show_up_rate_percent": show_up_rate,

            "leads_with_recorded_response":
                tracked_response_leads,

            "average_response_time_seconds":
                average_response_seconds,

            "average_response_time_minutes": (
                round(average_response_seconds / 60, 2)
                if average_response_seconds is not None
                else None
            ),

            "converted_leads": converted_leads,
            "lead_conversion_rate_percent": conversion_rate,
        },

        "data_quality": {
            "response_time": (
                "available"
                if tracked_response_leads > 0
                else "awaiting_tracking"
            ),
            "show_up_rate": (
                "available"
                if visits_with_known_attendance > 0
                else "awaiting_tracking"
            ),
            "conversion_rate": (
                "available"
                if converted_leads > 0
                else "no_recorded_conversions"
            ),
            "cost_per_visit": (
                "not_tracked"
            ),
        },
    }
