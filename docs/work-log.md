# 작업일지

## 2026-04-26 — 프로젝트 풀스택 부트스트랩

- 기존 Next.js 16 MVP(SodamJobs frontend Phase 2)를 폐기하고 FastAPI + React + Vite + PostgreSQL 풀스택 구조로 재구성
- `/init` 스킬을 통해 backend/, frontend/, docs/, Dockerfile, Orbitron.yaml 일괄 생성
- 8개 백엔드 라우터, 16개 프론트엔드 페이지, 22개 CSS 모듈 작성
- 알바 도메인 모델은 다음 마일스톤(M4)에서 추가 예정

---

## 2026-04-26 — M4a Job 도메인 구현 (Subagent-Driven Development)

- M4를 M4a/b/c로 분할하고 M4a (Job CRUD + 거리 검색)만 이번 사이클에 구현
- 별도 worktree `c:/WORK/sodam-jobs-m4a` (브랜치 `m4a-job-domain`)에서 23 task 11 batch로 진행
- subagent + 두 단계 리뷰(spec compliance → code quality)를 모든 batch에 적용
- 인프라 변경: Orbitron PG 컨테이너를 `postgres:15-alpine` → `postgis/postgis:15-3.5-alpine`으로 교체. 기존 volume(`orbitron-sodam-jobs-db_data`) 그대로 마운트, 데이터 보존(admin 1, docs 4)
- 백엔드: `Job` (`Geography(POINT, 4326)`) + `JobImage` 모델, lifespan migrations 3종, `require_employer` 의존성, register endpoint role 수용, `/api/jobs` 8 endpoint
- 프론트엔드: 4 페이지(JobList/Detail/Form/MyJobs) + 3 컴포넌트(JobCard/JobFilters/LocationPicker), `lib/jobConstants.js`, `ProtectedRoute` 역할 계층, TopBar/LoginPage/HomePage 갱신
- 리뷰 중 발견·수정한 이슈
  - `routers/files.py` + `routers/jobs.py`의 `UPLOAD_DIR`이 `backend/uploads/`로 해석돼 `main.py` 서빙 경로(`<root>/uploads/`)와 어긋남 → 둘 다 `.parent.parent.parent`로 교정
  - `delete_job`에서 자식 `JobImage` 삭제 후 부모 `Job` 삭제 시 SA가 부모를 먼저 DELETE 시도 → FK 위반. `session.flush()` 추가
  - `delete_job`/`delete_job_image` 모두 commit 이후에 디스크 파일 unlink하도록 순서 변경 (commit 실패 시 파일 잔존, DB 무결성 우선)
  - `ProtectedRoute`의 미지정 `requiredRole`을 `?? Infinity`로 fail-secure
  - `JobFilters` 미지정 `value` props에 `{}` 기본값 (TypeError 방지)
  - `LocationPicker`에 a11y 최소(`role="dialog"`, `aria-modal`, `aria-labelledby`, focus on mount, Escape close)
  - `MyJobsPage`의 status 토글이 expired job을 active로 되돌리는 footgun → expired는 정적 배지로 렌더
  - `_ensure_postgis` 에러 메시지의 em-dash가 Windows cp949 환경에서 `UnicodeEncodeError` → `--`로 교체
- 검증: backend curl smoke (job 생성, 거리 검색 distance_m=137.8m, 이미지 업로드+fetch, owner/non-owner 권한, 삭제+cascade), frontend `npm run build` 클린 (382 modules, 485KB JS / 43KB CSS)
- 미완료/추후
  - 브라우저 E2E 검증 (사용자 직접 수행 권장)
  - master 머지
  - M4b (Application 상태 머신), M4c (양방향 Review) — 별도 spec/plan 사이클 예정

---

## 2026-04-26 (오후 후속) — M4a 머지 / Orbitron 배포 / UX 보정 / M-Mobile 사이클 시작

### 작업 요약

| 카테고리 | 작업 내용 | 상태 |
|----------|----------|------|
| feat | M4a → main 머지 (28 commits) | 완료 |
| infra | master → main 브랜치 rename + GitHub 기본 브랜치 변경 + origin/master 삭제 | 완료 |
| fix | Dockerfile DATABASE_URL 포트 3101→5432 (Docker 내부 vs 호스트 publish 혼동) | 완료 |
| fix | Dockerfile CMD `$PORT` env honor + `PYTHONUNBUFFERED=1` (Orbitron이 PORT=3374 주입) | 완료 |
| fix | UX 라벨 알바→구인 (employer 시점만 — TopBar 메뉴, JobListPage 등록 버튼, JobFormPage 헤더, MyJobsPage 헤더/빈 상태/CTA) | 완료 |
| feat | `/mobile-preview` 페이지 + TopBar "모바일" 링크 (디바이스 토글 + 빠른 경로 + URL 입력) | 완료 |
| docs | M-Mobile (모바일 퍼스트 재설계) spec + plan 작성 (5 brainstorm Q + 20 task 8 phase) | 완료 |
| feat | M-Mobile Batch 1 — `lib/externalLinks.js`, `SemhanaLink` (3 variants), `PageHeader` 컴포넌트 (worktree `m-mobile`) | 진행 중 (Batch 1/10) |

