# SodamJobs 개발계획서

## 프로젝트 개요
- 프로젝트명: SodamJobs
- 컨셉: 동네 단위 단기 알바 직거래 플랫폼 (당근알바 스타일)
- 기술 스택: FastAPI + React + Vite + PostgreSQL
- 배포: Orbitron (Docker)

## 마일스톤

| 번호 | 마일스톤 | 상태 |
|------|----------|------|
| M0 | 프로젝트 풀스택 부트스트랩 (`/init`) | 완료 |
| M1 | 인증 시스템 (JWT 로그인/회원가입) | 완료 |
| M2 | 어드민 대시보드 (사용자/게시판/문서/스킬/플러그인 관리) | 완료 |
| M3 | 커뮤니티 게시판 4종 (공지/Q&A/갤러리/동영상) | 완료 |
| M4a | Job CRUD + JobImage + 거리 검색 + employer 역할 | 완료 |
| M-Mobile | 모바일 퍼스트 재설계 (MobileShell + BottomNav + PageHeader + PWA basic + 셈하나 크로스프로모) | 진행 중 (Batch 1/10 — worktree `m-mobile`) |
| M4b | Application 상태 머신 + 마이페이지 | 예정 |
| M4c | 양방향 Review + 동시 공개 + 사업장 평점 | 예정 |
| M5 | 지역 기반 매칭 고도화 (지도 위젯, 검색 fine-tuning) | 예정 |
| M6 | 사장님 ↔ 알바생 1:1 채팅 | 예정 |
| M7 | SodamFN 안심 사업장 인증 시스템 | 예정 |

## 기능 목록

| 기능 | 상태 | 비고 |
|------|------|------|
| JWT 인증 (로그인/회원가입) | 완료 | python-jose sub 문자열 변환 |
| 어드민 대시보드 | 완료 | 통계/사용자/게시판 관리 |
| 커뮤니티 게시판 4종 | 완료 | 공지/Q&A/갤러리/동영상 |
| 댓글 시스템 | 완료 | |
| 파일 업로드 | 완료 | 이미지 10MB, 동영상 100MB |
| 프로젝트 문서 뷰어 | 완료 | DB 기반 마크다운 |
| AI 스킬 뷰어 | 완료 | `.claude/skills/` 스캔 |
| MCP 플러그인 관리 | 완료 | settings.local.json 읽기/쓰기 |
| 알바 등록/조회 (M4a) | 완료 | PostGIS 기반 거리 검색, employer 역할, 이미지 업로드 |
| 지원/심사/승인 흐름 | 예정 | M4b |
| 양방향 리뷰 (동시 공개) | 예정 | M4c |
| 1:1 채팅 | 예정 | M6 |
| 안심 사업장 검증 | 예정 | M7 |

## 다음 단계 (M-Mobile — 모바일 퍼스트 재설계)

진행 중: worktree `c:/WORK/sodam-jobs-m-mobile` (브랜치 `m-mobile`), Batch 1 완료(2 commits — externalLinks/SemhanaLink/PageHeader). Batch 2-10 (BottomNav + DesktopSidePanel, Footer + MobileShell, PWA, 백엔드 /me, 9 페이지 재작성, ProfilePage/ChatPlaceholder, E2E 검증)이 다음 세션에서 이어짐.

이후 M4b: Application 상태 머신 + 마이페이지 (모바일 셸 위에서 처음부터 모바일 퍼스트로 설계)
이후 M4c: 양방향 Review + 동시 공개 시스템

## 완료된 단계 (M4a)
- `Job` 모델: 사업장명/위치(PostGIS Geography POINT 4326)/급여/카테고리/모집기간
- `JobImage` 모델: Job 첨부 이미지 (별도 모델, FileRecord와 분리)
- `employer` 역할 신설 (user/employer/admin/superadmin 4단계 계층)
- 거리 기반 검색 (`ST_DWithin` + `ST_Distance` + GiST 인덱스)
- `/api/jobs` 8 endpoint (CRUD + GET /my + 이미지 업로드/삭제)
- 프론트엔드 4 페이지(JobList/Detail/Form/MyJobs) + 3 컴포넌트(JobCard/JobFilters/LocationPicker)
- HomePage "내 동네 알바" 미리보기 섹션
- 검증: PostGIS 3.5 on Orbitron PG, manual smoke (curl + 빌드) 통과
