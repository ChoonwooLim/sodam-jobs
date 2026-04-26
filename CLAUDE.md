# SodamJobs

동네 단위 단기 알바 직거래 플랫폼 (당근알바 스타일).

## 프로젝트 구조

- `backend/` — FastAPI 백엔드 (Python 3.12, SQLModel, PostgreSQL)
- `frontend/` — React + Vite (port 5173)
- `docs/` — 프로젝트 문서 (마크다운, `/end` 스킬로 자동 업데이트)
- `Dockerfile` — 멀티스테이지 빌드 (Node 빌드 → Python 서빙)
- `Orbitron.yaml` — Orbitron 배포 설정

## 메뉴 / 라우트

**Public**: `/` 홈, `/about`, `/services`, `/login`
**Community**: `/community/{notice|qna|gallery|video}`, `/community/{board}/{id}`
**Admin** (admin 이상): `/admin`, `/admin/users`, `/admin/boards`, `/admin/docs/{key}`, `/admin/skills`, `/admin/plugins`

## 로컬 개발

- Backend: `cd backend && uvicorn main:app --reload --port 8001` (port **8001** — 8000은 OpenClaw 컨트롤 패널이 점유)
- Frontend: `cd frontend && npm run dev` (port 5173)
- Vite proxy(`/api`, `/uploads`, `/health`)는 `localhost:8001`로 향함
- 로컬 dev `DATABASE_URL`은 `192.168.219.101:3101` (LAN IP) 사용. Docker 컨테이너 안에서는 `orbitron-sodam-jobs-db:3101` (Docker 내부 alias)이 자동 적용됨 — Dockerfile ENV에 박혀있음

## 인증

- JWT (Bearer Token), 24h expiry
- 역할: user / admin / superadmin
- 어드민: `/admin` (admin 이상)
- ⚠️ python-jose는 JWT `sub`을 문자열로 요구 → `str()` 변환 필수

## Git

- 기본 브랜치 `main` 사용 (Orbitron이 main을 기본으로 clone)

## 배포

- Orbitron + PostgreSQL on Linux
- Windows에서는 commit/push만, 배포는 Orbitron 대시보드
- **반드시 프로젝트 루트에 `Dockerfile` 포함** (Orbitron 자동 생성 Dockerfile 의존 금지)
- 멀티스테이지: Node(프론트 빌드) → Python(백엔드 + 정적 서빙)
- **반드시 `.dockerignore` 로 `.env` 차단** (로컬 DB URL 침투 방지)
- Dockerfile `ENV` 로 기본 환경변수, Orbitron 대시보드에서 override

## .env 규칙

- 로컬 개발 전용 (`.gitignore` + `.dockerignore` 포함)
- 형식: `KEY=value` (접두어/설명 금지). `Internal DATABASE_URL=...` ← ❌
- Docker는 Dockerfile ENV 또는 Orbitron 대시보드 사용
- 비환경변수 메모(SSH, 토큰)는 `.env`에 넣지 말 것

## 파일 업로드 / 이미지 서빙

- **`UPLOAD_DIR` 빈 문자열 방어 필수** — `Path("")`는 CWD로 해석. `.strip()` 후 falsy 체크
- **`StaticFiles` mount 금지** — Docker VOLUME과 충돌. 명시적 API 라우트(`@app.get("/uploads/{filename:path}")`)
- **갤러리 기본 이미지는 `backend/gallery_defaults/`** — Docker COPY/VOLUME 의존하지 않음
- **Vite 프록시 필수** — `<img src="/uploads/...">`가 HTML로 응답하지 않도록 `vite.config.js`에 `/api`, `/uploads`, `/health` 프록시
- **`api.js` baseURL = `""`** (same-origin) — Vite 프록시 + Docker same-origin 통일
- `/health` 응답에 `uploads_dir`, `uploads_files` 포함 → 배포 진단

## 커밋 메시지

- `feat:` 새 기능 / `fix:` 버그 / `style:` UI / `refactor:` / `docs:` / `infra:`