### 세부 내용

- 처음 Orbitron 배포가 3가지 단계로 막힘 → 단계별 해결:
  1. `fatal: 리모트의 main 브랜치가 업스트림 origin에 없습니다` — origin은 `master`만 있고 Orbitron은 `main` clone 시도. `git branch -m master main` + `git push -u origin main` + `gh repo edit --default-branch main` + `git push origin --delete master`로 정리.
  2. 컨테이너 시작 후 `psycopg2.OperationalError: connection refused at port 3101` — Dockerfile 기본값이 호스트 publish 포트(3101)를 사용. Docker 내부 네트워크에선 PostgreSQL INTERNAL 포트(5432)로 연결해야 함. Dockerfile ENV 수정 push.
  3. 컨테이너는 부팅됐지만 Cloudflare 502 — Orbitron이 `PORT=3374` env를 주입하고 publish도 3374:3374로 매핑하지만 우리 CMD는 hardcoded `--port 8000`. shell-form CMD `${PORT:-8000}` 사용으로 수정. 동시에 `PYTHONUNBUFFERED=1` 추가해 lifespan migration 로그 즉시 노출.
- Orbitron PostgreSQL 컨테이너를 `postgis/postgis:15-3.5-alpine`으로 교체 (M4a Batch 3에서 진행). 기존 volume `orbitron-sodam-jobs-db_data` 그대로 마운트, 데이터 보존(admin 1, docs 4) — `docker run`으로 직접 재생성, Orbitron 대시보드 환경변수 입력은 사용자가 직접 수행 (DATABASE_URL/SECRET_KEY/SUPERADMIN_PASSWORD/FRONTEND_URL).
- 사용자 피드백 "사장이 올릴 때는 알바등록이 아니라 구인등록이 되어야지" → employer 시점 라벨만 4 파일에서 교체. public 자리(홈 "내 동네 알바", `/jobs` 타이틀)는 유지.
- SodamFN admin의 `/admin-app-preview` 패턴을 SodamJobs에 도입 — `/mobile-preview` 페이지로 자체 사이트를 폰 프레임 iframe에 렌더. 디바이스 토글(스마트폰 390×844 / 태블릿 820×1180), 빠른 경로 6개, URL 입력 + Enter 새로고침.
- 사용자 추가 요청 "sodam-jobs은 모바일이 메인이니까 모바일 디자인을 각별히 신경써야 한다" → M-Mobile 사이클 분리 결정.
  - 5 brainstorm 질문 (BottomNav 구성 / 헤더 / 데스크탑 / PWA / 페이지 범위) + 추가 셈하나 크로스프로모 결정.
  - spec 작성: 모바일 셸(max-w-440px) + BottomNav 4탭 + 가운데 FAB(employer/admin) + 페이지별 sticky PageHeader + 데스크탑 사이드 패널(≥1024px).
  - plan 작성: 20 task 8 phase, ~4318 lines.
  - worktree `m-mobile` 생성 + npm install, Subagent-Driven Development 패턴 그대로 시작.
  - Batch 1 commits (`3cf63b8` externalLinks+SemhanaLink, `90e4fd0` PageHeader). Batch 2-10은 다음 세션에서 진행 예정.
- 셈하나 크로스프로모 3곳 합의 (사장님 컨텍스트만): ProfilePage 카드, MyJobsPage 빈 상태, Footer sister-link.

### 다음 세션 인계

- **즉시 이어갈 곳**: `c:/WORK/sodam-jobs-m-mobile` worktree, 브랜치 `m-mobile`, Batch 1 끝난 상태(commit `90e4fd0`).
- **다음 작업**: Batch 2 (Tasks 3-4) — BottomNav + DesktopSidePanel 컴포넌트.
- 운영 사이트: https://sodam-jobs.twinverse.org (정상 동작 중).
- 환경변수: 사용자가 Orbitron 대시보드에 4개(DATABASE_URL/SECRET_KEY/SUPERADMIN_PASSWORD/FRONTEND_URL) 입력해야 보안적으로 완전. 미입력 시에도 Dockerfile 기본값으로 동작은 함 (단 SECRET_KEY는 약함).

