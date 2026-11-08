from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


HandoffStatus = Literal[
    "pending",
    "in_progress",
    "resolved",
    "cancelled",
]


class HandoffUpdate(BaseModel):
    status: HandoffStatus | None = None
    assigned_to: str | None = Field(default=None, max_length=100)
     

class HandoffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
       
    id: str
    lead_id: str | None
    reason: str
    status: HandoffStatus
    consent: bool
    buyer_name: str | None
    buyer_phone: str | None
    project: str | None
    assigned_to: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
