# M4a — Job 도메인 모델 설계

- **작성일**: 2026-04-26
- **마일스톤**: M4a (M4의 1단계 — Job CRUD + 거리 검색)
- **상태**: 설계 승인 후 plan 작성 대기

## 배경

[docs/dev-plan.md](../../dev-plan.md)의 M4("알바 도메인 모델")는 Job · Application · Review 세 도메인이 묶여 규모가 크다. 한 번에 구현하면 PR이 비대해지고 디자인 결함이 늦게 드러나므로 다음 3단계로 분할:

- **M4a**: Job CRUD + JobImage + 거리 기반 검색 + employer 역할 (이 문서)
- **M4b**: Application 상태 머신 + 마이페이지 (별도 spec)
- **M4c**: 양방향 Review + 동시 공개 + 사업장 평점 (별도 spec)

이 spec은 M4a만 다룬다. M4b/c는 M4a 검증 후 별도 브레인스토밍.

## 결정 사항 요약 (브레인스토밍 결과)

| ID | 결정 | 선택 |
|----|------|------|
| Q1 | Job 등록 주체 | **별도 `employer` 역할 신설** (user/employer/admin/superadmin) |
| Q2 | 거리 검색 방식 | **PostGIS 확장** + `geography(POINT, 4326)` + GiST 인덱스 |
| Q3 | Application 상태 머신 (M4b) | 6 상태 (`pending/accepted/withdrawn/completed/no_show/rejected`) — M4b에서 구현 |
| Q4 | 리뷰 방향성 (M4c) | 양방향 + 동시 공개 (작성 완료 또는 14일 경과 시 공개) — M4c에서 구현 |
| Q5a | 카테고리 | string enum 코드 (`hall/kitchen/cvs/cafe/delivery/etc`) |
| Q5b | Job 이미지 | 별도 `JobImage` 모델 |
| Q5c | 급여 | `pay_amount: int` (KRW 원 단위) + `pay_type: enum(hourly/daily/monthly)` |
| Q6 | 범위 분할 | M4 → M4a/b/c로 3분할, 이번 spec은 M4a만 |

## 데이터 모델

### User (확장)

기존 `backend/models/user.py`에 다음 변경:

- `role` 허용값: 기존 `{user, admin, superadmin}` → `{user, employer, admin, superadmin}`
  - 모델 자체는 string Field이므로 코드 레벨 검증만 추가 (`auth.py`/`admin.py`의 RoleUpdate Literal 확장)
- 신규 nullable 컬럼:
  - `nickname: Optional[str]` — 표시용 닉네임 (없으면 username 사용)
  - `phone: Optional[str]` — 사장님↔알바 연결용 (M4b/c에서 사용 예정, M4a는 등록 폼에 placeholder만)
  - `neighborhood: Optional[str]` — 동네명 ("강남구 역삼동"). 좌표 검색 fallback 표시용

