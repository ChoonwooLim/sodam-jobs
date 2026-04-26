import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlmodel import Session, select, col
from geoalchemy2.elements import WKTElement

from database import get_session
from models import Job, JobImage, User
from deps import get_current_user, require_employer

router = APIRouter()

# Upload directory — same resolution as routers/files.py (handles UPLOAD_DIR="" gotcha)
_env_upload = os.getenv("UPLOAD_DIR", "").strip()
JOB_UPLOAD_DIR = Path(_env_upload) if _env_upload else Path(__file__).resolve().parent.parent / "uploads"

VALID_PAY_TYPES = ("hourly", "daily", "monthly")
VALID_CATEGORIES = ("hall", "kitchen", "cvs", "cafe", "delivery", "etc")
VALID_STATUS = ("active", "closed", "expired")


class JobCreate(BaseModel):
    title: str
    description: str = ""
    business_name: str
    address: str
    lat: float
    lng: float
    pay_type: Literal["hourly", "daily", "monthly"]
    pay_amount: int
    category: Literal["hall", "kitchen", "cvs", "cafe", "delivery", "etc"]
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


def _to_point(lng: float, lat: float) -> WKTElement:
    """Build a PostGIS POINT in WGS84 (SRID 4326). Note: PostGIS expects lng then lat."""
    return WKTElement(f"POINT({lng} {lat})", srid=4326)


def _serialize_job(j: Job, distance_m: Optional[float] = None,
                   thumbnail: Optional[str] = None) -> dict:
    """Common serializer for list/detail responses (excludes geography object)."""
    return {
        "id": j.id,
        "employer_id": j.employer_id,
        "title": j.title,
        "description": j.description,
        "business_name": j.business_name,
        "address": j.address,
        "pay_type": j.pay_type,
        "pay_amount": j.pay_amount,
        "category": j.category,
        "starts_at": j.starts_at.isoformat() if j.starts_at else None,
        "ends_at": j.ends_at.isoformat() if j.ends_at else None,
        "status": j.status,
        "view_count": j.view_count,
        "is_verified": j.is_verified,
        "thumbnail": thumbnail,
        "distance_m": distance_m,
        "created_at": j.created_at.isoformat(),
        "updated_at": j.updated_at.isoformat(),
    }


@router.post("", status_code=201)
def create_job(
    body: JobCreate,
    user: User = Depends(require_employer),
    session: Session = Depends(get_session),
):
    job = Job(
        employer_id=user.id,
        title=body.title,
        description=body.description,
        business_name=body.business_name,
        address=body.address,
        location=_to_point(body.lng, body.lat),
        pay_type=body.pay_type,
        pay_amount=body.pay_amount,
        category=body.category,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return {"id": job.id, "title": job.title}


@router.get("/my")
def list_my_jobs(
    user: User = Depends(require_employer),
    session: Session = Depends(get_session),
):
    """My posted jobs — all statuses, newest first."""
    jobs = session.exec(
        select(Job)
        .where(Job.employer_id == user.id)
        .order_by(col(Job.created_at).desc())
    ).all()

    # Fetch thumbnails in one query
    job_ids = [j.id for j in jobs]
    thumbs: dict[int, str] = {}
    if job_ids:
        rows = session.exec(
            select(JobImage.job_id, JobImage.stored_path)
            .where(col(JobImage.job_id).in_(job_ids))
            .order_by(col(JobImage.job_id), col(JobImage.sort_order))
        ).all()
        for jid, path in rows:
            if jid not in thumbs:
                thumbs[jid] = path

    return [_serialize_job(j, thumbnail=thumbs.get(j.id)) for j in jobs]
