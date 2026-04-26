# Mobile-First 재설계 (M-Mobile) — 디자인 스펙

- **작성일**: 2026-04-26
- **마일스톤**: M-Mobile (M4a 완료 직후, M4b 시작 전 끼움)
- **상태**: 설계 승인 후 plan 작성 대기

## 배경

SodamJobs는 동네 단기 알바 직거래 플랫폼으로, 1차 소비자(알바생·사장님)는 모두 휴대폰으로 접속하는 것이 자연스러운 사용 패턴이다. 그러나 `/init`에서 부트스트랩한 현재 UI는 데스크탑 폭(1200px max-width)에 맞춰져 있어 모바일에서 정보 밀도·터치 타겟·네비게이션 모두 어색하다. 원본 Next.js MVP(폐기 전)는 `max-w-lg` 컨테이너 + BottomNav 4탭의 모바일 퍼스트 패턴이었고, 이 방향이 SodamJobs의 본래 의도였다.

이번 사이클은 M4b(Application 상태 머신) 시작 전에 모바일 퍼스트 셸·네비게이션·소비자 페이지를 한 번에 정비한다. M4b의 신규 페이지(지원내역, 사장님 지원자 관리)도 처음부터 모바일에 맞게 설계 가능.

## 결정 사항 요약 (브레인스토밍 결과)

| ID | 결정 | 선택 |
|----|------|------|
| Q1 | BottomNav 4탭 구성 | C — `홈 │ 알바 │ [+ 등록 FAB] │ 채팅* │ 내정보` (가운데 FAB는 사장님/admin만) |
| Q1-b | FAB 노출 대상 | A — 사장님/관리자 전용. 알바생/비로그인은 4슬롯 균등 |
| Q2 | 상단 헤더 | A — 전역 TopBar 제거, 페이지별 sticky 미니헤더 (`PageHeader` 컴포넌트) |
| Q3 | 데스크탑 표현 | C — 가운데 모바일 셸 + 좌우 사이드 정보 패널 (≥1024px) |
| Q4 | PWA | B — `manifest.json` + 아이콘만. service worker는 M5+ 별도 |
| Q5 | 페이지 범위 | B — 모든 소비자 페이지 + 신규 `/profile`. admin 페이지 6종은 데스크탑 유지 |
| 추가 | 셈하나(SodamFN) 크로스프로모 | 사장님 컨텍스트만(profile 카드 + MyJobsPage 빈 상태 + Footer) |

## 레이아웃 아키텍처

### `MobileShell` (현 `MainLayout` 교체)

루트 컨테이너 구조:

```
<MobileShell>
  <DesktopSideLeft />   {/* visible only ≥1024px */}
  <main className="phone-column">  {/* max-w-[440px] */}
    <Outlet />          {/* 각 페이지가 자체 PageHeader + 콘텐츠 */}
    <Footer />          {/* 회색 작은 글씨, 셈하나 sister-link */}
  </main>
  <DesktopSideRight />  {/* visible only ≥1024px */}
  <BottomNav />         {/* fixed bottom-0, max-w-[440px] aligned */}
</MobileShell>
```

- 폰 컬럼 폭: `max-width: 440px`. 휴대폰 표준(390~430px) 살짝 위.
- 데스크탑(≥1024px) 사이드 패널: 좌측 = 브랜드 카피 + 카테고리 통계, 우측 = "📱 폰에서 열기" QR 코드(현재 페이지 URL을 인코딩) + "함께 보는 서비스: 셈하나" 카드.
- 작은 화면(<1024px): 사이드 패널 숨김, 폰 컬럼만.
- 배경: `--color-bg`(warm cream) gradient, 사이드 패널은 `--color-surface-elev` 살짝 다른 톤.
- **콘텐츠 영역 padding-bottom**: BottomNav 높이(64px) + safe-area + Footer 높이만큼 확보해 마지막 콘텐츠가 BottomNav에 가려지지 않도록 보장. `MobileShell`이 자동 적용 (`<main>`에 `padding-bottom: calc(64px + env(safe-area-inset-bottom) + 56px)` 정도).

### `PageHeader` 컴포넌트 (신규 공용)

각 페이지가 자체 sticky 미니헤더로 사용:

```tsx
<PageHeader
  title="알바"          // string | ReactNode (지역 셀렉터 등 인터랙티브 가능)
  subtitle="강남구 역삼동"  // optional 작은 글씨 보조
  back                  // 뒤로가기 버튼 (router.back())
  actions={[<button>🔍</button>, <button>🔔</button>]}
/>
```

- `position: sticky; top: 0; z-index: 50;`
- 높이 56px (모바일 표준)
- 배경: `--color-surface` + bottom border or shadow when scrolled
- `back` 우선, 없으면 logo 위치에 title placement