ALTER가 필요하므로 lifespan에 raw SQL 마이그레이션 함수 추가 (아래 [마이그레이션](#마이그레이션) 참조).

### Job (신규)

`backend/models/job.py`:

```python
from typing import Any, Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from geoalchemy2 import Geography


class Job(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    employer_id: int = Field(foreign_key="user.id", index=True)

    title: str
    description: str = ""              # markdown
    business_name: str
    address: str                       # 사람이 읽는 주소 텍스트

    # PostGIS POINT (lng, lat). SRID 4326 = WGS84 (lat/lng 표준).
    # Python-side 타입은 Any — DB에서 WKBElement, 입력 시 WKTElement('POINT(lng lat)', srid=4326).
    location: Any = Field(sa_column=Column(Geography(geometry_type="POINT", srid=4326)))

    pay_type: str = Field(default="hourly")  # hourly | daily | monthly
    pay_amount: int                          # KRW (원). 시급 12000, 일급 80000, 월급 2500000
    category: str = Field(index=True)        # hall | kitchen | cvs | cafe | delivery | etc

    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None

    status: str = Field(default="active", index=True)  # active | closed | expired
    view_count: int = Field(default=0)
    is_verified: bool = Field(default=False)           # SodamFN 안심 사업장 배지

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
```

**카테고리 코드 → 라벨 매핑**은 프론트엔드(`frontend/src/lib/jobConstants.js`)에서 하드코딩:

```js
export const JOB_CATEGORIES = {
  hall: "홀서빙",
  kitchen: "주방",
  cvs: "편의점",
  cafe: "카페",
  delivery: "배달",
  etc: "기타",
};
```

### JobImage (신규)

`backend/models/job_image.py`:

```python
class JobImage(SQLModel, table=True):
    __tablename__ = "job_image"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="job.id", index=True)
    stored_path: str            # /uploads/<uuid>.<ext>
    original_name: str
    file_size: int
    sort_order: int = Field(default=0)
    uploaded_at: datetime = Field(default_factory=datetime.now)
```

기존 `FileRecord`는 게시판 첨부 그대로 두고, Job 이미지는 별도 모델로 관리. 업로드 API는 동일한 디스크 위치(`UPLOAD_DIR`) 사용.

### M4b/c 예고 (이번 구현 안 함)

- `Application(job_id FK, applicant_id FK user, status, applied_at, decided_at, completion_marked_at)`
- `Review(reviewer_id FK user, reviewee_id FK user, application_id FK, rating int, comment, hidden_until datetime)`

위 두 모델은 M4b/c에서 추가하지만 Job 설계에 영향 없으므로 M4a에선 신경 쓰지 않음.

## 마이그레이션

### PostGIS extension

`backend/main.py` lifespan 시작부에서 시도:

```python
def _ensure_postgis():
    from sqlmodel import Session
    from sqlalchemy import text
    with Session(database.engine) as session:
        try:
            session.exec(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            session.commit()
            print("[migrate] PostGIS extension ready")
        except Exception as e:
            print(f"[migrate] PostGIS ERROR — manual install required: {e}")
            print("  Run on Orbitron: ssh stevenlim@192.168.219.101 \\")
            print("    sudo docker exec -it <pg-container> psql -U orbitron_user -d orbitron_db -c 'CREATE EXTENSION postgis;'")
            raise
```

권한 부족 시 startup 실패 → 로그가 명확한 안내를 출력. 한 번 수동 실행하면 이후 재시작 시 통과.

### User ALTER

```python
def _apply_user_migrations():
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
```

### 신규 테이블 + 인덱스

`SQLModel.metadata.create_all`이 `job`, `job_image` 테이블을 자동 생성. PostGIS GiST 인덱스는 별도 SQL로:

```python
def _ensure_geo_indexes():
    from sqlmodel import Session
    from sqlalchemy import text
    with Session(database.engine) as session:
        session.exec(text("CREATE INDEX IF NOT EXISTS idx_job_location ON job USING GIST(location)"))
        session.commit()
```

### lifespan 호출 순서

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    _copy_gallery_defaults()
    _ensure_postgis()             # NEW — 실패 시 raise
    _apply_user_migrations()      # NEW
    create_db_and_tables()        # 기존 — Job/JobImage 신규 테이블 생성
    _ensure_geo_indexes()         # NEW
    _seed_admin()
    _seed_docs()
    yield
```

### requirements.txt 추가

```
geoalchemy2
```

## 인증 / 권한

`backend/deps.py`에 추가:

```python
def require_employer(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("employer", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Employer or admin access required")
    return user
```

**`auth.py` 변경**: `RegisterRequest`에 `role: Literal["user", "employer"] = "user"` 추가. `register()`에서 이 값을 그대로 User에 저장. admin/superadmin은 register 경로로 받지 않음 (admin이 `/api/admin/users/{id}/role` 통해서만 부여).

## API 엔드포인트

`backend/routers/jobs.py` 신규 — `/api/jobs` 프리픽스로 `main.py`에 include.

| Method · Path | 권한 | 비고 |
|---|---|---|
| `GET /api/jobs` | public | 필터 + 거리 정렬 |
| `GET /api/jobs/my` | `require_employer` | 내가 등록한 알바 (status 무관, 최신순) |
| `GET /api/jobs/{id}` | public | view_count++, JobImage 포함 |
| `POST /api/jobs` | `require_employer` | employer_id = current_user.id |
| `PUT /api/jobs/{id}` | owner or admin | 부분 수정 |
| `DELETE /api/jobs/{id}` | owner or admin | hard delete + JobImage cascade + 디스크 파일 삭제 |
| `POST /api/jobs/{id}/images` | owner or admin | multipart/form-data, JobImage 레코드 생성 |
| `DELETE /api/jobs/{id}/images/{image_id}` | owner or admin | 디스크 파일도 삭제 |

**Owner 정의**: `Job.employer_id == current_user.id`. PUT/DELETE 시 비owner는 admin/superadmin이 아니면 403.

**`is_verified` (SodamFN 안심 사업장 배지)**: owner의 POST/PUT 페이로드에서 `is_verified`는 항상 무시. admin/superadmin이 PUT으로만 변경 가능. 즉 일반 employer는 자기 Job을 verified로 만들 수 없음.

**라우트 순서 주의**: `/api/jobs/my`가 `/api/jobs/{id}` 보다 먼저 정의되어야 FastAPI가 `my`를 동적 path로 해석하지 않음. 또는 `{id}` 타입을 `int`로 명시해 자동 분기.

### `GET /api/jobs` 쿼리 파라미터

| 파라미터 | 타입 | 기본 | 설명 |
|---|---|---|---|
| `lat` | float | None | 검색 기준점 위도 |
| `lng` | float | None | 검색 기준점 경도 |
| `radius_km` | float | 5 | `lat/lng` 있을 때 검색 반경 |
| `category` | str | None | 카테고리 필터 |
| `pay_type` | str | None | hourly/daily/monthly |
| `pay_min` | int | None | 최소 급여 |
| `q` | str | None | 제목/설명 LIKE 검색 |
| `page` | int | 1 | |
| `size` | int | 20 | max 100 |

**거리 정렬 SQL**:

```sql
SELECT j.*,
       ST_Distance(j.location, ST_MakePoint(:lng, :lat)::geography) AS distance_m
FROM job j
WHERE j.status = 'active'
  AND ST_DWithin(j.location, ST_MakePoint(:lng, :lat)::geography, :radius_m)
  AND (:category IS NULL OR j.category = :category)
  AND (:pay_type IS NULL OR j.pay_type = :pay_type)
  AND (:pay_min IS NULL OR j.pay_amount >= :pay_min)
  AND (:q IS NULL OR j.title ILIKE '%' || :q || '%' OR j.description ILIKE '%' || :q || '%')
ORDER BY distance_m
LIMIT :size OFFSET :offset;
```

`lat/lng` 누락 시 거리 절(`ST_DWithin`/`ST_Distance` 부분)을 빼고 `ORDER BY j.created_at DESC`. 응답 JSON에 `distance_m`(미터)을 포함하면 프론트에서 km/m 환산 표시.

**`GET /api/jobs` 응답 스키마**:

```json
{
  "items": [
    {
      "id": 1,
      "title": "...",
      "business_name": "...",
      "address": "...",
      "lat": 37.5012, "lng": 127.0396,
      "pay_type": "hourly", "pay_amount": 12000,
      "category": "hall",
      "status": "active",
      "is_verified": true,
      "view_count": 42,
      "thumbnail": "/uploads/<first-image>.jpg",
      "distance_m": 312.4,
      "created_at": "2026-04-26T10:30:00"
    }
  ],
  "total": 87,
  "page": 1,
  "size": 20
}
```

`thumbnail`은 `JobImage` 중 `sort_order` 가장 낮은 1장의 `stored_path`. 없으면 `null`. 상세(`GET /api/jobs/{id}`) 응답에는 `images` 배열로 모든 JobImage 포함.

### POST/PUT 페이로드

```json
{
  "title": "소담김밥 역삼점 홀서빙 급구",
  "description": "마크다운 본문",
  "business_name": "소담김밥 역삼점",
  "address": "서울 강남구 역삼동 ...",
  "lat": 37.5012,
  "lng": 127.0396,
  "pay_type": "hourly",
  "pay_amount": 12000,
  "category": "hall",
  "starts_at": "2026-05-01T10:00:00",
  "ends_at": "2026-08-31T14:00:00"
}
```

서버에서 `lat/lng` → `WKTElement('POINT(:lng :lat)', srid=4326)` 변환. (GeoAlchemy2 helper 사용)

## 프론트엔드

### 신규 페이지

| 경로 | 컴포넌트 | 권한 |
|---|---|---|
| `/jobs` | `pages/jobs/JobListPage.jsx` | public |
| `/jobs/:id` | `pages/jobs/JobDetailPage.jsx` | public |
| `/jobs/new` | `pages/jobs/JobFormPage.jsx` | employer+ (ProtectedRoute requiredRole="employer") |
| `/jobs/:id/edit` | `pages/jobs/JobFormPage.jsx` (재사용) | owner/admin (페이지 내 권한 체크) |
| `/my/jobs` | `pages/jobs/MyJobsPage.jsx` | employer+ |

### 신규 컴포넌트

- `components/jobs/JobCard.jsx` + `.module.css` — 리스트 카드 (이미지/제목/회사/거리/급여/배지)
- `components/jobs/JobFilters.jsx` + `.module.css` — 카테고리 탭, 급여/반경 슬라이더
- `components/jobs/LocationPicker.jsx` + `.module.css` — 위치 입력 모달 (lat/lng 직접 입력 + "현재 위치" 버튼 — `navigator.geolocation`)
- `lib/jobConstants.js` — 카테고리 코드↔라벨, pay_type 라벨

### `ProtectedRoute` 확장

기존:
```jsx
if (requiredRole && user?.role !== requiredRole && user?.role !== "superadmin") return <Navigate />
```

확장: `requiredRole="employer"`인 경우 `employer/admin/superadmin` 모두 통과. 매핑 테이블로 정리:

```js
const ROLE_HIERARCHY = { user: 0, employer: 1, admin: 2, superadmin: 3 };
const passes = (userRole, required) =>
  ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
```

### 기존 변경

- `LoginPage.jsx`: register 모드에 역할 라디오 추가 — `알바생(user)` / `사장님(employer)`. 디자인은 기존 input group 톤 따라감.
- `TopBar.jsx`: NAV에 `알바` (`/jobs`) 추가. 기존 `커뮤니티` 옆.
- `HomePage.jsx`: 기존 hero 아래, 공지/Q&A 위에 "내 동네 알바 미리보기" 섹션 추가 (`GET /api/jobs?lat&lng&size=3`, 위치 없으면 fallback 메시지 + 위치 설정 버튼)
- `Sidebar.jsx`: 변화 없음 (`/jobs` 는 sidebar 아닌 TopBar nav)

### 위치 저장 정책

브라우저 `localStorage.userLocation = {lat, lng, neighborhood, savedAt}` 캐시. 만료 정책 없음(수동 변경). 없을 때:
- HomePage 미리보기 섹션: "내 동네 설정" 버튼 표시
- `/jobs` 진입 시 위치 미설정이면 LocationPicker 모달 자동 노출 (한 번 닫으면 세션 동안 다시 안 띄움)

## 검증 시나리오 (manual smoke)

1. **마이그레이션**: 백엔드 첫 시작 시 `[migrate] PostGIS extension ready`, ALTER 로그, GiST 인덱스 생성 로그 확인
2. **회원가입**: employer로 가입 → DB에서 `role='employer'` 확인
3. **Job 등록**: `/jobs/new`에서 "소담김밥 역삼점" + lat=37.5012, lng=127.0396 등록
4. **이미지 업로드**: 등록 후 상세 페이지에서 이미지 1장 업로드 → JobImage 레코드 생성 + `/uploads/...` 접근 확인
5. **거리 검색**: 다른 user로 로그인 → `/jobs`에서 위치 입력(37.50, 127.04, radius 5km) → 등록한 Job이 첫 번째에 거리 표시
6. **수정**: owner로 수정, 비owner는 403
7. **삭제**: owner로 삭제 → JobImage 함께 삭제 + 디스크 파일도 사라짐
8. **`/my/jobs`**: 등록한 Job 노출, status 토글 active↔closed 동작
9. **/health 응답**: 신규 도메인이 health 영향 없는지 확인 (Job/JobImage 카운트 추가하면 좋음 — out of scope, 다음에)

## 범위 제외 (Out of Scope)

- 지원(Application) 흐름 — **M4b** 별도 spec
- 리뷰 시스템 — **M4c** 별도 spec
- 카카오/네이버 지도 위젯 임베드 — 추후 (현재는 lat/lng 입력 + "현재 위치" 버튼으로 충분)
- 푸시/이메일 알림 — 미정
- 자동 만료(`expires_at`) cron — `status=expired` 자동 전환은 추후 별도 작업
- 이미지 리사이징/썸네일 — 추후
- 자동화 테스트 — 현 코드베이스에 테스트 인프라 없음. 본 spec에서도 manual smoke만. 테스트 도입은 별도 의제.

## 의존성 / 외부 작업

- **GeoAlchemy2** 패키지 추가 (`backend/requirements.txt`)
- **PostGIS extension on Orbitron PG** — 자동 시도 + 권한 부족 시 명확한 안내. 안내 문구대로 한 번만 수동 실행하면 됨.

## 파일 변경/추가 요약

**Backend 신규**
- `backend/models/job.py`
- `backend/models/job_image.py`
- `backend/routers/jobs.py`

**Backend 수정**
- `backend/models/__init__.py` (Job/JobImage export)
- `backend/main.py` (lifespan에 마이그레이션 함수 추가, jobs 라우터 include)
- `backend/deps.py` (`require_employer` 추가)
- `backend/routers/auth.py` (RegisterRequest에 role)
- `backend/routers/admin.py` (RoleUpdate Literal 확장)
- `backend/requirements.txt` (geoalchemy2 추가)

**Frontend 신규**
- `frontend/src/pages/jobs/JobListPage.jsx` + `.module.css`
- `frontend/src/pages/jobs/JobDetailPage.jsx` + `.module.css`
- `frontend/src/pages/jobs/JobFormPage.jsx` + `.module.css`
- `frontend/src/pages/jobs/MyJobsPage.jsx` + `.module.css`
- `frontend/src/components/jobs/JobCard.jsx` + `.module.css`
- `frontend/src/components/jobs/JobFilters.jsx` + `.module.css`
- `frontend/src/components/jobs/LocationPicker.jsx` + `.module.css`
- `frontend/src/lib/jobConstants.js`

**Frontend 수정**
- `frontend/src/App.jsx` (라우트 추가)
- `frontend/src/components/ProtectedRoute.jsx` (역할 계층)
- `frontend/src/components/layout/TopBar.jsx` ("알바" 메뉴)
- `frontend/src/pages/LoginPage.jsx` (역할 라디오)
- `frontend/src/pages/HomePage.jsx` (내 동네 알바 미리보기)
