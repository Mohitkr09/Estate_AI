
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


UserRole = Literal["admin", "sales"]


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128)


class UserCreate(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=100,
        pattern=r"^[a-zA-Z0-9_.-]+$",
    )
    password: str = Field(min_length=12, max_length=128)
    role: UserRole = "sales"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
