from typing import Any, Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from geoalchemy2 import Geography


class Job(SQLModel, table=True):
    """알바 게시글. PostGIS Geography(POINT, 4326)로 위치 저장."""

    id: Optional[int] = Field(default=None, primary_key=True)
    employer_id: int = Field(foreign_key="user.id", index=True)

    title: str
    description: str = Field(default="")     # markdown
    business_name: str
    address: str                              # human-readable address text

    # PostGIS POINT in WGS84. Input via WKTElement('POINT(lng lat)', srid=4326).
    location: Any = Field(
        sa_column=Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    )

    pay_type: str = Field(default="hourly")  # hourly | daily | monthly
    pay_amount: int                           # KRW (원), no decimals
    category: str = Field(index=True)         # hall | kitchen | cvs | cafe | delivery | etc

    starts_at: Optional[datetime] = Field(default=None)
    ends_at: Optional[datetime] = Field(default=None)

    status: str = Field(default="active", index=True)  # active | closed | expired
    view_count: int = Field(default=0)
    is_verified: bool = Field(default=False)            # SodamFN 안심 사업장 배지

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
