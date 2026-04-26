# 버그수정 로그

| 날짜 | 버그 | 원인 | 수정 내용 | 관련 파일 |
|------|------|------|-----------|-----------|
| 2026-04-26 | (Pre-emptive) JWT sub 디코딩 실패 | python-jose가 `sub` 클레임을 문자열로 검증 | `str(to_encode["sub"])` + `int(payload.get("sub"))` 변환 | `auth_service.py`, `deps.py` |
| 2026-04-26 | (Pre-emptive) 로그인 리다이렉트 루프 | 401 인터셉터가 auth 엔드포인트도 처리 | `/api/auth/` URL 제외 + 이미 로그인 시 리다이렉트 | `api.js`, `LoginPage.jsx` |
| 2026-04-26 | (Pre-emptive) UPLOAD_DIR 빈 문자열 | `Path("")`가 CWD로 해석되어 소스 디렉토리를 uploads로 착각 | `.strip()` 후 falsy 체크 | `main.py`, `routers/files.py` |
| 2026-04-26 | (Pre-emptive) /uploads 서빙 404 | StaticFiles mount가 Docker VOLUME과 충돌 | 명시적 API 라우트 사용 | `main.py` |
| 2026-04-26 | (Pre-emptive) Vite dev에서 이미지가 HTML로 응답 | 프록시 누락 | `/api`, `/uploads`, `/health` 프록시 설정 | `vite.config.js` |
| 2026-04-26 | M4a `routers/files.py` + `routers/jobs.py` UPLOAD_DIR이 `backend/uploads/`로 해석돼 `main.py` 서빙 경로(`<root>/uploads/`)와 어긋남 | `Path(__file__).resolve().parent.parent` 가 `backend/`를 가리키는데 `main.py`는 `parent.parent`가 root | 두 라우터를 `.parent.parent.parent`로 교정해 main.py와 일치 | `routers/files.py`, `routers/jobs.py` |
| 2026-04-26 | M4a `delete_job` 시 자식 `JobImage` 삭제 후 부모 `Job` 삭제하면 SA가 부모를 먼저 DELETE 시도 → FK 위반 | Job/JobImage 사이에 SQLAlchemy `relationship()` 정의 없이 DB-level FK만 존재해 unit-of-work 가 ordering 추론 불가 | 자식 delete 후 `session.flush()` 추가, commit 이후 디스크 unlink로 순서 변경 | `routers/jobs.py` |
| 2026-04-26 | M4a `ProtectedRoute`의 미지정 `requiredRole`이 누구나 통과시킴 | `?? 0` (lowest tier)으로 fallback | `?? Infinity`로 fail-secure | `components/ProtectedRoute.jsx` |
| 2026-04-26 | M4a `JobFilters`가 미지정 `value` props에 TypeError | `value.category` 참조 | default `value = {}` | `components/jobs/JobFilters.jsx` |
| 2026-04-26 | M4a `MyJobsPage` status 토글이 expired→active로 자동 전환 | `j.status === "active" ? "closed" : "active"` 분기가 expired도 fallback | expired는 정적 배지로 렌더, 토글은 active↔closed만 | `pages/jobs/MyJobsPage.jsx` |
| 2026-04-26 | `_ensure_postgis` 에러 메시지의 em-dash가 Windows cp949에서 UnicodeEncodeError | 한글 콘솔 기본 인코딩 | em-dash → `--`로 교체 | `backend/main.py` |
| 2026-04-26 | Orbitron 첫 배포 시 `fatal: 리모트의 main 브랜치가 업스트림 origin에 없습니다` | 로컬 브랜치는 `master`인데 Orbitron deploy 스크립트는 `main` clone | `git branch -m master main` + push -u + GitHub 기본 브랜치 변경 + origin/master 삭제 | git remote |
| 2026-04-26 | Orbitron 컨테이너 부팅 후 `psycopg2.OperationalError: connection refused at port 3101` | Dockerfile DATABASE_URL이 호스트 publish 포트(3101)를 사용 — Docker 내부 네트워크에선 INTERNAL 포트(5432)로 가야 함 | Dockerfile ENV `:3101/` → `:5432/` | `Dockerfile` |
| 2026-04-26 | Cloudflare 502 — Orbitron 앱 컨테이너로 라우팅되지만 응답 없음 | Orbitron이 `PORT=3374` env 주입 + publish `3374:3374`인데 우리 CMD는 hardcoded `--port 8000` (컨테이너 8000에 listen, 3374는 listener 없음) | shell-form CMD `${PORT:-8000}` 사용 + `PYTHONUNBUFFERED=1` 추가 | `Dockerfile` |