### `BottomNav` (현 컴포넌트 전면 교체)

```tsx
const TABS = [
  { key: "home",    label: "홈",     path: "/",        icon: <HomeIcon /> },
  { key: "jobs",    label: "알바",   path: "/jobs",    icon: <BriefcaseIcon /> },
  // (사장님/admin만) FAB가 여기에 들어감
  { key: "chat",    label: "채팅",   path: "/chat",    icon: <ChatIcon />, disabled: true },
  { key: "profile", label: "내정보", path: "/profile", icon: <UserIcon /> },
];
```

- 위치: `fixed bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 440px;`
- 높이: 64px + safe-area-inset-bottom
- 활성 탭: `--color-accent-ink` text + 아이콘 강조, 비활성: `--color-ink-mute`
- "채팅" 탭: 클릭 시 `/chat` placeholder 페이지로 이동 (배지·dim·"준비 중" 라벨)

**FAB (employer / admin / superadmin 전용)**:
- 노출 조건: `["employer","admin","superadmin"].includes(user?.role)`. 알바생(`user`)·비로그인은 FAB 숨김 → BottomNav 4슬롯 균등.
- 가운데 슬롯에 floating ➕ 원형 버튼 (지름 56px), `position: absolute; top: -16px;` (BottomNav 위로 살짝 튀어나옴)
- `--color-accent` 배경, white 아이콘, shadow
- 클릭 → `/jobs/new`

## 라우트

### 신규 라우트

| 경로 | 컴포넌트 | 권한 | 비고 |
|---|---|---|---|
| `/profile` | `ProfilePage` | 로그인 필수 | 3줄 자기소개 + 위치 + 역할별 섹션 |
| `/chat` | `ChatPlaceholderPage` | public | "M6 준비 중" 안내 + "알림 받기"(disabled) |

### 라우트 이동/제거

- `/mobile-preview` (현재 TopBar에서 진입) → `/profile`의 "개발자 도구" 섹션에 admin 이상에게만 노출
- `/my/jobs` 직접 라우트는 유지 (employer 로그인 시 `ProfilePage`에서 카드로 진입)

## `ProfilePage` 구성

```
[PageHeader title="내 정보"]

  ┌─ 프로필 카드 ─────────────────────┐
  │ 👤 김소담                          │
  │ 강남구 역삼동 · 알바생             │
  │ [프로필 수정]                      │
  └────────────────────────────────────┘

  ┌─ 3줄 자기소개 ────────────────────┐
  │ "안녕하세요! 역삼동 근처에서..."   │
  │ [수정]                             │
  └────────────────────────────────────┘

  ┌─ (역할별 섹션) ──────────────────────┐

  알바생일 때:
    📋 지원내역  (M4b 준비 중)
    💝 찜한 알바  (M5+)

  사장님일 때:
    🏪 내 구인  (count)  →  /my/jobs
    ✓  사업장 검증 상태 (현재: 미검증)
    [매장 운영 도구] 셈하나 카드  ← 크로스 프로모 메인

  공통:
    ⚙️ 알림 설정 (M5+)
    🔧 (admin 이상만) 개발자 도구
        - 모바일 미리보기 (/mobile-preview)
        - 어드민 대시보드 (/admin)
    🚪 로그아웃

  [Footer]
```

## 페이지별 모바일 재설계 변화

### 소비자 페이지 (재설계 9 + 신규 1)

| 페이지 | 핵심 변화 |
|---|---|
| `/` Home | hero 콤팩트, 위치 sticky 헤더, 내 동네 알바 3 카드, 공지 압축 |
| `/login` | 좌-우 2열 → 단일 컬럼, 첫 입력 자동 focus, role 라디오 큰 터치 타겟 |
| `/jobs` | 카드 1열, 카테고리 칩 가로 스크롤, **bottom sheet 필터** (슬라이드업) |
| `/jobs/:id` | 풀폭 hero (16:9), 정보 카드, **sticky 하단 "지원하기" 바** (M4b까지 disabled) |
| `/jobs/new`, `/jobs/:id/edit` | 단일 컬럼, 큰 터치 타겟, "📍 현재 위치" 큰 버튼 prominent |
| `/my/jobs` | 테이블 → **카드 리스트** (제목 · 급여 · 상태 토글 · 수정/삭제) |
| `/community/:board` | 카드 리스트, 우측 하단 "✏️ 글쓰기" mini FAB |
| `/community/:board/:id` | 단일 컬럼, 댓글 sticky 입력 바 |
| `/about`, `/services` | 단일 컬럼 article. PageHeader만 적용 |
| **신규 `/profile`** | 위 섹션 참조 |
| 신규 `/chat` | M6 placeholder |

### Admin 페이지 (현 데스크탑 레이아웃 유지)