---

## 2026-05-11 — F-시리즈 외국인 sub-app 계획 (Capa Work 풀스택 클론)

### 작업 요약

| 카테고리 | 작업 내용 | 상태 |
|----------|----------|------|
| docs | F-시리즈 7-cycle 분해안 합의 (F1 foreign-shell → F7 polish, ~9주) | 완료 |
| docs | F1 디자인 spec 작성 + self-review 2회 + 사용자 위임 기본값 5항목 확정 | 완료 |
| docs | F1 구현 plan 14 task / 48h 작성 (TDD-light = build + smoke, M4a 패턴) | 완료 |

### 세부 내용

- 사용자 요청: capawork.com 분석 + sodam-jobs 안에 "외국인 전용 구인" 메뉴 별도 구성 + Capa Work 서비스 전부 클론.
- WebFetch가 SPA 본문 미수신 → WebSearch로 우회 분석. Capa Work = 외국인(E-7/E-9 중심) 채용 플랫폼, KO/EN/RU 다국어, 비자/언어/직종 자동 매칭, capa.ai 별도 브랜드.
- 단일 spec 불가능한 multi-month 규모 → **7-cycle 분해**:
  - F1 foreign-shell (1.5주) — 셸·라우팅·i18n
  - F2 foreign-jobs (2주) — ForeignJob 모델/CRUD/필터
  - F3 foreign-employer (1주)
  - F4 foreign-seeker (1주)
  - F5 foreign-matching (2주)
  - F6 foreign-content (1주)
  - F7 foreign-polish (1주)
- F1 핵심 결정 6건 합의:
  - sodam과의 관계 = (b) 한 지붕 두 상품 sub-app
  - i18n URL = `/foreign/:lang/*` 경로 접두사 (ko/en/ru)
  - 라이브러리 = react-i18next + react-helmet-async
  - 시각 정체성 = 토큰 공유 + `.foreign-scope` 컬러 팔레트만 분리 (사파이어 + 청록)
  - 인증 = 완전 공유 (백엔드 변경 0)
  - 진입점 = 본가 TopBar 메뉴 + HomeForeignBanner + sub-app TopBar 본가 복귀 링크
- 완성도 = 옵션 2 (반쯤 완성, KO/EN 전수, RU 핵심만), 배포 = feature flag `VITE_FOREIGN_SUBAPP_VISIBLE` (기본 false)
- 사용자 위임 기본값 5건:
  - 운영주체 = 브랜드명 "SodamJobs Global"만 (법인명 미배치)
  - 약관·개인정보 = 본가에도 없으므로 `href="#"` placeholder (별도 cycle)
  - 환경변수 = `VITE_FOREIGN_SUBAPP_VISIBLE`
  - F1 착수 시점 = 2026-05-25 (M-Mobile 종료 후), F1 종료 ~ 2026-06-05
  - 구현 중 자잘한 결정(i18n 톤, 컴포넌트 명명, 로깅, 일러스트 톤, 404 처리) 자동 처리 원칙
- F1 spec self-review에서 3건 수정: I18nProvider 가짜 wrapper 제거, Pretendard 폰트 모순 해소, TopBar 파일 확정.
- F1 plan = 14 task / 48h. T1 의존성 → T14 backend Cache-Control + smoke. 모든 task에 inline 코드 + 정확 경로 + commit 메시지 포함.
- 실행 모드는 사용자가 F1 착수 시점에 선택 (subagent-driven 추천 / inline 둘 다 가능).

### 산출물

- `docs/superpowers/specs/2026-05-11-foreign-subapp-f1-design.md` (~30KB, 9 섹션)
- `docs/superpowers/plans/2026-05-11-foreign-subapp-f1.md` (~50KB, 14 task)
- 커밋 `18ef34b` / `372eef6` / `fdc9998` / `577f025` — 모두 main 브랜치

### 다음 세션 인계

- **최우선**: M-Mobile Batch 2 (worktree `c:/WORK/sodam-jobs-m-mobile`, 브랜치 `m-mobile`) — BottomNav + DesktopSidePanel
- M-Mobile Batch 2-10 완료 후 (~2주 추정, 2026-05-25 무렵) F1 plan 실행 착수
- F1 실행 시 worktree 권장: `c:/WORK/sodam-jobs-foreign-f1` (브랜치 `foreign-f1`), spec/plan은 main에 이미 커밋됨
- F1 실행 전 사용자 결정 필요: 실행 모드(subagent-driven vs inline) — 추천 = subagent-driven (M4a 검증된 패턴)

---
