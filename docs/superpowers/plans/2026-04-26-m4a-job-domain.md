# M4a Job 도메인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Job CRUD domain (Job + JobImage models, distance-based search, employer role) so 사장님 can register jobs and 알바생 can browse nearby openings. M4a only — Application/Review come in M4b/c.

**Architecture:** FastAPI router (`/api/jobs`) backed by SQLModel + PostGIS `geography(POINT, 4326)` column. Distance search via `ST_DWithin` + `ST_Distance` with GiST index. New `employer` role added between `user` and `admin`. Frontend has 4 new pages (`/jobs`, `/jobs/:id`, `/jobs/new|/jobs/:id/edit`, `/my/jobs`) and 3 reusable components (JobCard, JobFilters, LocationPicker).

**Tech Stack:** Python 3.12 · FastAPI · SQLModel · GeoAlchemy2 (new) · PostgreSQL 15.16 + PostGIS · React 19 · Vite · react-router-dom 7.

**Spec:** [docs/superpowers/specs/2026-04-26-m4a-job-domain-design.md](../specs/2026-04-26-m4a-job-domain-design.md)

**Test strategy:** No automated test framework exists in this project (spec explicitly opted out). Each task uses **manual smoke checks** (curl / browser) before commit. M4b can introduce pytest as a separate concern.

---

## Phase 1 — Backend foundations

### Task 1: Add GeoAlchemy2 dependency

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add geoalchemy2**

`backend/requirements.txt` — append one line:

```
geoalchemy2
```

Final file:

```
fastapi
uvicorn[standard]
sqlmodel
psycopg2-binary
python-dotenv
passlib[bcrypt]
bcrypt==4.0.1
python-jose[cryptography]
python-multipart
geoalchemy2
```

- [ ] **Step 2: Install**

```bash
cd backend && pip install -r requirements.txt
```

Expected: `Successfully installed geoalchemy2-X.Y.Z` (transitively pulls `Shapely` and `packaging` if not present).

- [ ] **Step 3: Smoke import**

```bash
python -c "from geoalchemy2 import Geography; print('OK')"
```

Expected output: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/requirements.txt
git commit -m "feat(m4a): add geoalchemy2 dependency for PostGIS support"
```

---

### Task 2: Extend User model — nickname / phone / neighborhood

**Files:**
- Modify: `backend/models/user.py`

- [ ] **Step 1: Add three nullable columns**

`backend/models/user.py` — final content:

```python
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
```

The actual database `ALTER TABLE` statements are added in Task 5 (the migration helper). This task only updates the Python model so the ORM knows about the columns.

- [ ] **Step 2: Smoke import**

```bash
cd backend && python -c "from models import User; print(list(User.__fields__.keys()))"
```

Expected output includes `'nickname', 'phone', 'neighborhood'`.

- [ ] **Step 3: Commit**

```bash
git add backend/models/user.py
git commit -m "feat(m4a): add User.nickname/phone/neighborhood columns"
```

---

### Task 3: Create Job model

**Files:**
- Create: `backend/models/job.py`

- [ ] **Step 1: Write the model**

`backend/models/job.py`:

```python
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
```

- [ ] **Step 2: Smoke import**

```bash
cd backend && python -c "from models.job import Job; print(Job.__tablename__, list(Job.__fields__.keys()))"
```

Expected output: `job ['id', 'employer_id', 'title', 'description', 'business_name', 'address', 'location', 'pay_type', 'pay_amount', 'category', 'starts_at', 'ends_at', 'status', 'view_count', 'is_verified', 'created_at', 'updated_at']`

- [ ] **Step 3: Commit**

```bash
git add backend/models/job.py
git commit -m "feat(m4a): add Job model with PostGIS location"
```

---

### Task 4: Create JobImage model + register both in `models/__init__.py`

**Files:**
- Create: `backend/models/job_image.py`
- Modify: `backend/models/__init__.py`

- [ ] **Step 1: Write JobImage model**

`backend/models/job_image.py`:

```python
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
```

- [ ] **Step 2: Export from `models/__init__.py`**

`backend/models/__init__.py` — final content:

```python
from .user import User
from .post import Post
from .comment import Comment
from .file import FileRecord
from .document import Document
from .job import Job
from .job_image import JobImage
```

- [ ] **Step 3: Smoke import**

```bash
cd backend && python -c "from models import Job, JobImage, User, FileRecord; print('OK')"
```

Expected output: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/models/__init__.py backend/models/job_image.py
git commit -m "feat(m4a): add JobImage model and register Job/JobImage exports"
```

---

### Task 5: Lifespan migration helpers — PostGIS extension + User ALTER + GiST index

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Add three migration helper functions above `lifespan`**

Insert these functions in `backend/main.py` between `_seed_docs()` and `@asynccontextmanager`:

```python
def _ensure_postgis():
    """Enable PostGIS extension. Fail loudly with clear instructions if no permission."""
    from sqlmodel import Session
    from sqlalchemy import text
    with Session(database.engine) as session:
        try:
            session.exec(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            session.commit()
            print("[migrate] PostGIS extension ready")
        except Exception as e:
            print(f"[migrate] PostGIS ERROR — manual install required: {e}")
            print("  Run on Orbitron:")
            print("    ssh stevenlim@192.168.219.101")
            print("    sudo docker exec -it <pg-container> \\")
            print("      psql -U orbitron_user -d orbitron_db -c 'CREATE EXTENSION postgis;'")
            raise


def _apply_user_migrations():
    """ALTER user table to add nickname/phone/neighborhood (idempotent)."""
    from sqlmodel import Session
    from sqlalchemy import text
    stmts = [
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS nickname VARCHAR',
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone VARCHAR',
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS neighborhood VARCHAR',
    ]
    with Session(database.engine) as session:
        for s in stmts:
            session.exec(text(s))
        session.commit()
        print("[migrate] user table columns ensured")


def _ensure_geo_indexes():
    """Create GiST index on Job.location for fast distance queries."""
    from sqlmodel import Session
    from sqlalchemy import text
    with Session(database.engine) as session:
        session.exec(text(
            "CREATE INDEX IF NOT EXISTS idx_job_location "
            "ON job USING GIST(location)"
        ))
        session.commit()
        print("[migrate] GiST index idx_job_location ready")
```

- [ ] **Step 2: Wire into `lifespan` in correct order**

Replace the existing `lifespan` block in `backend/main.py` with:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    _copy_gallery_defaults()
    _ensure_postgis()              # 1. extension first (Job needs Geography type)
    _apply_user_migrations()       # 2. ALTER existing table
    create_db_and_tables()         # 3. CREATE new tables (job, job_image)
    _ensure_geo_indexes()          # 4. GiST index after job table exists
    _seed_admin()
    _seed_docs()
    yield
```

Order matters: PostGIS must be enabled before `create_db_and_tables` (which creates the `job` table referencing the `geography` type).

- [ ] **Step 3: Smoke check — start server**

```bash
cd backend && uvicorn main:app --host 127.0.0.1 --port 8001 --log-level warning
```

Expected log lines (in order):
```
[gallery-defaults] Copied 0 files to ...
[migrate] PostGIS extension ready
[migrate] user table columns ensured
[migrate] GiST index idx_job_location ready
[seed] SuperAdmin 'admin' created. (or already exists)
[seed_docs] synced 4/4 docs from ...
```

If `PostGIS ERROR` appears: follow the printed ssh/docker instructions, run the `CREATE EXTENSION postgis` once, then restart. Stop the server (Ctrl+C) once the log lines verify.

- [ ] **Step 4: Verify schema in DB**

In a separate terminal:

```bash
psql "postgresql://orbitron_user:orbitron_db_pass@192.168.219.101:3101/orbitron_db" -c "\d job" -c "\d job_image" -c "\d \"user\"" -c "SELECT extname FROM pg_extension WHERE extname='postgis'"
```

Expected:
- `\d job` shows `location | geography(Point,4326)` and indexes including `idx_job_location` (GiST)
- `\d job_image` shows columns matching the model
- `\d "user"` shows `nickname`, `phone`, `neighborhood` columns
- `pg_extension` returns one row with `postgis`

- [ ] **Step 5: Commit**

```bash
git add backend/main.py
git commit -m "feat(m4a): lifespan migrations — PostGIS extension, user ALTER, GiST index"
```

---

### Task 6: `require_employer` dependency

**Files:**
- Modify: `backend/deps.py`

- [ ] **Step 1: Add the dependency function**

Append to `backend/deps.py` after `require_admin`:

```python
def require_employer(user: User = Depends(get_current_user)) -> User:
    """Allow employer / admin / superadmin. Used by Job write endpoints."""
    if user.role not in ("employer", "admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employer or admin access required",
        )
    return user
```

- [ ] **Step 2: Smoke import**

```bash
cd backend && python -c "from deps import require_employer; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/deps.py
git commit -m "feat(m4a): add require_employer dependency"
```

---

### Task 7: Auth — accept `role` in registration; admin role updates allow `employer`

**Files:**
- Modify: `backend/routers/auth.py`
- Modify: `backend/routers/admin.py`

- [ ] **Step 1: Update RegisterRequest in auth.py**

In `backend/routers/auth.py`, change `RegisterRequest` and `register()`:

```python
from typing import Literal

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: Literal["user", "employer"] = "user"  # admin/superadmin not self-assignable
```

In the `register()` body, when constructing `User(...)`, add `role=body.role`:

```python
@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    existing = session.exec(
        select(User).where((User.username == body.username) | (User.email == body.email))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "username": user.username, "role": user.role},
    )