`/admin`, `/admin/users`, `/admin/boards`, `/admin/docs/*`, `/admin/skills`, `/admin/plugins` — 좁은 모바일 셸 안에서 가로 스크롤 허용. 운영자 사용처가 데스크탑이라 ROI 낮음. 다음 사이클(또는 별도 admin 패널 분리) 검토.

## 셈하나(SodamFN) 크로스 프로모션

사장님 컨텍스트만 노출. 알바생/비로그인엔 노출하지 않음.

### 1. ProfilePage 사장님 카드 (메인)

```jsx
{user?.role === "employer" && (
  <a
    href="https://sodamfn.twinverse.org"
    target="_blank"
    rel="noopener noreferrer"
    className={styles.semhanaCard}
  >
    <div className={styles.semhanaIcon}>🍙</div>
    <div className={styles.semhanaBody}>
      <strong>셈하나</strong>
      <p>매출 · 직원 · 재고를 한 곳에서</p>
    </div>
    <span className={styles.semhanaCta}>매장 관리 시작 →</span>
  </a>
)}
```

스타일: 셈하나 브랜드색(보라/네이비 톤) 살짝 차용해 SodamJobs 카드들과 시각 구분.

### 2. MyJobsPage 빈 상태 보조 텍스트

```jsx
{!loading && jobs.length === 0 && (
  <>
    <p>등록한 구인이 없습니다.</p>
    <Link to="/jobs/new">+ 첫 구인 등록하기</Link>
    <p className={styles.semhanaHint}>
      💡 매장 운영도 함께 시작하시려면 <a href="https://sodamfn.twinverse.org" target="_blank" rel="noopener">셈하나</a>
    </p>
  </>
)}
```

등록한 구인이 1개 이상이면 자동 사라짐.

### 3. 글로벌 Footer

```
SodamJobs · made by Twinverse · 함께 보기: 셈하나
```

회색 작은 글씨. 모든 페이지 공통(Admin 제외 가능). 셈하나는 외부 링크.

### 노출하지 않는 곳 (의도적)

- HomePage 메인 — 알바생 노출되는 자리에 사장님 도구 광고는 부적절
- JobFormPage 안 — 폼 작성 흐름 방해 안 함
- LoginPage — 첫 인상에 광고 X

## PWA (basic)

### `frontend/public/manifest.json` (신규)

```json
{
  "name": "SodamJobs",
  "short_name": "SodamJobs",
  "description": "동네 단기 알바 직거래 플랫폼",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f5f1ea",
  "theme_color": "#d04a2a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### `frontend/public/icons/` (신규)

192px / 512px / maskable 512px PNG. 단순 글자 로고 + 브랜드색 배경. 임시는 SVG → PNG 변환(이미 `favicon.svg` 존재).

### `frontend/index.html` head 추가

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#d04a2a" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="SodamJobs" />
```

### service worker — out of scope

오프라인 셸 / 캐시 무효화는 M5+ 별도. 이번엔 manifest만.

## 백엔드 변경

### 신규: `PUT /api/auth/me`

본인 프로필 부분 수정. `username`/`email`/`role`은 변경 불가.

```python
class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    phone: Optional[str] = None
    neighborhood: Optional[str] = None

@router.put("/me")
def update_me(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(user, k, v)
    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    session.refresh(user)
    return {
        "id": user.id, "username": user.username, "email": user.email,
        "role": user.role, "nickname": user.nickname,
        "phone": user.phone, "neighborhood": user.neighborhood,
    }
```

### 신규: `POST /api/auth/me/password`

```python
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.post("/me/password")
def change_password(
    body: PasswordChange,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(body.new_password)
    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    return {"status": "updated"}
```

기존 `GET /api/auth/me`는 그대로. 응답 스키마 확장(필드 nickname/phone/neighborhood 노출).

## 컴포넌트 변경 요약

### 신규 (Frontend)
- `frontend/src/components/layout/MobileShell.jsx` + `.module.css` — `MainLayout` 교체
- `frontend/src/components/layout/PageHeader.jsx` + `.module.css`
- `frontend/src/components/layout/BottomNav.jsx` + `.module.css` — 현 BottomNav 없음 (Next MVP에만 있었음). 신규
- `frontend/src/components/layout/DesktopSidePanel.jsx` + `.module.css`
- `frontend/src/components/layout/Footer.jsx` — 셈하나 sister-link 포함 (현 Footer 있음, 모바일 폭에 맞게 재작성)
- `frontend/src/pages/ProfilePage.jsx` + `.module.css`
- `frontend/src/pages/ChatPlaceholderPage.jsx` + `.module.css`
- `frontend/public/manifest.json` + `frontend/public/icons/*.png`

