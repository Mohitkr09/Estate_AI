
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=25)
    source: str = Field(min_length=2, max_length=50)
    project: str = Field(min_length=1, max_length=100)
    bhk: Optional[str] = Field(default=None, max_length=20)
    budget: Optional[float] = Field(default=None, gt=0)
    consent: bool = False

    @field_validator("name", "source", "project")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("This field cannot be empty.")

        return value