```

- [ ] **Step 2: Update admin.py role update validation**

In `backend/routers/admin.py`, replace the role validation in `update_user_role`:

```python
@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    body: RoleUpdate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    if body.role not in ("user", "employer", "admin", "superadmin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.role == "superadmin" and admin.role != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmin can assign superadmin role")
    user.role = body.role
    session.add(user)
    session.commit()
    return {"id": user.id, "role": user.role}
```

(Only the `if body.role not in (...)` line changed — added `"employer"`.)

- [ ] **Step 3: Smoke check — register an employer**

Start server (`uvicorn main:app --port 8001 --reload`), then:

```bash
curl -s -X POST http://127.0.0.1:8001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"sajang1","email":"sajang1@example.com","password":"pw12345","role":"employer"}'
```

Expected response includes `"user":{"id":...,"username":"sajang1","role":"employer"}`.

Reject self-assigned admin:

```bash
curl -s -X POST http://127.0.0.1:8001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"hacker","email":"hacker@example.com","password":"pw","role":"admin"}'
```

Expected: HTTP 422 Unprocessable Entity (Pydantic Literal validation).

Stop server.

- [ ] **Step 4: Commit**

```bash
git add backend/routers/auth.py backend/routers/admin.py
git commit -m "feat(m4a): accept employer role on register, allow employer in admin role updates"
```

---

## Phase 2 — Backend Job API

### Task 8: Jobs router — POST (create) + GET /my (own listing)

**Files:**
- Create: `backend/routers/jobs.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Write the initial router file**

`backend/routers/jobs.py`:

```python
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
```

- [ ] **Step 2: Register the router in `main.py`**

In `backend/main.py`, add the import:

```python
from routers import auth, admin, docs, skills, plugins, boards, comments, files, jobs
```

And register it (after the other `include_router` lines):

```python
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
```

- [ ] **Step 3: Smoke check — create + list my jobs**

Start server (`uvicorn main:app --port 8001 --reload`).

Get token (use the employer registered in Task 7):

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"sajang1","password":"pw12345"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
echo "TOKEN=$TOKEN"
```

Create a job:

```bash
curl -s -X POST http://127.0.0.1:8001/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title":"소담김밥 역삼점 홀서빙 급구",
    "description":"점심시간 홀서빙",
    "business_name":"소담김밥 역삼점",
    "address":"서울 강남구 역삼동",
    "lat":37.5012,"lng":127.0396,
    "pay_type":"hourly","pay_amount":12000,
    "category":"hall"
  }'
```

Expected: `{"id":1,"title":"..."}` (id may vary).

List my jobs:

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8001/api/jobs/my
```

Expected: array containing the just-created job, with `thumbnail: null`, `distance_m: null`.

Try create as a non-employer user (should fail 403):

```bash
# Register a regular user
curl -s -X POST http://127.0.0.1:8001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alba1","email":"alba1@example.com","password":"pw12345","role":"user"}'

# Their token
ALBA_TOKEN=$(curl -s -X POST http://127.0.0.1:8001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alba1","password":"pw12345"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Should 403
curl -s -X POST http://127.0.0.1:8001/api/jobs \
  -H "Authorization: Bearer $ALBA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"x","business_name":"x","address":"x","lat":0,"lng":0,"pay_type":"hourly","pay_amount":1,"category":"etc"}'
```

Expected: `{"detail":"Employer or admin access required"}` (HTTP 403).

Stop server.

- [ ] **Step 4: Commit**

```bash
git add backend/routers/jobs.py backend/main.py
git commit -m "feat(m4a): jobs router with POST /api/jobs and GET /api/jobs/my"
```

---

### Task 9: Jobs router — GET list (with distance filter) + GET detail

**Files:**
- Modify: `backend/routers/jobs.py`

- [ ] **Step 1: Add list endpoint and detail endpoint**

Append to `backend/routers/jobs.py` after `list_my_jobs`:

```python
@router.get("")
def list_jobs(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 5.0,
    category: Optional[str] = None,
    pay_type: Optional[str] = None,
    pay_min: Optional[int] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """Public job list. With lat/lng → distance-sorted within radius_km. Else newest-first."""
    offset = (page - 1) * size
    radius_m = radius_km * 1000.0
    has_geo = lat is not None and lng is not None

    # Build raw SQL — geography casts and ST_DWithin/ST_Distance are easier as text.
    where_clauses = ["status = 'active'"]
    params = {}

    if has_geo:
        where_clauses.append(
            "ST_DWithin(location, ST_MakePoint(:lng, :lat)::geography, :radius_m)"
        )
        params["lng"] = lng
        params["lat"] = lat
        params["radius_m"] = radius_m

    if category:
        where_clauses.append("category = :category")
        params["category"] = category
    if pay_type:
        where_clauses.append("pay_type = :pay_type")
        params["pay_type"] = pay_type
    if pay_min is not None:
        where_clauses.append("pay_amount >= :pay_min")
        params["pay_min"] = pay_min
    if q:
        where_clauses.append("(title ILIKE :q_like OR description ILIKE :q_like)")
        params["q_like"] = f"%{q}%"

    where_sql = " AND ".join(where_clauses)

    # Total count
    count_sql = f"SELECT COUNT(*) FROM job WHERE {where_sql}"
    total = session.exec(text(count_sql).bindparams(**params)).scalar_one()

    # Page query
    if has_geo:
        select_sql = (
            "SELECT id, "
            "ST_Distance(location, ST_MakePoint(:lng, :lat)::geography) AS distance_m "
            f"FROM job WHERE {where_sql} "
            "ORDER BY distance_m ASC "
            "LIMIT :size OFFSET :offset"
        )
    else:
        select_sql = (
            "SELECT id, NULL::float AS distance_m "
            f"FROM job WHERE {where_sql} "
            "ORDER BY created_at DESC "
            "LIMIT :size OFFSET :offset"
        )
    params["size"] = size
    params["offset"] = offset

    rows = session.exec(text(select_sql).bindparams(**params)).all()
    if not rows:
        return {"items": [], "total": total, "page": page, "size": size}

    job_ids = [r[0] for r in rows]
    distance_map = {r[0]: r[1] for r in rows}

    # Hydrate Job rows in the same id order
    jobs = session.exec(select(Job).where(col(Job.id).in_(job_ids))).all()
    jobs_by_id = {j.id: j for j in jobs}

    # Thumbnails for all returned jobs
    thumbs: dict[int, str] = {}
    img_rows = session.exec(
        select(JobImage.job_id, JobImage.stored_path)
        .where(col(JobImage.job_id).in_(job_ids))
        .order_by(col(JobImage.job_id), col(JobImage.sort_order))
    ).all()
    for jid, path in img_rows:
        if jid not in thumbs:
            thumbs[jid] = path

    items = [
        _serialize_job(jobs_by_id[jid],
                       distance_m=float(distance_map[jid]) if distance_map[jid] is not None else None,
                       thumbnail=thumbs.get(jid))
        for jid in job_ids
    ]
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/{job_id}")
def get_job(job_id: int, session: Session = Depends(get_session)):
    """Public detail. Increments view_count and includes all images."""
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.view_count += 1
    session.add(job)
    session.commit()
    session.refresh(job)

    images = session.exec(
        select(JobImage)
        .where(JobImage.job_id == job_id)
        .order_by(col(JobImage.sort_order))
    ).all()

    data = _serialize_job(job)
    data["images"] = [
        {
            "id": img.id,
            "stored_path": img.stored_path,
            "original_name": img.original_name,
            "file_size": img.file_size,
            "sort_order": img.sort_order,
        }
        for img in images
    ]
    return data
```

**Note on route order**: FastAPI matches routes in declaration order. `/my` was declared in Task 8 before `""` and `/{job_id}`, so `/api/jobs/my` will match `list_my_jobs`. `{job_id}` is `int`, so `/api/jobs/abc` falls through to 422.

- [ ] **Step 2: Smoke check — list with and without geo**

Start server. Use the employer/job created in Task 8.

Without lat/lng (newest-first):

```bash
curl -s "http://127.0.0.1:8001/api/jobs" | python -m json.tool
```

Expected: `{"items":[{"id":1,..."distance_m":null,"thumbnail":null}],"total":1,"page":1,"size":20}`

With lat/lng (distance):

```bash
curl -s "http://127.0.0.1:8001/api/jobs?lat=37.5000&lng=127.0400&radius_km=5" | python -m json.tool
```

Expected: same item but `distance_m` populated (a positive float). Should be roughly ~150m for the example coordinates.

Filter that excludes everything:

```bash
curl -s "http://127.0.0.1:8001/api/jobs?category=cafe" | python -m json.tool
```

Expected: `{"items":[],"total":0,...}`.

Detail (and view_count increment):

```bash
curl -s "http://127.0.0.1:8001/api/jobs/1" | python -m json.tool
curl -s "http://127.0.0.1:8001/api/jobs/1" | python -m json.tool
```

Expected: `view_count` increments between the two calls. `images` is `[]`.

