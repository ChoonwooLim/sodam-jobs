# 업그레이드 로그

| 날짜 | 변경 내용 | 카테고리 | 관련 파일 |
|------|-----------|----------|-----------|
| 2026-04-26 | 프로젝트 풀스택 부트스트랩 (`/init`) — Next.js MVP 폐기 후 FastAPI + React로 재구성 | feat | 전체 |
| 2026-04-26 | 백엔드 8 라우터 (auth/admin/boards/comments/files/docs/skills/plugins) | feat | `backend/routers/*` |
| 2026-04-26 | 프론트엔드 16 페이지 + Architectural Futurism 디자인 시스템 | feat | `frontend/src/**/*` |
| 2026-04-26 | 멀티스테이지 Dockerfile + Orbitron.yaml | infra | `Dockerfile`, `Orbitron.yaml` |
| 2026-04-26 | M4a — Job CRUD + JobImage + PostGIS 거리 검색 + employer 역할 (4 프론트 페이지, 3 컴포넌트, 8 endpoint) | feat | `backend/{models,routers}/job*`, `backend/main.py`, `frontend/src/pages/jobs/*`, `frontend/src/components/jobs/*` |
| 2026-04-26 | Orbitron PG 컨테이너를 `postgis/postgis:15-3.5-alpine`으로 교체 (drop-in, 기존 volume 보존) | infra | (Orbitron 호스트 docker run) |
