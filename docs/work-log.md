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