### 수정
- `frontend/src/components/layout/MainLayout.jsx` — 삭제 또는 `MobileShell` 재export로 변경
- `frontend/src/components/layout/TopBar.jsx` + `.module.css` — **삭제**
- `frontend/src/App.jsx` — `MobileShell` 사용, 신규 라우트(`/profile`, `/chat`) 추가
- 모든 소비자 페이지 — `PageHeader` 적용 + 모바일 폭 레이아웃 재작성
- `frontend/index.html` — manifest/theme-color/apple-touch-icon meta
- `frontend/src/services/api.js` — 변경 없음 (api 패턴은 그대로)
- `backend/routers/auth.py` — `PUT /me` + `POST /me/password` 추가

## 검증 시나리오 (manual smoke)

1. **모바일 폭 (Chrome DevTools 390×844)**
   - 모든 소비자 페이지 가로 스크롤 없음, 콘텐츠 깔끔
   - BottomNav 4탭 (or 5탭 + FAB) 하단 고정
   - PageHeader sticky 동작
2. **데스크탑 (1440×900)**
   - 가운데 모바일 셸, 좌우 사이드 패널 노출
3. **역할별 BottomNav**
   - 비로그인: 4탭, FAB 없음
   - 알바생: 4탭, FAB 없음
   - 사장님: 4탭 + 가운데 FAB → `/jobs/new`
   - admin: 사장님과 동일 + admin 메뉴는 ProfilePage 안
4. **`/profile` 사장님 로그인**
   - 셈하나 카드 노출, 클릭 시 `sodamfn.twinverse.org` 새 탭
   - "내 구인" 카드 → `/my/jobs`
5. **MyJobsPage 빈 상태**
   - 셈하나 hint 노출
   - 구인 1개 이상 등록하면 hint 사라짐
6. **PWA**
   - Chrome devtools Lighthouse PWA: Installable ✓
   - "홈화면에 추가" 가능
   - 설치 후 standalone 모드로 실행, 주소창 없음
7. **Footer**
   - 모든 페이지 하단에 노출 (BottomNav 위)
   - 셈하나 외부 링크 동작
8. **`/chat` placeholder**
   - "M6 준비 중" 메시지 + disabled 알림 버튼

## 범위 제외 (Out of Scope)

- service worker / 오프라인 캐싱 — M5+
- 푸시 알림 — M5+ (PWA + Web Push API)
- admin 6 페이지 모바일 재설계 — 별도 사이클
- 프로필 사진 업로드 — 별도 (M4c 리뷰 시스템에서 같이 다룰지 검토)
- 실제 채팅 동작 — M6
- i18n / 다국어 — 별도
- 다크모드 — 현 토큰은 라이트만, 별도

## 의존성 / 외부 작업

- 이미지 자산: `frontend/public/icons/icon-192.png` / `icon-512.png` / `icon-maskable-512.png`. 일단 단순 글자 로고로 placeholder 생성 (개발자가 디자이너 아이콘 받으면 교체).
- 셈하나 도메인: 현재 `sodamfn.twinverse.org`. 추후 변경 가능성 있으면 `frontend/src/lib/externalLinks.js` 같은 모듈에 상수화 권장 (이번 사이클에 포함).

## 마이그레이션 / 호환성

- TopBar 삭제 → 모든 페이지 헤더 자체 제공 (PageHeader). M-Mobile 사이클 중 한 번에 전환.
- BottomNav 신규 → 모든 라우트에서 기본 노출. 채팅 탭은 placeholder 라우트 작동.
- 기존 `LocationPicker` (M4a 산출물) 그대로 재사용 — `/jobs`의 위치 입력 + `/profile`의 위치 수정 둘 다.
- 사용자 데이터 (User 모델 컬럼) 그대로. backend ALTER 없음 — M4a에서 이미 nickname/phone/neighborhood 추가됨.

## 구현 배치 분할 (구현 plan에서 다듬을 예정)

1. **인프라** — `MobileShell` + `PageHeader` + `BottomNav`(+ FAB) + `DesktopSidePanel` + `Footer` 컴포넌트, `MainLayout` 교체, `App.jsx` 라우트 추가, TopBar 제거
2. **PWA** — manifest + icons + meta
3. **백엔드** — `PUT /api/auth/me` + `POST /api/auth/me/password`
4. **HomePage** + **LoginPage** + **About** + **Services** 모바일화
5. **Job 4 페이지** 모바일화 (필터 bottom sheet, sticky apply bar 포함)
6. **Community 2 페이지** 모바일화
7. **신규 ProfilePage** + **ChatPlaceholderPage** + 셈하나 크로스프로모 (3곳)
8. **검증 + admin 페이지 좁은 셸 대응 + docs 업데이트**

각 배치 종료 시 `npm run build` 통과 + manual smoke (모바일·데스크탑 폭) 통과 후 commit.
