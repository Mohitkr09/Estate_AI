
from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    language: Literal["en", "hi", "gu"] = "en"
    history: list[ChatMessage] = Field(
        default_factory=list,
        max_length=20,
    )
    lead_id: str | None = None
    name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    project: str | None = Field(default=None, max_length=100)
    bhk: str | None = Field(default=None, max_length=20)
    budget: int | None = Field(default=None, gt=0)
    consent: bool = False


class AssistantChatResponse(BaseModel):
    reply: str
    handoff_required: bool = False
    handoff_reason: str | None = None
    lead_id: str | None = None
    language: Literal["en", "hi", "gu"]
    handoff_id: str | None = None

    notification_status: Literal[
        "not_required",
        "accepted_by_smtp",
        "failed",
    ] = "not_required"
