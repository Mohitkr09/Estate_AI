
from datetime import date

from pydantic import BaseModel, Field, field_validator


# Available appointment slots (24-hour format).
VISIT_SLOTS = [
    "10:00",
    "11:00",
    "12:00",
    "14:00",
    "15:00",
    "16:00",
]


class SiteVisitCreate(BaseModel):
    lead_id: str = Field(
        ...,
        min_length=1,
        max_length=30,
        description="ID of the existing lead",
        examples=["LD-58211"],
    )

    project: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Project associated with the lead",
        examples=["Project 2"],
    )

    visit_date: date = Field(
        ...,
        description="Appointment date in YYYY-MM-DD format",
        examples=["2026-11-03"],
    )

    slot_time: str = Field(
        ...,
        description="Selected appointment slot in HH:MM format",
        examples=["10:00"],
    )

    @field_validator("lead_id", "project")
    @classmethod
    def validate_non_empty_strings(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be empty.")

        return value

    @field_validator("slot_time")
    @classmethod
    def validate_slot(cls, value: str) -> str:
        value = value.strip()

        if value not in VISIT_SLOTS:
            raise ValueError(
                "Please select a valid appointment slot."
            )

        return value