Detail not found:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:8001/api/jobs/99999"
```

Expected: `404`.

Stop server.

- [ ] **Step 3: Commit**

```bash
git add backend/routers/jobs.py
git commit -m "feat(m4a): GET /api/jobs (filtered + distance-sorted) and GET /api/jobs/{id}"
```

---

### Task 10: Jobs router — PUT and DELETE (with image cleanup)

**Files:**
- Modify: `backend/routers/jobs.py`

- [ ] **Step 1: Add PUT and DELETE handlers**

First, near the top of `backend/routers/jobs.py`, add the update model below `JobCreate`:

```python
class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    business_name: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    pay_type: Optional[Literal["hourly", "daily", "monthly"]] = None
    pay_amount: Optional[int] = None
    category: Optional[Literal["hall", "kitchen", "cvs", "cafe", "delivery", "etc"]] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    status: Optional[Literal["active", "closed", "expired"]] = None
    is_verified: Optional[bool] = None  # ignored unless caller is admin/superadmin
```

Then append to the bottom of the file:

```python
def _check_owner_or_admin(job: Job, user: User):
    if job.employer_id != user.id and user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Not authorized")


@router.put("/{job_id}")
def update_job(
    job_id: int,
    body: JobUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _check_owner_or_admin(job, user)

    data = body.model_dump(exclude_unset=True)

    # is_verified is admin-only; silently drop for non-admin
    if "is_verified" in data and user.role not in ("admin", "superadmin"):
        data.pop("is_verified")

    # Handle location specially (lat/lng → POINT)
    new_lat = data.pop("lat", None)
    new_lng = data.pop("lng", None)
    if new_lat is not None or new_lng is not None:
        # Both must be provided together if either is
        if new_lat is None or new_lng is None:
            raise HTTPException(status_code=400, detail="lat and lng must be provided together")
        job.location = _to_point(new_lng, new_lat)

    for field, value in data.items():
        setattr(job, field, value)
    job.updated_at = datetime.now()

    session.add(job)
    session.commit()
    session.refresh(job)
    return {"id": job.id, "title": job.title, "status": job.status}


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _check_owner_or_admin(job, user)

    # Delete associated images (DB rows + disk files)
    images = session.exec(select(JobImage).where(JobImage.job_id == job_id)).all()
    for img in images:
        # stored_path is "/uploads/<filename>"; resolve to disk path via JOB_UPLOAD_DIR
        # (defined at module top in Task 8)
        filename = Path(img.stored_path).name
        disk_path = JOB_UPLOAD_DIR / filename
        if disk_path.is_file():
            try:
                disk_path.unlink()
            except OSError as e:
                print(f"[jobs.delete] could not unlink {disk_path}: {e}")
        session.delete(img)

    session.delete(job)
    session.commit()
    return {"status": "deleted"}
```

- [ ] **Step 2: Smoke check — update and delete**

Start server. Use the employer token from Task 8 and the job id created there (assume id=1).

Owner update:

```bash
curl -s -X PUT http://127.0.0.1:8001/api/jobs/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"수정된 제목","status":"closed"}'
```

Expected: `{"id":1,"title":"수정된 제목","status":"closed"}`.

Verify GET reflects the change:

```bash
curl -s http://127.0.0.1:8001/api/jobs/1 | python -m json.tool | grep -E '(title|status)'
```

Expected: `"title": "수정된 제목"`, `"status": "closed"`.

Non-owner update should 403:

```bash
curl -s -X PUT http://127.0.0.1:8001/api/jobs/1 \
  -H "Authorization: Bearer $ALBA_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"hijack"}'
```

Expected: `{"detail":"Not authorized"}` (HTTP 403).

Try is_verified as non-admin (should be silently ignored):

```bash
curl -s -X PUT http://127.0.0.1:8001/api/jobs/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"is_verified":true}'
curl -s http://127.0.0.1:8001/api/jobs/1 | python -m json.tool | grep is_verified
```

Expected: `"is_verified": false`.

Delete (set status=active first to test the active path is also deletable):

```bash
curl -s -X PUT http://127.0.0.1:8001/api/jobs/1 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"active"}'
curl -s -X DELETE http://127.0.0.1:8001/api/jobs/1 \
  -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/api/jobs/1
```

Expected: delete returns `{"status":"deleted"}`, GET returns `404`.

Stop server.

- [ ] **Step 3: Commit**

```bash
git add backend/routers/jobs.py
git commit -m "feat(m4a): PUT/DELETE /api/jobs/{id} with owner check and image cleanup"
```

---

### Task 11: Jobs router — image upload/delete

**Files:**
- Modify: `backend/routers/jobs.py`

- [ ] **Step 1: Add image endpoints**

Append to the bottom of `backend/routers/jobs.py` (note: `os`, `uuid`, `Path`, `UploadFile`, `File`, and `JOB_UPLOAD_DIR` were already added at the top of the file in Task 8):

```python
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


@router.post("/{job_id}/images", status_code=201)
async def upload_job_image(
    job_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _check_owner_or_admin(job, user)

    ext = Path(file.filename or "").suffix.lower()
    if ext not in IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {ext}. Allowed: {sorted(IMAGE_EXTENSIONS)}",
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image too large. Max 10MB")

    stored_name = f"{uuid.uuid4()}{ext}"
    JOB_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_path_disk = JOB_UPLOAD_DIR / stored_name
    with open(stored_path_disk, "wb") as f:
        f.write(content)

    # Determine next sort_order
    max_order = session.exec(
        select(func.coalesce(func.max(JobImage.sort_order), -1))
        .where(JobImage.job_id == job_id)
    ).scalar_one()

    record = JobImage(
        job_id=job_id,
        stored_path=f"/uploads/{stored_name}",
        original_name=file.filename or "unknown",
        file_size=len(content),
        sort_order=int(max_order) + 1,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return {
        "id": record.id,
        "stored_path": record.stored_path,
        "original_name": record.original_name,
        "file_size": record.file_size,
        "sort_order": record.sort_order,
    }


@router.delete("/{job_id}/images/{image_id}")
def delete_job_image(
    job_id: int,
    image_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _check_owner_or_admin(job, user)

    img = session.get(JobImage, image_id)
    if not img or img.job_id != job_id:
        raise HTTPException(status_code=404, detail="Image not found")

    filename = Path(img.stored_path).name
    disk_path = JOB_UPLOAD_DIR / filename
    if disk_path.is_file():
        try:
            disk_path.unlink()
        except OSError as e:
            print(f"[jobs.delete_image] could not unlink {disk_path}: {e}")

    session.delete(img)
    session.commit()
    return {"status": "deleted"}
```

- [ ] **Step 2: Smoke check — upload, list, delete**

Start server. Recreate a job since we deleted it in Task 10:

```bash
JOB=$(curl -s -X POST http://127.0.0.1:8001/api/jobs \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"img test","description":"","business_name":"x","address":"x","lat":37.5,"lng":127.0,"pay_type":"hourly","pay_amount":10000,"category":"etc"}')
JOB_ID=$(echo "$JOB" | python -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "JOB_ID=$JOB_ID"
```

Make a 1×1 PNG locally:

```bash
python -c "
import base64
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
open('/tmp/test.png','wb').write(png)
"
ls -la /tmp/test.png
```

Upload:

```bash
curl -s -X POST "http://127.0.0.1:8001/api/jobs/$JOB_ID/images" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.png"
```

Expected: `{"id":1,"stored_path":"/uploads/<uuid>.png","original_name":"test.png","file_size":67,"sort_order":0}` (numbers vary).

Verify GET detail includes the image:

```bash
curl -s "http://127.0.0.1:8001/api/jobs/$JOB_ID" | python -m json.tool | grep -A 5 '"images"'
```

Expected: `images` array contains one entry.

Verify the file is fetchable via `/uploads/...` route:

```bash
IMG_PATH=$(curl -s "http://127.0.0.1:8001/api/jobs/$JOB_ID" | python -c "import sys,json;print(json.load(sys.stdin)['images'][0]['stored_path'])")
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "http://127.0.0.1:8001$IMG_PATH"
```

Expected: `200 image/png`.

Delete:

```bash
IMG_ID=$(curl -s "http://127.0.0.1:8001/api/jobs/$JOB_ID" | python -c "import sys,json;print(json.load(sys.stdin)['images'][0]['id'])")
curl -s -X DELETE "http://127.0.0.1:8001/api/jobs/$JOB_ID/images/$IMG_ID" \
  -H "Authorization: Bearer $TOKEN"
curl -s "http://127.0.0.1:8001/api/jobs/$JOB_ID" | python -m json.tool | grep '"images"'
```

Expected: delete returns `{"status":"deleted"}`, then `images: []`. The disk file is also gone (verify via `ls /c/WORK/sodam-jobs/uploads/` if curious).

Stop server.

- [ ] **Step 3: Commit**

```bash
git add backend/routers/jobs.py
git commit -m "feat(m4a): POST/DELETE /api/jobs/{id}/images with disk cleanup"
```

---

## Phase 3 — Frontend foundations

### Task 12: jobConstants.js + ProtectedRoute role hierarchy

**Files:**
- Create: `frontend/src/lib/jobConstants.js`
- Modify: `frontend/src/components/ProtectedRoute.jsx`

- [ ] **Step 1: Create constants module**

`frontend/src/lib/jobConstants.js`:

```javascript
export const JOB_CATEGORIES = {
  hall: "홀서빙",
  kitchen: "주방",
  cvs: "편의점",
  cafe: "카페",
  delivery: "배달",
  etc: "기타",
};

export const JOB_CATEGORY_KEYS = Object.keys(JOB_CATEGORIES);

export const PAY_TYPES = {
  hourly: "시급",
  daily: "일급",
  monthly: "월급",
};

export const PAY_TYPE_KEYS = Object.keys(PAY_TYPES);

export const JOB_STATUS_LABELS = {
  active: "모집 중",
  closed: "마감",
  expired: "만료",
};

export const formatKRW = (amount) => {
  if (amount == null) return "";
  return amount.toLocaleString("ko-KR") + "원";
};

export const formatDistance = (distance_m) => {
  if (distance_m == null) return "";
  if (distance_m < 1000) return `${Math.round(distance_m)}m`;
  return `${(distance_m / 1000).toFixed(1)}km`;
};
```

- [ ] **Step 2: Update ProtectedRoute with role hierarchy**

Replace `frontend/src/components/ProtectedRoute.jsx` entirely:

```jsx
import { Navigate } from "react-router-dom";

const ROLE_HIERARCHY = { user: 0, employer: 1, admin: 2, superadmin: 3 };

function passesRole(userRole, required) {
  const have = ROLE_HIERARCHY[userRole] ?? -1;
  const need = ROLE_HIERARCHY[required] ?? 0;
  return have >= need;
}

export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && !passesRole(user?.role, requiredRole)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
```

This means `requiredRole="employer"` allows employer/admin/superadmin; `requiredRole="admin"` allows admin/superadmin (preserves prior behavior since the prior code already let superadmin through admin pages).

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `built in <ms>` with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/jobConstants.js frontend/src/components/ProtectedRoute.jsx
git commit -m "feat(m4a): jobConstants module and role hierarchy in ProtectedRoute"
```

---

### Task 13: TopBar 알바 nav + LoginPage 역할 라디오

**Files:**
- Modify: `frontend/src/components/layout/TopBar.jsx`
- Modify: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/pages/LoginPage.module.css`

- [ ] **Step 1: Add 알바 to TopBar NAV_ITEMS**

In `frontend/src/components/layout/TopBar.jsx`, change the `NAV_ITEMS` array:

```jsx
const NAV_ITEMS = [
  { label: "홈", path: "/" },
  { label: "알바", path: "/jobs" },
  { label: "회사소개", path: "/about" },
  { label: "서비스", path: "/services" },
  { label: "커뮤니티", path: "/community/notice" },
];
```

Below the `isAdmin` link (still inside the `<nav>`), add a "내 알바" link visible to employer+:

```jsx
{user && (user.role === "employer" || user.role === "admin" || user.role === "superadmin") && (
  <Link to="/my/jobs" className={`${styles.navLink} ${isActive("/my/jobs") ? styles.active : ""}`} onClick={() => setMenuOpen(false)}>
    내 알바
  </Link>
)}
```

- [ ] **Step 2: Add role radio to LoginPage register form**

In `frontend/src/pages/LoginPage.jsx`, add state and field. Add `const [role, setRole] = useState("user");` near the other useState calls.

In `resetForm`, add `setRole("user");`.

In the body of `handleSubmit`, change the `body` for register mode to include role:

```jsx
const body = mode === "login"
  ? { username, password }
  : { username, email, password, role };
```

Add the radio group inside the form, after the email input group (only visible in register mode), before the password input group:

```jsx
{!isLogin && (
  <div className={styles.roleRow}>
    <span className={styles.roleLabel}>역할</span>
    <label className={styles.roleOption}>
      <input type="radio" name="role" value="user" checked={role === "user"} onChange={(e) => setRole(e.target.value)} />
      알바생
    </label>
    <label className={styles.roleOption}>
      <input type="radio" name="role" value="employer" checked={role === "employer"} onChange={(e) => setRole(e.target.value)} />
      사장님
    </label>
  </div>
)}
```

- [ ] **Step 3: Add corresponding styles**

Append to `frontend/src/pages/LoginPage.module.css`:

```css
.roleRow {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-2) 0;
}
.roleLabel {
  font-size: 0.85rem;
  color: var(--color-ink-mute);
  margin-right: var(--sp-2);
}
.roleOption {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
  cursor: pointer;
}
.roleOption input[type="radio"] {
  accent-color: var(--color-warm);
}
```

- [ ] **Step 4: Smoke check — build + visual**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: built without errors.

Optionally start `npm run dev`, open `http://localhost:5174/login`, click "Register" tab — verify radio buttons appear with 알바생 / 사장님 labels.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/TopBar.jsx frontend/src/pages/LoginPage.jsx frontend/src/pages/LoginPage.module.css
git commit -m "feat(m4a): TopBar 알바 nav + LoginPage role radio"
```

---

### Task 14: JobCard component

**Files:**
- Create: `frontend/src/components/jobs/JobCard.jsx`
- Create: `frontend/src/components/jobs/JobCard.module.css`

- [ ] **Step 1: Component**

`frontend/src/components/jobs/JobCard.jsx`:

```jsx
import { Link } from "react-router-dom";
import {
  JOB_CATEGORIES,
  PAY_TYPES,
  formatKRW,
  formatDistance,
} from "../../lib/jobConstants";
import styles from "./JobCard.module.css";

export default function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className={styles.card}>
      <div className={styles.thumb}>
        {job.thumbnail ? (
          <img src={job.thumbnail} alt={job.title} loading="lazy" />
        ) : (
          <div className={styles.thumbPlaceholder}>
            <span>{JOB_CATEGORIES[job.category] || "알바"}</span>
          </div>
        )}
        {job.is_verified && (
          <span className={styles.verifiedBadge} title="SodamFN 안심 사업장">
            안심
          </span>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{job.title}</h3>
        <div className={styles.metaRow}>
          <span>{job.business_name}</span>
          {job.distance_m != null && (
            <>
              <span className={styles.dot}>·</span>
              <span>{formatDistance(job.distance_m)}</span>
            </>
          )}
        </div>
        <div className={styles.payRow}>
          <span className={styles.payType}>{PAY_TYPES[job.pay_type] || job.pay_type}</span>
          <span className={styles.payAmount}>{formatKRW(job.pay_amount)}</span>
        </div>
        <div className={styles.tagRow}>
          <span className={styles.tag}>{JOB_CATEGORIES[job.category] || job.category}</span>
          {job.status !== "active" && (
            <span className={`${styles.tag} ${styles.tagMute}`}>마감</span>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/components/jobs/JobCard.module.css`:

```css
.card {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-4);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.card:hover {
  border-color: var(--color-accent);
  transform: translateY(-1px);
  color: inherit;
}

.thumb {
  position: relative;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface-elev);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumbPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-mute);
  font-size: 0.825rem;
  background: var(--color-line-soft);
}

.verifiedBadge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: var(--color-warm);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metaRow {
  display: flex;
  gap: 6px;
  font-size: 0.825rem;
  color: var(--color-ink-mute);
}
.dot { color: var(--color-line); }

.payRow {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 2px;
}
.payType {
  font-size: 0.825rem;
  color: var(--color-ink-soft);
}
.payAmount {
  font-weight: 700;
  color: var(--color-ink);
}

.tagRow {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}
.tag {
  font-size: 0.7rem;
  padding: 2px 8px;
  background: var(--color-accent-soft);
  color: var(--color-accent-ink);
  border-radius: var(--radius-sm);
  font-weight: 500;
}
.tagMute {
  background: var(--color-line);
  color: var(--color-ink-mute);
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build. JobCard isn't routed yet so it just compiles.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/jobs/JobCard.jsx frontend/src/components/jobs/JobCard.module.css
git commit -m "feat(m4a): JobCard component"
```

---

### Task 15: JobFilters component

**Files:**
- Create: `frontend/src/components/jobs/JobFilters.jsx`
- Create: `frontend/src/components/jobs/JobFilters.module.css`

- [ ] **Step 1: Component**

`frontend/src/components/jobs/JobFilters.jsx`:

```jsx
import { JOB_CATEGORIES, PAY_TYPES } from "../../lib/jobConstants";
import styles from "./JobFilters.module.css";

export default function JobFilters({ value, onChange }) {
  // value shape: { category, pay_type, pay_min, radius_km, q }
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className={styles.wrap}>
      <div className={styles.tabRow}>
        <button
          className={`${styles.tab} ${!value.category ? styles.tabActive : ""}`}
          onClick={() => update({ category: undefined })}
          type="button"
        >
          전체
        </button>
        {Object.entries(JOB_CATEGORIES).map(([key, label]) => (
          <button
            key={key}
            className={`${styles.tab} ${value.category === key ? styles.tabActive : ""}`}
            onClick={() => update({ category: key })}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.detailRow}>
        <label className={styles.field}>
          <span>급여</span>
          <select
            value={value.pay_type || ""}
            onChange={(e) => update({ pay_type: e.target.value || undefined })}
          >
            <option value="">전체</option>
            {Object.entries(PAY_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>최소 금액</span>
          <input
            type="number"
            min={0}
            step={1000}
            placeholder="예: 12000"
            value={value.pay_min ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              update({ pay_min: v === "" ? undefined : Number(v) });
            }}
          />
        </label>

        <label className={styles.field}>
          <span>반경</span>
          <select
            value={value.radius_km ?? 5}
            onChange={(e) => update({ radius_km: Number(e.target.value) })}
          >
            <option value={1}>1km</option>
            <option value={3}>3km</option>
            <option value={5}>5km</option>
            <option value={10}>10km</option>
            <option value={20}>20km</option>
          </select>
        </label>

        <label className={`${styles.field} ${styles.fieldGrow}`}>
          <span>검색</span>
          <input
            type="search"
            placeholder="제목/내용 검색"
            value={value.q || ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
          />
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/components/jobs/JobFilters.module.css`:

```css
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: var(--sp-4);
}

.tabRow {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.tab {
  padding: 6px var(--sp-3);
  font-size: 0.875rem;
  background: var(--color-surface-elev);
  border: 1px solid var(--color-line);
  border-radius: 999px;
  color: var(--color-ink-soft);
}
.tab:hover { border-color: var(--color-ink-soft); }
.tabActive {
  background: var(--color-ink);
  color: #fff;
  border-color: var(--color-ink);
  font-weight: 600;
}

.detailRow {
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.825rem;
  color: var(--color-ink-mute);
  min-width: 110px;
}
.fieldGrow { flex: 1; min-width: 200px; }
.field input, .field select {
  padding: 6px var(--sp-2);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 0.9rem;
  color: var(--color-ink);
}
.field input:focus, .field select:focus {
  outline: none;
  border-color: var(--color-accent);
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/jobs/JobFilters.jsx frontend/src/components/jobs/JobFilters.module.css
git commit -m "feat(m4a): JobFilters component (category tabs + pay/radius/search)"
```

---

### Task 16: LocationPicker component

**Files:**
- Create: `frontend/src/components/jobs/LocationPicker.jsx`
- Create: `frontend/src/components/jobs/LocationPicker.module.css`

- [ ] **Step 1: Component**

`frontend/src/components/jobs/LocationPicker.jsx`:

```jsx
import { useState } from "react";
import styles from "./LocationPicker.module.css";

const LS_KEY = "userLocation";

export function getSavedLocation() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data?.lat === "number" && typeof data?.lng === "number") return data;
  } catch (_) { /* fallthrough */ }
  return null;
}

export function saveLocation(loc) {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...loc, savedAt: Date.now() }));
}

export function clearLocation() {
  localStorage.removeItem(LS_KEY);
}

export default function LocationPicker({ initial, onSave, onClose }) {
  const start = initial || getSavedLocation() || {};
  const [lat, setLat] = useState(start.lat ?? "");
  const [lng, setLng] = useState(start.lng ?? "");
  const [neighborhood, setNeighborhood] = useState(start.neighborhood ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const useCurrent = () => {
    if (!navigator.geolocation) {
      setError("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
      return;
    }
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        setError(`위치 가져오기 실패: ${err.message}`);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!isFinite(latNum) || latNum < -90 || latNum > 90) {
      setError("위도는 -90 ~ 90 범위의 숫자여야 합니다.");
      return;
    }
    if (!isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      setError("경도는 -180 ~ 180 범위의 숫자여야 합니다.");
      return;
    }
    const loc = { lat: latNum, lng: lngNum, neighborhood: neighborhood || null };
    saveLocation(loc);
    onSave?.(loc);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>내 위치 설정</h2>
        <p className={styles.help}>
          가까운 알바를 보려면 위치가 필요합니다. 현재 위치 버튼을 누르거나 직접 좌표를 입력하세요.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <button type="button" onClick={useCurrent} disabled={busy} className={styles.geoBtn}>
            {busy ? "가져오는 중..." : "📍 현재 위치 사용"}
          </button>

          <label className={styles.field}>
            <span>위도 (lat)</span>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="37.5012"
              required
            />
          </label>
          <label className={styles.field}>
            <span>경도 (lng)</span>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="127.0396"
              required
            />
          </label>
          <label className={styles.field}>
            <span>동네 이름 (선택)</span>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="강남구 역삼동"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancel}>취소</button>
            <button type="submit" className={styles.save}>저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/components/jobs/LocationPicker.module.css`:

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 17, 15, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--sp-4);
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--sp-6);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.title {
  font-size: 1.25rem;
  margin-bottom: var(--sp-2);
}
.help {
  font-size: 0.875rem;
  color: var(--color-ink-mute);
  margin-bottom: var(--sp-4);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.geoBtn {
  padding: var(--sp-3);
  background: var(--color-warm-soft);
  border: 1px dashed var(--color-warm);
  border-radius: var(--radius-md);
  color: var(--color-warm);
  font-weight: 500;
}
.geoBtn:hover { background: var(--color-warm); color: #fff; }
.geoBtn:disabled { opacity: 0.6; cursor: progress; }

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.825rem;
  color: var(--color-ink-mute);
}
.field input {
  padding: var(--sp-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface-elev);
  font-size: 0.95rem;
  color: var(--color-ink);
}
.field input:focus { outline: none; border-color: var(--color-accent); background: var(--color-surface); }

.error { color: var(--color-danger); font-size: 0.875rem; margin: 0; }

.actions {
  display: flex;
  gap: var(--sp-3);
  justify-content: flex-end;
  margin-top: var(--sp-3);
}
.cancel, .save {
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-line);
  font-weight: 500;
}
.cancel { background: var(--color-surface); color: var(--color-ink); }
.save { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.save:hover { background: var(--color-accent-ink); }
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/jobs/LocationPicker.jsx frontend/src/components/jobs/LocationPicker.module.css
git commit -m "feat(m4a): LocationPicker component with geolocation API"
```

---

## Phase 4 — Frontend pages

### Task 17: JobListPage

**Files:**
- Create: `frontend/src/pages/jobs/JobListPage.jsx`
- Create: `frontend/src/pages/jobs/JobListPage.module.css`

- [ ] **Step 1: Page**

`frontend/src/pages/jobs/JobListPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import JobCard from "../../components/jobs/JobCard";
import JobFilters from "../../components/jobs/JobFilters";
import LocationPicker, { getSavedLocation } from "../../components/jobs/LocationPicker";
import styles from "./JobListPage.module.css";

export default function JobListPage() {
  const [location, setLocation] = useState(getSavedLocation());
  const [showPicker, setShowPicker] = useState(false);
  const [filters, setFilters] = useState({ radius_km: 5 });
  const [page, setPage] = useState(1);
  const size = 20;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const canPost = user && (user.role === "employer" || user.role === "admin" || user.role === "superadmin");

  // Auto-prompt picker once per session if no saved location
  useEffect(() => {
    if (!location && !sessionStorage.getItem("jobsLocationPromptShown")) {
      setShowPicker(true);
      sessionStorage.setItem("jobsLocationPromptShown", "1");
    }
  }, [location]);

  // Fetch list whenever inputs change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (location) {
      params.set("lat", location.lat);
      params.set("lng", location.lng);
      params.set("radius_km", filters.radius_km ?? 5);
    }
    if (filters.category) params.set("category", filters.category);
    if (filters.pay_type) params.set("pay_type", filters.pay_type);
    if (filters.pay_min != null) params.set("pay_min", filters.pay_min);
    if (filters.q) params.set("q", filters.q);
    params.set("page", page);
    params.set("size", size);

    api.get(`/api/jobs?${params.toString()}`)
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [location, filters, page]);

  // Reset to page 1 when filters or location change
  useEffect(() => { setPage(1); }, [filters, location]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>알바</h1>
          {location ? (
            <p className={styles.locationLine}>
              내 위치: {location.neighborhood || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
              {" "}
              <button className={styles.locLink} onClick={() => setShowPicker(true)}>변경</button>
            </p>
          ) : (
            <p className={styles.locationLine}>
              <button className={styles.locLink} onClick={() => setShowPicker(true)}>📍 내 위치 설정</button>
              {" "}— 거리 정렬을 사용하려면 위치가 필요합니다
            </p>
          )}
        </div>
        {canPost && (
          <Link to="/jobs/new" className={styles.postBtn}>알바 등록</Link>
        )}
      </div>

      <JobFilters value={filters} onChange={setFilters} />

      {loading ? (
        <p className={styles.empty}>불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>조건에 맞는 알바가 없습니다.</p>
      ) : (
        <div className={styles.grid}>
          {items.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      )}

      <div className={styles.pagination}>
        <button onClick={() => setPage(page - 1)} disabled={page <= 1}>이전</button>
        <span>{page} / {totalPages} (총 {total})</span>
        <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}>다음</button>
      </div>

      {showPicker && (
        <LocationPicker
          initial={location}
          onClose={() => setShowPicker(false)}
          onSave={(loc) => { setLocation(loc); setShowPicker(false); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/pages/jobs/JobListPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-4);
  border-bottom: 2px solid var(--color-accent);
  padding-bottom: var(--sp-3);
}

.title {
  font-size: 1.75rem;
  margin-bottom: var(--sp-2);
}

.locationLine {
  font-size: 0.875rem;
  color: var(--color-ink-mute);
}
.locLink {
  color: var(--color-accent);
  text-decoration: underline;
  font-size: inherit;
  padding: 0;
}

.postBtn {
  background: var(--color-accent);
  color: #fff;
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--radius-md);
  font-weight: 500;
  flex-shrink: 0;
}
.postBtn:hover { background: var(--color-accent-ink); color: #fff; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--sp-3);
}

.empty {
  padding: var(--sp-7);
  text-align: center;
  color: var(--color-ink-mute);
  background: var(--color-surface);
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-lg);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--sp-4);
  font-size: 0.9rem;
  color: var(--color-ink-soft);
}
.pagination button {
  padding: 6px var(--sp-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.pagination button:disabled { color: var(--color-ink-mute); cursor: not-allowed; }
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/jobs/JobListPage.jsx frontend/src/pages/jobs/JobListPage.module.css
git commit -m "feat(m4a): JobListPage with filters, distance, and location picker"
```

---

### Task 18: JobDetailPage

**Files:**
- Create: `frontend/src/pages/jobs/JobDetailPage.jsx`
- Create: `frontend/src/pages/jobs/JobDetailPage.module.css`

- [ ] **Step 1: Page**

`frontend/src/pages/jobs/JobDetailPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../../services/api";
import {
  JOB_CATEGORIES,
  PAY_TYPES,
  JOB_STATUS_LABELS,
  formatKRW,
} from "../../lib/jobConstants";
import styles from "./JobDetailPage.module.css";

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    setLoading(true);
    api.get(`/api/jobs/${id}`)
      .then((r) => setJob(r.data))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.page}>로딩 중...</div>;
  if (!job) return <div className={styles.page}>알바를 찾을 수 없습니다.</div>;

  const canEdit = user && (user.id === job.employer_id || user.role === "admin" || user.role === "superadmin");

  const handleDelete = async () => {
    if (!confirm("이 알바를 삭제하시겠습니까?")) return;
    await api.delete(`/api/jobs/${id}`);
    navigate("/jobs");
  };

  const images = job.images || [];

  return (
    <article className={styles.page}>
      {images.length > 0 ? (
        <div className={styles.gallery}>
          <img src={images[activeImage].stored_path} alt={job.title} className={styles.heroImage} />
          {images.length > 1 && (
            <div className={styles.thumbStrip}>
              {images.map((img, i) => (
                <button
                  key={img.id}
                  className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ""}`}
                  onClick={() => setActiveImage(i)}
                  type="button"
                >
                  <img src={img.stored_path} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.heroPlaceholder}>
          <span>{JOB_CATEGORIES[job.category] || "알바"}</span>
        </div>
      )}

      <header className={styles.header}>
        {job.is_verified && (
          <span className={styles.verifiedBadge}>✓ SodamFN 안심 사업장</span>
        )}
        {job.status !== "active" && (
          <span className={styles.statusBadge}>{JOB_STATUS_LABELS[job.status] || job.status}</span>
        )}

        <h1 className={styles.title}>{job.title}</h1>

        <div className={styles.payRow}>
          <span className={styles.payType}>{PAY_TYPES[job.pay_type] || job.pay_type}</span>
          <span className={styles.payAmount}>{formatKRW(job.pay_amount)}</span>
        </div>

        <dl className={styles.info}>
          <dt>사업장</dt><dd>{job.business_name}</dd>
          <dt>주소</dt><dd>{job.address}</dd>
          <dt>카테고리</dt><dd>{JOB_CATEGORIES[job.category] || job.category}</dd>
          {job.starts_at && <><dt>근무 시작</dt><dd>{new Date(job.starts_at).toLocaleDateString("ko-KR")}</dd></>}
          {job.ends_at && <><dt>근무 종료</dt><dd>{new Date(job.ends_at).toLocaleDateString("ko-KR")}</dd></>}
        </dl>
      </header>

      <div className={styles.description}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.description || "_상세 설명이 없습니다._"}</ReactMarkdown>
      </div>

      <footer className={styles.footer}>
        <span className={styles.viewCount}>조회 {job.view_count}회</span>
        <div className={styles.actions}>
          <Link to="/jobs" className={styles.btn}>목록</Link>
          {canEdit && (
            <>
              <Link to={`/jobs/${id}/edit`} className={styles.btn}>수정</Link>
              <button onClick={handleDelete} className={`${styles.btn} ${styles.danger}`}>삭제</button>
            </>
          )}
          <button className={`${styles.btn} ${styles.primary}`} disabled title="M4b에서 활성화 예정">
            지원하기 (준비 중)
          </button>
        </div>
      </footer>
    </article>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/pages/jobs/JobDetailPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  max-width: 880px;
}

.gallery {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.heroImage {
  width: 100%;
  max-height: 480px;
  object-fit: cover;
  border-radius: var(--radius-lg);
  background: var(--color-surface-elev);
}
.heroPlaceholder {
  width: 100%;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-mute);
  background: var(--color-line-soft);
  border-radius: var(--radius-lg);
  font-size: 1.1rem;
}

.thumbStrip {
  display: flex;
  gap: var(--sp-2);
  overflow-x: auto;
}
.thumb {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface-elev);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumbActive { border-color: var(--color-accent); }

.header {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.verifiedBadge, .statusBadge {
  display: inline-block;
  width: fit-content;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-weight: 700;
}
.verifiedBadge { background: var(--color-warm); color: #fff; }
.statusBadge { background: var(--color-line); color: var(--color-ink-mute); }

.title { font-size: 1.75rem; }

.payRow {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}
.payType { color: var(--color-ink-soft); }
.payAmount {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent-ink);
}

.info {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: var(--sp-2) var(--sp-4);
  padding: var(--sp-4);
  background: var(--color-surface-elev);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}
.info dt { color: var(--color-ink-mute); }
.info dd { margin: 0; }

.description {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: var(--sp-5);
  font-size: 1rem;
  line-height: 1.7;
}
.description :global(p) { margin: 0 0 var(--sp-3); }
.description :global(p:last-child) { margin-bottom: 0; }

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--color-line-soft);
  flex-wrap: wrap;
}
.viewCount {
  font-size: 0.875rem;
  color: var(--color-ink-mute);
}
.actions {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}
.btn {
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-ink);
  font-size: 0.9rem;
}
.danger { color: var(--color-danger); border-color: var(--color-danger); }
.danger:hover { background: var(--color-danger); color: #fff; }
.primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/jobs/JobDetailPage.jsx frontend/src/pages/jobs/JobDetailPage.module.css
git commit -m "feat(m4a): JobDetailPage with image gallery and disabled apply button"
```

---

### Task 19: JobFormPage (new + edit modes)

**Files:**
- Create: `frontend/src/pages/jobs/JobFormPage.jsx`
- Create: `frontend/src/pages/jobs/JobFormPage.module.css`

- [ ] **Step 1: Page**

`frontend/src/pages/jobs/JobFormPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  JOB_CATEGORIES,
  PAY_TYPES,
  JOB_CATEGORY_KEYS,
  PAY_TYPE_KEYS,
} from "../../lib/jobConstants";
import LocationPicker, { saveLocation } from "../../components/jobs/LocationPicker";
import styles from "./JobFormPage.module.css";

export default function JobFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    business_name: "",
    address: "",
    lat: "",
    lng: "",
    pay_type: "hourly",
    pay_amount: "",
    category: "hall",
    starts_at: "",
    ends_at: "",
  });
  const [images, setImages] = useState([]);  // for edit mode
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showLocPicker, setShowLocPicker] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/api/jobs/${id}`).then((r) => {
      const j = r.data;
      setForm({
        title: j.title,
        description: j.description || "",
        business_name: j.business_name,
        address: j.address,
        lat: "",  // server doesn't return lat/lng directly; user may re-pick
        lng: "",
        pay_type: j.pay_type,
        pay_amount: String(j.pay_amount),
        category: j.category,
        starts_at: j.starts_at ? j.starts_at.slice(0, 16) : "",
        ends_at: j.ends_at ? j.ends_at.slice(0, 16) : "",
      });
      setImages(j.images || []);
    }).catch(() => setError("불러오기 실패"));
  }, [id, isEdit]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      title: form.title,
      description: form.description,
      business_name: form.business_name,
      address: form.address,
      pay_type: form.pay_type,
      pay_amount: Number(form.pay_amount),
      category: form.category,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };

    // lat/lng required for create; optional for edit (only sent if both provided)
    const latNum = form.lat === "" ? null : Number(form.lat);
    const lngNum = form.lng === "" ? null : Number(form.lng);

    if (!isEdit && (latNum == null || lngNum == null)) {
      setError("위치(lat, lng)를 입력하거나 위치 선택 버튼을 사용하세요.");
      return;
    }
    if (latNum != null && lngNum != null) {
      payload.lat = latNum;
      payload.lng = lngNum;
    } else if ((latNum != null) !== (lngNum != null)) {
      setError("lat과 lng는 함께 입력해야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/api/jobs/${id}`, payload);
        navigate(`/jobs/${id}`);
      } else {
        const res = await api.post("/api/jobs", payload);
        const newId = res.data.id;
        navigate(`/jobs/${newId}/edit`);  // go to edit so they can upload images
      }
    } catch (err) {
      setError(err.response?.data?.detail || "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isEdit) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post(`/api/jobs/${id}/images`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImages((prev) => [...prev, res.data]);
    } catch (err) {
      setError(err.response?.data?.detail || "이미지 업로드 실패");
    }
    e.target.value = "";
  };

  const handleImageDelete = async (imageId) => {
    if (!confirm("이미지를 삭제하시겠습니까?")) return;
    await api.delete(`/api/jobs/${id}/images/${imageId}`);
    setImages((prev) => prev.filter((i) => i.id !== imageId));
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isEdit ? "알바 수정" : "알바 등록"}</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>제목 *</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            required
          />
        </label>

        <label className={styles.field}>
          <span>사업장명 *</span>
          <input
            type="text"
            value={form.business_name}
            onChange={(e) => update({ business_name: e.target.value })}
            required
          />
        </label>

        <label className={styles.field}>
          <span>주소 *</span>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="서울 강남구 역삼동 123-45"
            required
          />
        </label>

        <div className={styles.locRow}>
          <label className={styles.field}>
            <span>위도 (lat) {isEdit ? "(변경 시에만 입력)" : "*"}</span>
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => update({ lat: e.target.value })}
              placeholder="37.5012"
              required={!isEdit}
            />
          </label>
          <label className={styles.field}>
            <span>경도 (lng) {isEdit ? "(변경 시에만 입력)" : "*"}</span>
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => update({ lng: e.target.value })}
              placeholder="127.0396"
              required={!isEdit}
            />
          </label>
          <button type="button" onClick={() => setShowLocPicker(true)} className={styles.locBtn}>
            지도/현재위치
          </button>
        </div>

        <div className={styles.payRow}>
          <label className={styles.field}>
            <span>급여 종류 *</span>
            <select value={form.pay_type} onChange={(e) => update({ pay_type: e.target.value })}>
              {PAY_TYPE_KEYS.map((k) => (
                <option key={k} value={k}>{PAY_TYPES[k]}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>금액 (원) *</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={form.pay_amount}
              onChange={(e) => update({ pay_amount: e.target.value })}
              required
            />
          </label>
          <label className={styles.field}>
            <span>카테고리 *</span>
            <select value={form.category} onChange={(e) => update({ category: e.target.value })}>
              {JOB_CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>{JOB_CATEGORIES[k]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.dateRow}>
          <label className={styles.field}>
            <span>근무 시작 (선택)</span>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => update({ starts_at: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span>근무 종료 (선택)</span>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => update({ ends_at: e.target.value })}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>상세 설명 (Markdown)</span>
          <textarea
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={10}
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" onClick={() => navigate(-1)} className={styles.btn}>취소</button>
          <button type="submit" disabled={submitting} className={`${styles.btn} ${styles.primary}`}>
            {submitting ? "저장 중..." : (isEdit ? "수정" : "등록")}
          </button>
        </div>
      </form>

      {isEdit && (
        <section className={styles.imagesSection}>
          <h2 className={styles.sectionTitle}>이미지 ({images.length})</h2>
          <div className={styles.imageList}>
            {images.map((img) => (
              <div key={img.id} className={styles.imageItem}>
                <img src={img.stored_path} alt={img.original_name} />
                <button type="button" onClick={() => handleImageDelete(img.id)} className={styles.removeBtn}>
                  삭제
                </button>
              </div>
            ))}
            <label className={styles.uploadBox}>
              <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              + 이미지 추가
            </label>
          </div>
        </section>
      )}

      {showLocPicker && (
        <LocationPicker
          initial={{ lat: form.lat ? Number(form.lat) : null, lng: form.lng ? Number(form.lng) : null }}
          onClose={() => setShowLocPicker(false)}
          onSave={(loc) => {
            update({ lat: String(loc.lat), lng: String(loc.lng) });
            saveLocation(loc);  // also save as user's default
            setShowLocPicker(false);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/pages/jobs/JobFormPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  max-width: 720px;
}

.title { font-size: 1.5rem; }

.form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: var(--sp-5);
}

.field { display: flex; flex-direction: column; gap: 4px; }
.field > span {
  font-size: 0.825rem;
  color: var(--color-ink-mute);
}
.field input, .field select, .field textarea {
  padding: var(--sp-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface-elev);
  font-size: 0.95rem;
  color: var(--color-ink);
}
.field input:focus, .field select:focus, .field textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  background: var(--color-surface);
}
.field textarea {
  font-family: var(--font-mono);
  resize: vertical;
}

.locRow {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: var(--sp-3);
  align-items: end;
}
.locBtn {
  padding: var(--sp-3) var(--sp-4);
  background: var(--color-warm-soft);
  border: 1px solid var(--color-warm);
  color: var(--color-warm);
  border-radius: var(--radius-md);
  white-space: nowrap;
}

.payRow, .dateRow {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--sp-3);
}
.dateRow { grid-template-columns: 1fr 1fr; }

.error { color: var(--color-danger); font-size: 0.875rem; }

.actions {
  display: flex;
  gap: var(--sp-3);
  justify-content: flex-end;
}
.btn {
  padding: var(--sp-3) var(--sp-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-ink);
}
.primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}
.primary:disabled { opacity: 0.6; }

.imagesSection {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: var(--sp-5);
}
.sectionTitle {
  font-size: 1.1rem;
  margin-bottom: var(--sp-4);
}
.imageList {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--sp-3);
}
.imageItem {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface-elev);
}
.imageItem img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.removeBtn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(20, 17, 15, 0.7);
  color: #fff;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.uploadBox {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-md);
  color: var(--color-ink-mute);
  cursor: pointer;
}
.uploadBox:hover { border-color: var(--color-accent); color: var(--color-accent); }

@media (max-width: 640px) {
  .locRow, .payRow, .dateRow { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/jobs/JobFormPage.jsx frontend/src/pages/jobs/JobFormPage.module.css
git commit -m "feat(m4a): JobFormPage (create/edit) with image management and location picker"
```

---

### Task 20: MyJobsPage

**Files:**
- Create: `frontend/src/pages/jobs/MyJobsPage.jsx`
- Create: `frontend/src/pages/jobs/MyJobsPage.module.css`

- [ ] **Step 1: Page**

`frontend/src/pages/jobs/MyJobsPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import {
  JOB_CATEGORIES,
  PAY_TYPES,
  JOB_STATUS_LABELS,
  formatKRW,
} from "../../lib/jobConstants";
import styles from "./MyJobsPage.module.css";

export default function MyJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/api/jobs/my")
      .then((r) => setJobs(r.data))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (job) => {
    const next = job.status === "active" ? "closed" : "active";
    await api.put(`/api/jobs/${job.id}`, { status: next });
    load();
  };

  const handleDelete = async (job) => {
    if (!confirm(`"${job.title}" 알바를 삭제하시겠습니까?`)) return;
    await api.delete(`/api/jobs/${job.id}`);
    load();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>내가 등록한 알바</h1>
        <Link to="/jobs/new" className={styles.postBtn}>새 알바 등록</Link>
      </div>

      {loading ? (
        <p className={styles.empty}>불러오는 중...</p>
      ) : jobs.length === 0 ? (
        <p className={styles.empty}>등록한 알바가 없습니다.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>제목</th>
              <th>카테고리</th>
              <th>급여</th>
              <th>상태</th>
              <th>조회</th>
              <th>등록일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td><Link to={`/jobs/${j.id}`}>{j.title}</Link></td>
                <td>{JOB_CATEGORIES[j.category] || j.category}</td>
                <td>{PAY_TYPES[j.pay_type]} {formatKRW(j.pay_amount)}</td>
                <td>
                  <button
                    className={`${styles.statusBtn} ${j.status === "active" ? styles.statusOn : styles.statusOff}`}
                    onClick={() => toggleStatus(j)}
                  >
                    {JOB_STATUS_LABELS[j.status] || j.status}
                  </button>
                </td>
                <td>{j.view_count}</td>
                <td>{new Date(j.created_at).toLocaleDateString("ko-KR")}</td>
                <td className={styles.actionsCell}>
                  <Link to={`/jobs/${j.id}/edit`} className={styles.editLink}>수정</Link>
                  <button onClick={() => handleDelete(j)} className={styles.deleteBtn}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/pages/jobs/MyJobsPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid var(--color-accent);
  padding-bottom: var(--sp-3);
}

.title { font-size: 1.5rem; }

.postBtn {
  padding: var(--sp-2) var(--sp-5);
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-md);
  font-weight: 500;
}
.postBtn:hover { background: var(--color-accent-ink); color: #fff; }

.empty {
  padding: var(--sp-7);
  text-align: center;
  color: var(--color-ink-mute);
  background: var(--color-surface);
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-lg);
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.table th, .table td {
  padding: var(--sp-3) var(--sp-4);
  text-align: left;
  border-bottom: 1px solid var(--color-line-soft);
  font-size: 0.9rem;
}
.table th {
  background: var(--color-surface-elev);
  color: var(--color-ink-soft);
  font-weight: 600;
  font-size: 0.825rem;
  text-transform: uppercase;
}
.table tr:last-child td { border-bottom: none; }

.statusBtn {
  padding: 4px var(--sp-3);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
}
.statusOn { background: var(--color-success); color: #fff; }
.statusOff { background: var(--color-line); color: var(--color-ink-soft); }

.actionsCell {
  display: flex;
  gap: var(--sp-2);
}
.editLink {
  font-size: 0.85rem;
  color: var(--color-accent);
}
.deleteBtn {
  font-size: 0.85rem;
  color: var(--color-danger);
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/jobs/MyJobsPage.jsx frontend/src/pages/jobs/MyJobsPage.module.css
git commit -m "feat(m4a): MyJobsPage with status toggle and delete"
```

---

### Task 21: Wire routes and HomePage preview

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/HomePage.jsx`
- Modify: `frontend/src/pages/HomePage.module.css`

- [ ] **Step 1: Add routes in App.jsx**

In `frontend/src/App.jsx`, add the imports near the existing page imports:

```jsx
import JobListPage from "./pages/jobs/JobListPage";
import JobDetailPage from "./pages/jobs/JobDetailPage";
import JobFormPage from "./pages/jobs/JobFormPage";
import MyJobsPage from "./pages/jobs/MyJobsPage";
```

Add the route declarations inside the `<MainLayout />` `<Route>`, after the existing `/login` route and before `/community/...`:

```jsx
{/* Jobs */}
<Route path="/jobs" element={<JobListPage />} />
<Route path="/jobs/new" element={<ProtectedRoute requiredRole="employer"><JobFormPage /></ProtectedRoute>} />
<Route path="/jobs/:id" element={<JobDetailPage />} />
<Route path="/jobs/:id/edit" element={<ProtectedRoute requiredRole="employer"><JobFormPage /></ProtectedRoute>} />
<Route path="/my/jobs" element={<ProtectedRoute requiredRole="employer"><MyJobsPage /></ProtectedRoute>} />
```

**Route order matters**: `/jobs/new` must come before `/jobs/:id` for react-router to match it correctly (otherwise `:id` would absorb `new`).

- [ ] **Step 2: HomePage preview section**

In `frontend/src/pages/HomePage.jsx`, add imports near the top:

```jsx
import JobCard from "../components/jobs/JobCard";
import { getSavedLocation } from "../components/jobs/LocationPicker";
```

Add jobs state and effect alongside the existing `notices` and `recentPosts`:

```jsx
const [jobs, setJobs] = useState([]);
const [hasLocation] = useState(() => Boolean(getSavedLocation()));

useEffect(() => {
  const loc = getSavedLocation();
  const params = new URLSearchParams({ size: "3" });
  if (loc) {
    params.set("lat", loc.lat);
    params.set("lng", loc.lng);
    params.set("radius_km", "5");
  }
  api.get(`/api/jobs?${params.toString()}`)
    .then((r) => setJobs(r.data.items))
    .catch(() => {});
}, []);
```

Add a new section after the `<section className={styles.hero}>` block and before the existing notices section:

```jsx
<section className={styles.section}>
  <div className={styles.sectionHeader}>
    <h2 className={styles.sectionTitle}>
      {hasLocation ? "내 동네 알바" : "최신 알바"}
    </h2>
    <Link to="/jobs" className={styles.moreLink}>더보기</Link>
  </div>
  {jobs.length > 0 ? (
    <div className={styles.jobsPreview}>
      {jobs.map((j) => <JobCard key={j.id} job={j} />)}
    </div>
  ) : (
    <p className={styles.jobsEmpty}>
      {hasLocation
        ? "주변에 등록된 알바가 없습니다."
        : <><Link to="/jobs">내 위치를 설정</Link>하면 가까운 알바를 보여드립니다.</>}
    </p>
  )}
</section>
```

- [ ] **Step 3: Add HomePage CSS for preview**

Append to `frontend/src/pages/HomePage.module.css`:

```css
.jobsPreview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--sp-3);
}

.jobsEmpty {
  padding: var(--sp-5);
  text-align: center;
  color: var(--color-ink-mute);
  background: var(--color-surface);
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-md);
}
.jobsEmpty a { font-weight: 600; }
```

- [ ] **Step 4: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: clean build, no JSX/import errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/HomePage.jsx frontend/src/pages/HomePage.module.css
git commit -m "feat(m4a): wire job routes in App.jsx and add HomePage 내 동네 알바 preview"
```

---

## Phase 5 — End-to-end verification & docs

### Task 22: Full E2E manual smoke (servers + browser)

**Files:** none modified — execution only.

- [ ] **Step 1: Start backend**

```bash
cd backend && uvicorn main:app --reload --port 8001
```

Look for the migration log lines (PostGIS, user table, GiST index) — all should print without error.

- [ ] **Step 2: Start frontend (separate terminal)**

```bash
cd frontend && npm run dev
```

Note the actual port — Vite will pick 5173, 5174, or another if those are taken. Open the printed URL in the browser.

- [ ] **Step 3: Register an employer**

In the browser, click **로그인**, switch to **Register**, choose **사장님** role, fill form (e.g., username `boss1`, email `boss1@example.com`, password `pw12345`), submit.

Expected: redirected to home (or `/admin` if role were admin — for employer it's `/`).

- [ ] **Step 4: Post a job**

Click `알바` in TopBar → click `알바 등록`. Fill:
- 제목: 소담김밥 역삼점 홀서빙 급구
- 사업장: 소담김밥 역삼점
- 주소: 서울 강남구 역삼동 123-45
- 위치: click 지도/현재위치 → 현재 위치 사용 (or input lat=37.5012, lng=127.0396)
- 급여: 시급 12000
- 카테고리: 홀서빙
- 설명: any markdown text

Submit. Expected: redirects to `/jobs/<id>/edit`. Upload one image. Verify image appears in the grid below the form.

- [ ] **Step 5: Browse as 알바생**

Logout (TopBar → 로그아웃). Register a regular user (alba1, role 알바생). Navigate to `/jobs`. The location picker modal should pop up — enter or click 현재 위치, save.

Expected: the job from Step 4 appears as a JobCard with distance indicator. Click it.

In `/jobs/:id`: verify hero image, title, business name, pay, category, description render. Verify "지원하기 (준비 중)" button is disabled. Verify view_count increments on each refresh.

- [ ] **Step 6: Edit + delete as owner**

Logout, log back in as `boss1`. Navigate to `/my/jobs`. Verify the job shows in the table.

Click 수정 → change title. Save. Verify new title appears in `/jobs/:id`.

Toggle status `모집 중` → `마감`. Refresh `/jobs` (as guest or alba1) — verify the job no longer appears (since list filters `status='active'`).

Toggle back to `모집 중`. Verify it reappears in `/jobs`.

Delete from `/my/jobs`. Confirm. Verify gone from `/jobs` and `/jobs/:id` returns 404 (the page should show "알바를 찾을 수 없습니다.").

- [ ] **Step 7: Negative checks**

- Try `/jobs/new` while logged out → should redirect to `/login`.
- Try `/jobs/new` as `alba1` (role=user) → should redirect to `/`.
- Try `/my/jobs` as `alba1` → should redirect to `/`.
- Try editing boss1's job from alba1 (visit `/jobs/<id>/edit` directly while logged in as alba1) → ProtectedRoute redirects to `/`. If you bypass the route guard, the API still returns 403 on PUT.

Stop both servers when done.

- [ ] **Step 8: Update docs (work-log + bugfix-log entries)**

Append to `docs/work-log.md`:

```markdown
## 2026-04-26 — M4a Job 도메인 구현

- 알바 도메인 (Job + JobImage) MVP 완성
- PostGIS 거리 검색, employer 역할 신설, /jobs 4 페이지
- M4b(지원), M4c(리뷰)는 별도 spec 예정
```

Append to `docs/upgrade-log.md`:

```markdown
| 2026-04-26 | M4a — Job CRUD + JobImage + PostGIS 거리 검색 + employer 역할 | feat | backend/{models,routers}/job*, frontend/src/pages/jobs/*, frontend/src/components/jobs/* |
```

Update `docs/dev-plan.md` — change M4 row to track M4a as 완료, M4b/c 예정:

Replace the existing M4 row with:

```markdown
| M4a | Job CRUD + JobImage + 거리 검색 + employer 역할 | 완료 |
| M4b | Application 상태 머신 + 마이페이지 | 예정 |
| M4c | 양방향 Review + 동시 공개 + 사업장 평점 | 예정 |
```

Also update the 기능 목록 table — replace the relevant rows:

```markdown
| 알바 등록/조회 (M4a) | 완료 | PostGIS 기반 거리 검색 |
| 지원/심사/승인 흐름 | 예정 | M4b |
```

- [ ] **Step 9: Commit doc updates**

```bash
git add docs/work-log.md docs/upgrade-log.md docs/dev-plan.md
git commit -m "docs: M4a 완료 — work/upgrade/dev-plan 갱신"
```

---

### Task 23: Final verification

**Files:** none modified.

- [ ] **Step 1: Frontend build clean**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `built in <ms>` with no errors and no warnings about missing imports.

- [ ] **Step 2: Backend imports clean**

```bash
cd backend && python -c "import main; print('OK')"
```

Expected: `OK` (no exception).

- [ ] **Step 3: Health check end-to-end**

Start backend (`uvicorn main:app --port 8001`). In another shell:

```bash
curl -s http://127.0.0.1:8001/health | python -m json.tool
```

Expected: `status: ok`, `db: connected`, `documents: 4`. Stop backend.

- [ ] **Step 4: Git status clean**

```bash
git status
git log --oneline -25
```

Expected: working tree clean, recent commits show the M4a task chain.

- [ ] **Step 5: Push (optional, ask user)**

Per the existing pattern, do not push without explicit user authorization. Stop here and report completion to the user, asking if they want to push.

---

## Plan completion summary

After all 23 tasks: M4a delivered. Backend has Job/JobImage models, jobs router with 8 endpoints, three new lifespan migrations, employer role. Frontend has 4 new pages, 3 reusable components, role hierarchy in ProtectedRoute, location picker, HomePage preview. All work covered by manual smoke checks per the spec's test strategy.

Next milestones (M4b — Application, M4c — Review) need their own brainstorming + spec + plan cycles.
