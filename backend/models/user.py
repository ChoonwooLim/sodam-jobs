from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: str = Field(default="user")  # "user" | "employer" | "admin" | "superadmin"
    is_active: bool = Field(default=True)

    # M4a additions — nullable so existing rows are preserved
    nickname: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    neighborhood: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
