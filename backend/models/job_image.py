from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class JobImage(SQLModel, table=True):
    """Job에 첨부된 이미지. 게시판 첨부(FileRecord)와 분리."""

    __tablename__ = "job_image"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="job.id", index=True)
    stored_path: str               # /uploads/<uuid>.<ext>
    original_name: str
    file_size: int
    sort_order: int = Field(default=0)
    uploaded_at: datetime = Field(default_factory=datetime.now)
