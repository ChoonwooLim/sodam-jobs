# 업그레이드 로그

| 날짜 | 변경 내용 | 카테고리 | 관련 파일 |
|------|-----------|----------|-----------|
| 2026-04-26 | 프로젝트 풀스택 부트스트랩 (`/init`) — Next.js MVP 폐기 후 FastAPI + React로 재구성 | feat | 전체 |
| 2026-04-26 | 백엔드 8 라우터 (auth/admin/boards/comments/files/docs/skills/plugins) | feat | `backend/routers/*` |
| 2026-04-26 | 프론트엔드 16 페이지 + Architectural Futurism 디자인 시스템 | feat | `frontend/src/**/*` |
| 2026-04-26 | 멀티스테이지 Dockerfile + Orbitron.yaml | infra | `Dockerfile`, `Orbitron.yaml` |
| 2026-04-26 | M4a — Job CRUD + JobImage + PostGIS 거리 검색 + employer 역할 (4 프론트 페이지, 3 컴포넌트, 8 endpoint) | feat | `backend/{models,routers}/job*`, `backend/main.py`, `frontend/src/pages/jobs/*`, `frontend/src/components/jobs/*` |
| 2026-04-26 | Orbitron PG 컨테이너를 `postgis/postgis:15-3.5-alpine`으로 교체 (drop-in, 기존 volume 보존) | infra | (Orbitron 호스트 docker run) |
| 2026-04-26 | M4a → main 머지 (28 commits) | feat | 전체 |
| 2026-04-26 | master → main 브랜치 rename + GitHub 기본 브랜치 변경 + origin/master 삭제 | infra | git remote |
| 2026-04-26 | UX 라벨 알바→구인 (employer 시점만 — TopBar/JobListPage/JobFormPage/MyJobsPage) | style | `components/layout/TopBar.jsx`, `pages/jobs/*` |
| 2026-04-26 | `/mobile-preview` 페이지 + TopBar "모바일" 링크 (디바이스 토글 + 빠른 경로 + URL 입력) | feat | `pages/MobilePreviewPage.jsx`, `components/layout/TopBar.jsx`, `App.jsx` |
| 2026-04-26 | M-Mobile (모바일 퍼스트 재설계) spec 작성 — 셸/BottomNav/PageHeader/PWA basic/셈하나 크로스프로모 | docs | `docs/superpowers/specs/2026-04-26-mobile-first-redesign-design.md` |
| 2026-04-26 | M-Mobile 구현 plan 작성 — 20 task 8 phase | docs | `docs/superpowers/plans/2026-04-26-mobile-first-redesign.md` |
| 2026-04-26 | M-Mobile Batch 1 — externalLinks + SemhanaLink (3 variants) + PageHeader 컴포넌트 (worktree `m-mobile`) | feat | `frontend/src/lib/externalLinks.js`, `frontend/src/components/layout/SemhanaLink.*`, `PageHeader.*` |
