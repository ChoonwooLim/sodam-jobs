# F1 (foreign-shell) — 외국인 sub-app 셸·라우팅·i18n 디자인 스펙

**작성일**: 2026-05-11
**대상 cycle**: F1 (foreign-shell) — F-시리즈(외국인 sub-app) 첫 번째 cycle
**선행 조건**: M-Mobile 사이클 완료
**규모 추정**: 약 6 작업일 (1.5주)
**커밋 prefix**: `feat(foreign):`

---

## 0. 배경

### 0.1 목표

[capawork.com](https://capawork.com)(외국인 채용 플랫폼)의 서비스 전체를 SodamJobs 내에 별도 sub-app으로 클론한다. F1은 그 첫 단계로 **셸·라우팅·i18n** 인프라만 구축한다.

### 0.2 F-시리즈 분해(합의됨)

| Cycle | 코드명 | 산출물 | 무게 |
|-------|--------|--------|------|
| **F1** | **foreign-shell** | `/foreign/*` 라우트 + i18n 셸(KO/EN/RU) + 13개 라우트 placeholder + 진입점 | 1.5주 |
| F2 | foreign-jobs | `ForeignJob` 모델 + CRUD + 리스트/상세/등록 + 필터 | 2주 |
| F3 | foreign-employer | 외국인 채용 employer 온보딩 + 회사 프로필 + 공고 관리 | 1주 |
| F4 | foreign-seeker | 외국인 구직자 프로필 + 이력서 + 지원/저장 + 받은 매칭 | 1주 |
| F5 | foreign-matching | 자동 매칭(비자/언어/직종 점수화) + 추천 카드 + 알림 | 2주 |
| F6 | foreign-content | 뉴스룸 + 비자 가이드 + 한국 생활 가이드 (admin CMS) | 1주 |
| F7 | foreign-polish | RU 검수 + 모바일 최적화 + 시드 데이터 + 다크모드 평가 | 1주 |

총 9주(~2개월). 각 cycle은 별도 spec → plan → 구현 → 머지.

### 0.3 핵심 결정 요약

| 결정 | 선택 |
|------|------|
| sodam-jobs와의 관계 | (b) 한 지붕 두 상품 sub-app |
| i18n URL 전략 | 경로 접두사 `/foreign/:lang/*` (lang ∈ {ko, en, ru}) |
| i18n 라이브러리 | react-i18next |
| 시각 정체성 | 토큰 공유 + 컬러 팔레트만 분리 + M-Mobile 셸 패턴 재사용 |
| 인증 | 완전 공유 (백엔드 변경 0, LoginPage i18n 래핑) |
| 진입점 | 본가 TopBar 메뉴 + 홈 배너 + sub-app TopBar 우측 본가 복귀 링크 |
| 완성도 | 옵션 2 — 반쯤 완성, KO/EN 정성, RU 핵심만 |
| 배포 노출 | 옵션 B — feature flag로 본가 메뉴/배너 숨김, URL 직접 접근 가능 |
| 약관 처리 | 본가 약관 페이지 재사용 |

---

## 1. 아키텍처 & 라우트 트리

### 1.1 라우터 구조 (App.jsx)

기존 단일 `MainLayout` → **두 레이아웃 병렬** 구조로 전환.

```jsx
<BrowserRouter>
  <HelmetProvider>
    <I18nProvider>
      <Routes>
        {/* 본가 sodam-jobs — 기존 27개 라우트 그대로 */}
        <Route element={<MainLayout />}>
          ...
        </Route>

        {/* 외국인 sub-app */}
        <Route path="/foreign" element={<ForeignEntryRedirect />} />
        <Route
          path="/foreign/:lang"
          element={<ForeignLangGate><ForeignLayout /></ForeignLangGate>}
        >
          <Route index element={<ForeignHomePage />} />
          <Route path="about" element={<ForeignAboutPage />} />
          <Route path="login" element={<ForeignLoginPage />} />
          <Route path="signup" element={<ForeignSignupPage />} />
          <Route path="jobs" element={<ForeignJobsPlaceholder />} />
          <Route path="jobs/:id" element={<ForeignJobsPlaceholder />} />
          <Route path="employer" element={<ForeignEmployerPlaceholder />} />
          <Route path="employer/jobs/new" element={<ForeignEmployerPlaceholder />} />
          <Route path="employer/me" element={<ForeignEmployerPlaceholder />} />
          <Route path="me" element={<ForeignSeekerPlaceholder />} />
          <Route path="matching" element={<ForeignMatchingPlaceholder />} />
          <Route path="news" element={<ForeignNewsPlaceholder />} />
          <Route path="news/:slug" element={<ForeignNewsPlaceholder />} />
          <Route path="visa-guide" element={<ForeignVisaGuidePlaceholder />} />
          <Route path="life-guide" element={<ForeignLifeGuidePlaceholder />} />
          <Route path="*" element={<ForeignNotFound />} />
        </Route>
      </Routes>
    </I18nProvider>
  </HelmetProvider>
</BrowserRouter>
```

### 1.2 컴포넌트 책임 분리

- **`ForeignEntryRedirect`**: `/foreign` (lang 없음) 진입 시 브라우저 언어 + localStorage 기반으로 `/foreign/{lang}/`로 리다이렉트.
- **`ForeignLangGate`**: URL `:lang` 검증(`ko|en|ru`만). 잘못된 값이면 `/foreign/ko/...`로 리다이렉트. `i18n.changeLanguage(lang)` 호출.
- **`ForeignLayout`**: sub-app TopBar + 본문 Outlet + Footer + 모바일 BottomNav.
- **`ForeignHomePage`**: 랜딩 (정성껏).
- **`Foreign{Section}Placeholder`**: `ComingSoonCard` 활용한 통일 placeholder.

### 1.3 파일 구조

```
frontend/src/
├── App.jsx                          (수정 — sub-app 라우트 추가)
├── i18n/
│   ├── config.js                    (react-i18next init)
│   └── locales/
│       ├── ko/common.json
│       ├── ko/foreign.json
│       ├── en/common.json
│       ├── en/foreign.json
│       ├── ru/common.json
│       └── ru/foreign.json
├── lib/
│   ├── foreignNav.js                (BottomNav/TopBar 메뉴 데이터)
│   └── foreignLink.js               (buildForeignPath 헬퍼)
├── components/
│   ├── foreign/
│   │   ├── ForeignEntryRedirect.jsx
│   │   ├── ForeignLangGate.jsx
│   │   ├── ForeignLayout.jsx
│   │   ├── ForeignTopBar.jsx
│   │   ├── ForeignFooter.jsx
│   │   ├── ForeignBottomNav.jsx
│   │   ├── LanguageSwitcher.jsx
│   │   ├── ComingSoonCard.jsx
│   │   ├── HomeForeignBanner.jsx    (본가 HomePage에서 import)
│   │   └── *.module.css
│   └── layout/
│       └── MainLayout.jsx           (수정 — TopBar에 외국인 메뉴 + flag 게이트)
├── pages/
│   └── foreign/
│       ├── ForeignHomePage.jsx
│       ├── ForeignAboutPage.jsx
│       ├── ForeignLoginPage.jsx
│       ├── ForeignSignupPage.jsx
│       ├── ForeignJobsPlaceholder.jsx
│       ├── ForeignEmployerPlaceholder.jsx
│       ├── ForeignSeekerPlaceholder.jsx
│       ├── ForeignMatchingPlaceholder.jsx
│       ├── ForeignNewsPlaceholder.jsx
│       ├── ForeignVisaGuidePlaceholder.jsx
│       ├── ForeignLifeGuidePlaceholder.jsx
│       ├── ForeignNotFound.jsx
│       └── *.module.css
└── styles/
    └── foreign-tokens.css           (외국인 sub-app 컬러 팔레트 + 폰트)
```

### 1.4 백엔드 변경

**없음.** F1은 완전 프론트엔드 cycle. 단, FastAPI catch-all이 `/foreign/*`도 `index.html`로 fallback하는지 1회 확인 후 통과. 필요 시 catch-all 정규식 1줄 보정.

---

## 2. i18n 셋업

### 2.1 의존성 추가

```json
"dependencies": {
  "i18next": "^25.x",
  "react-i18next": "^17.x",
  "i18next-browser-languagedetector": "^9.x",
  "react-helmet-async": "^2.x"
}
```

### 2.2 초기화 (`frontend/src/i18n/config.js`)

```js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import koCommon from './locales/ko/common.json';
import koForeign from './locales/ko/foreign.json';
import enCommon from './locales/en/common.json';
import enForeign from './locales/en/foreign.json';
import ruCommon from './locales/ru/common.json';
import ruForeign from './locales/ru/foreign.json';

export const SUPPORTED_LANGS = ['ko', 'en', 'ru'];
export const DEFAULT_LANG = 'ko';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: { ru: ['en', 'ko'], default: ['ko'] }, // RU 키 누락 시 EN으로
    supportedLngs: SUPPORTED_LANGS,
    nonExplicitSupportedLngs: true,
    ns: ['common', 'foreign'],
    defaultNS: 'common',
    resources: {
      ko: { common: koCommon, foreign: koForeign },
      en: { common: enCommon, foreign: enForeign },
      ru: { common: ruCommon, foreign: ruForeign },
    },
    interpolation: { escapeValue: false },
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 1,
      caches: ['localStorage'],
    },
    saveMissing: import.meta.env.DEV,
    parseMissingKeyHandler: (key) => {
      if (import.meta.env.DEV) console.warn('[i18n] missing key:', key);
      return key;
    },
  });

export default i18n;
```

### 2.3 언어 게이트 (`ForeignLangGate.jsx`)

```jsx
import { useParams, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, DEFAULT_LANG } from '@/i18n/config';

export default function ForeignLangGate({ children }) {
  const { lang } = useParams();
  const location = useLocation();
  const { i18n } = useTranslation();

  if (!SUPPORTED_LANGS.includes(lang)) {
    const rest = location.pathname.replace(/^\/foreign\/[^/]+/, '');
    return <Navigate to={`/foreign/${DEFAULT_LANG}${rest}`} replace />;
  }

  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  }, [lang, i18n]);

  return children;
}
```

### 2.4 언어 토글 컴포넌트

- 드롭다운: 🇰🇷 한국어 / 🇬🇧 English / 🇷🇺 Русский
- 클릭 시 현재 URL의 `:lang`만 교체
- 모바일에선 아이콘만, 데스크탑은 라벨 포함

### 2.5 번역 네임스페이스

| 네임스페이스 | 용도 |
|------------|------|
| `common` | 양 도메인 공유 가능한 일반 어휘 (`actions.save`, `nav.home`, `errors.network`) |
| `foreign` | 외국인 sub-app 전용 (`foreign.home.hero.title`, `foreign.placeholder.coming_soon`) |

`common` 네임스페이스를 분리해 두면 향후 본가가 i18n 도입 시 자연스럽게 재사용.

### 2.6 번역 깊이 정책 (옵션 2)

| 언어 | 범위 |
|------|------|
| KO | 모든 키 정성껏 |
| EN | 모든 키 정성껏 |
| RU | 메뉴/풋터/랜딩 hero/about/login/signup만. 나머지는 fallback으로 EN |

### 2.7 헬퍼 — `lib/foreignLink.js`

```js
export function buildForeignPath(lang, path = '') {
  const clean = path.replace(/^\/+/, '');
  return clean ? `/foreign/${lang}/${clean}` : `/foreign/${lang}/`;
}
```

모든 sub-app 내부 링크는 이 헬퍼를 통해 생성 → `:lang` 누락 사고 방지.

---

## 3. Sub-app 셸 컴포넌트

### 3.1 `ForeignLayout`

```jsx
export default function ForeignLayout() {
  return (
    <div className={`foreign-scope ${styles.foreignShell}`}>
      <ForeignTopBar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <ForeignFooter />
      <ForeignBottomNav />
    </div>
  );
}
```

- 데스크탑(≥1024px): TopBar + main + Footer. BottomNav `display:none`.
- 모바일(<1024px): TopBar + main(BottomNav 자리 padding-bottom) + BottomNav fixed.
- 본문 max-width: 데스크탑 `max-w-1200px`, 모바일 `100%`. (M-Mobile의 max-w-440px 강제 적용 안 함 — B2B 데스크탑 정보 밀도 우선.)

### 3.2 `ForeignTopBar`

**데스크탑**:
```
[로고 SodamJobs Global] [공고][매칭][뉴스][비자가이드][소개]
                                     [🌐 KO ▾] [← 본가] [로그인/회원가입]
```

**모바일**:
```
[로고]                                                   [🌐] [☰]
```

- 로고 → `/foreign/:lang/` (sub-app 랜딩)
- 메뉴 active 상태는 `NavLink` 활용
- 햄버거 탭 시 사이드 드로어 (메뉴 + 언어 토글 + 본가 복귀 + 로그인)
- 로그인 상태: `[👤 username ▾]` 드롭다운 (마이페이지/로그아웃)

### 3.3 `ForeignFooter`

3컬럼(데스크탑) / 1컬럼(모바일):

| 컬럼 | 내용 |
|------|------|
| About | 사이트 소개 + 본가 링크 + 운영주체 + 약관(본가 재사용) + 개인정보 |
| For Foreign Workers | 채용공고 / 매칭 / 비자 가이드 / 한국 생활 가이드 |
| For Employers | 채용기업 소개 / 공고 등록 / 외국인 채용 가이드(F6) |

하단: `Powered by sodam-jobs · © 2026 · 언어: [현재 lang]`

### 3.4 `ForeignBottomNav` (모바일 전용)

M-Mobile과 동형 4탭 + FAB 패턴:

| 탭 | 아이콘 | 라우트 |
|----|--------|--------|
| 1 | 🏠 | `/foreign/:lang/` |
| 2 | 🔍 | `/foreign/:lang/jobs` |
| FAB | ➕ | `/foreign/:lang/employer/jobs/new` (employer 권한 시, F1엔 placeholder) |
| 3 | 📰 | `/foreign/:lang/news` |
| 4 | 👤 | `/foreign/:lang/me` (비로그인 시 login으로) |

메뉴 데이터는 `lib/foreignNav.js`에 배열로 분리.

### 3.5 `ComingSoonCard`

```jsx
<ComingSoonCard
  titleKey="foreign.placeholder.title"
  bodyKey="foreign.placeholder.jobs.body"
  cycleHint="F2"               // KO 운영자 톤에서만 표시
  fallbackCTA={{
    labelKey: "foreign.placeholder.try_local",
    to: "/jobs"
  }}
/>
```

- SVG 일러스트 + 제목 + 본문 + 다음 cycle 안내 + 본가/외부 대체 CTA
- 모든 placeholder가 props만 바꿔 렌더 → 일관성 + 신뢰감

### 3.6 SEO 사이드 이펙트

`ForeignLangGate`/페이지 단위에서 `react-helmet-async`로 처리:

- 모든 페이지: `document.documentElement.lang = lang`
- placeholder 라우트: `<meta name="robots" content="noindex,nofollow" />`
- 완성 라우트(home/about): `<link rel="alternate" hreflang>` 3개

---

## 4. 시각 정체성 (컬러/타이포 분리)

### 4.1 정책: scoped CSS variables

`ForeignLayout`에 `.foreign-scope` 클래스. `foreign-tokens.css`에서 그 안에서만 palette 토큰 재정의. spacing/radius/shadow는 그대로 상속.

### 4.2 `frontend/src/styles/foreign-tokens.css`

```css
.foreign-scope {
  /* Palette overrides (B2B global trust) */
  --color-bg: #f7f8fb;
  --color-surface: #ffffff;
  --color-surface-elev: #f0f3f8;
  --color-ink: #0b1220;
  --color-ink-soft: #3a4257;
  --color-ink-mute: #74809a;
  --color-line: #d8dde8;
  --color-line-soft: #ebeef4;

  --color-accent: #1e40af;
  --color-accent-soft: #dde5fb;
  --color-accent-ink: #14307c;

  --color-warm: #0e7490;
  --color-warm-soft: #d9eff2;

  /* Typography override */
  --font-display: 'Inter', 'Pretendard', 'Noto Sans KR', 'Noto Sans', system-ui, sans-serif;
  --font-body: 'Inter', 'Pretendard', 'Noto Sans KR', 'Noto Sans', system-ui, sans-serif;
}
```

### 4.3 폰트 로딩 (`frontend/index.html` head)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
```

- `font-display: swap` (텍스트 즉시 표시)
- Noto Sans가 Cyrillic 자동 cover → RU 처리
- 4.2 font stack의 `Pretendard`는 **웹폰트로 로드하지 않음** — 사용자 시스템에 설치되어 있으면 graceful 사용, 아니면 Noto Sans KR로 fallback. 웹폰트 로드는 F7에서 평가

### 4.4 다크 모드

**F1엔 미지원.** 본가 비대응 → 일관성. F7에서 양쪽 동시 도입 평가.

### 4.5 콘트라스트 검증

| 조합 | 비율 | 등급 |
|------|------|------|
| `--color-ink` on `--color-bg` | ~18.5:1 | AAA |
| `--color-accent` on `--color-bg` | ~8.4:1 | AAA |
| `--color-ink-mute` on `--color-bg` | ~4.6:1 | AA (large text) |

### 4.6 토큰 대비 표

| 토큰 | sodam (현재) | foreign (제안) |
|------|------------|---------------|
| 배경 | `#f5f1ea` 따뜻한 크림 | `#f7f8fb` 차가운 오프화이트 |
| 텍스트 | `#14110f` 짙은 갈색 | `#0b1220` 짙은 블루블랙 |
| 액센트 | `#2540a8` 울트라마린 | `#1e40af` 사파이어 |
| 보조 | `#d04a2a` 테라코타 | `#0e7490` 청록 |
| 본문 폰트 | Space Grotesk + Noto Sans KR | Inter + Noto Sans + Noto Sans KR |

---

## 5. 페이지 콘텐츠 스펙

### 5.1 완성형 페이지 (4개)

#### `ForeignHomePage` (`/foreign/:lang/`)

1. **Hero** — i18n 카피 3국어. 부카피, 2 CTA(`[채용공고 둘러보기]` 주, `[기업 회원가입]` 부). CSS-only 배경 그라데이션.
2. **가치 제안 3블록** — 🛂 비자 매칭 / 🌐 다국어 / 📍 단기·정규직 동시.
3. **인기 비자 카테고리 칩** — E-7 / E-9 / F-2 / F-4 / H-2 / D-2·D-4. 클릭 → `/foreign/:lang/visa-guide#E7`.
4. **최근 공고 미리보기** — F2 전 더미 3장. "F2에서 연결 예정" 안내.
5. **Employer 콜아웃 배너** — CTA → `/foreign/:lang/signup?role=employer`.
6. **본가 sodam-jobs 크로스링크** — "한국인 알바·구인은 sodam-jobs에서 →"

#### `ForeignAboutPage` (`/foreign/:lang/about`)

- Hero: 미션 ("Bridge foreign talent and Korean employers")
- 3섹션: 우리가 하는 일 / 누구를 위해 / 운영주체
- 운영주체: SodamJobs Inc. (정확 법인명 사용자 확인) + 본가 링크
- 약관·개인정보: 본가 약관 페이지 링크 재사용

#### `ForeignLoginPage` (`/foreign/:lang/login`)

- 본가 `LoginPage`와 백엔드 동일(`POST /api/auth/login`)
- UI만 i18n + 외국인 톤
- 폼: 이메일 / 비밀번호 / 로그인 / 회원가입 링크 / 비밀번호 찾기
- redirect: `location.state.from` 또는 `/foreign/:lang/`
- 에러 메시지 i18n (`common:errors.invalid_credentials` 등)

#### `ForeignSignupPage` (`/foreign/:lang/signup`)

- 본가 회원가입 API 그대로(`POST /api/auth/register`)
- 쿼리스트링 role hint: `?role=employer` 또는 `?role=seeker`
- 폼: 이메일 / 비밀번호 / 비밀번호 확인 / 이름 / role 토글 / 약관 동의
- 외국인 전용 데이터(비자/한국어/언어)는 받지 않음 — F4에서 ForeignSeekerProfile로 별도 수집

### 5.2 Placeholder 페이지 (8개)

| 라우트 | 제목 (KO/EN) | 본문 요지 | 대체 CTA |
|--------|------------|---------|---------|
| `/jobs`, `/jobs/:id` | 외국인 채용공고 / Foreign Jobs | 비자별 채용공고는 곧 공개. KO/EN/RU 필터 예정 | 본가 단기알바 → `/jobs` |
| `/employer`, `/employer/jobs/new`, `/employer/me` | 기업 채용 / For Employers | 외국인 채용을 시작하실 기업은 회원가입 먼저 | 회원가입 → `/foreign/:lang/signup?role=employer` |
| `/me` | 마이페이지 / My Page | 이력서·지원 현황·매칭은 다음 업데이트 | 본가 마이페이지 → `/my/jobs` |
| `/matching` | 자동 매칭 / Auto-Matching | 비자/언어/직종 기반 매칭 준비 중 | 공고 둘러보기 → `/foreign/:lang/jobs` |
| `/news`, `/news/:slug` | 뉴스룸 / Newsroom | 외국인 채용 정책·이민·취업 가이드 준비 중 | 공식 정부 가이드 → eps.go.kr |
| `/visa-guide` | 비자 가이드 / Visa Guide | E-7/E-9/F-*/H-2 등 비자별 자격·신청 준비 중 | 공식 정부 가이드 → hikorea.go.kr |
| `/life-guide` | 한국 생활 가이드 / Living in Korea | 외국인 등록·계좌·통신·주거 준비 중 | 서울 외국인 포털 → global.seoul.go.kr |

모든 placeholder는 `noindex,nofollow` 메타.

### 5.3 `ForeignNotFound` (`/foreign/:lang/*`)

- 일러스트 + "Page not found" + 사이트 메뉴 5개 링크

### 5.4 라우트 → 컴포넌트 정리

| 라우트 | 컴포넌트 | 상태 |
|--------|---------|------|
| `/foreign/:lang/` | `ForeignHomePage` | 완성 |
| `/foreign/:lang/about` | `ForeignAboutPage` | 완성 |
| `/foreign/:lang/login` | `ForeignLoginPage` | 완성 |
| `/foreign/:lang/signup` | `ForeignSignupPage` | 완성 |
| `/foreign/:lang/jobs`, `/jobs/:id` | `ForeignJobsPlaceholder` | placeholder |
| `/foreign/:lang/employer`, `/employer/jobs/new`, `/employer/me` | `ForeignEmployerPlaceholder` | placeholder |
| `/foreign/:lang/me` | `ForeignSeekerPlaceholder` | placeholder |
| `/foreign/:lang/matching` | `ForeignMatchingPlaceholder` | placeholder |
| `/foreign/:lang/news`, `/news/:slug` | `ForeignNewsPlaceholder` | placeholder |
| `/foreign/:lang/visa-guide` | `ForeignVisaGuidePlaceholder` | placeholder |
| `/foreign/:lang/life-guide` | `ForeignLifeGuidePlaceholder` | placeholder |
| `/foreign/:lang/*` | `ForeignNotFound` | 완성 |

---

## 6. 양방향 진입점

### 6.1 본가 TopBar (`MainLayout`)

**데스크탑**: 기존 메뉴 우측에 `[🌐 외국인 구인 Foreign Jobs]` 1개 추가.
- 클릭 → `/foreign` (분기 라우트가 적절한 lang으로 리다이렉트)
- 미세 강조 (점선 언더라인 or accent 컬러)
- `FOREIGN_SUBAPP_VISIBLE` env(또는 빌드타임 상수)가 `true`일 때만 표시

**모바일**: 햄버거 메뉴 안 마지막에 같은 항목 추가.

### 6.2 본가 홈페이지 배너 (`HomeForeignBanner`)

위치: Hero 직후.

```
┌─────────────────────────────────────────────────────────┐
│  🌐  외국인을 위한 한국 채용 플랫폼이 열렸습니다          │
│      Find your next job in Korea — KO · EN · RU         │
│      [둘러보기 →]                              [작은 X] │
└─────────────────────────────────────────────────────────┘
```

- 컬러: foreign accent(`#1e40af`) + 화이트 (본가 따뜻한 톤과 대비)
- X 버튼 → localStorage `foreign_banner_dismissed_v1` 기록, 30일 미노출
- `FOREIGN_SUBAPP_VISIBLE` flag로 게이트
- 모바일: 풀폭 카드, 한 줄 카피

### 6.3 sub-app TopBar 본가 복귀 링크

**데스크탑**:
```
[메뉴] [🌐 KO ▾] [← sodam-jobs (한국인 알바)] [로그인]
```
- 작고 차분한 텍스트 링크 (accent 아님), 클릭 → `/`
- 라벨 i18n:
  - KO: "← sodam-jobs (한국인 알바)"
  - EN: "← sodam-jobs (Local jobs)"
  - RU: "← sodam-jobs (Локальные)"

**모바일**: 햄버거 드로어 별도 섹션 `LOCAL JOBS` 헤더 아래.

### 6.4 분기 라우트 (`ForeignEntryRedirect`)

```jsx
function ForeignEntryRedirect() {
  const browserLang = (navigator.language || '').slice(0, 2);
  const saved = localStorage.getItem('i18nextLng');
  const candidate = SUPPORTED_LANGS.includes(saved)
    ? saved
    : SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;
  return <Navigate to={`/foreign/${candidate}`} replace />;
}
```

→ 본가 모든 진입 링크는 `/foreign`만 가리키면 됨.

### 6.5 본가 변경 범위 (최소화)

| 파일 | 변경 |
|------|------|
| `components/layout/MainLayout.jsx` (또는 TopBar 컴포넌트) | 메뉴 항목 1개 + 모바일 햄버거 1개 (flag 게이트) |
| `pages/HomePage.jsx` | `<HomeForeignBanner />` 1줄 (flag 게이트) |
| `components/foreign/HomeForeignBanner.jsx` (신규) | 본가에서 import |
| `App.jsx` | `/foreign`, `/foreign/:lang/*` 라우트 추가 + `HelmetProvider` + `i18n` import |

본가 페이지 다른 곳(About/Services/Login/Community/Jobs/Admin)은 건드리지 않음.

---

## 7. 빌드 / 의존성 / 배포

### 7.1 새 의존성

```
i18next, react-i18next, i18next-browser-languagedetector, react-helmet-async
```

번들 영향 (gzipped 추정):
- 라이브러리 합계: +32KB
- 번역 JSON: KO 8KB / EN 7KB / RU 3KB
- **합계 +50KB** (현재 485KB 대비 ~10%)

### 7.2 Vite 설정

- 번역 JSON `import` → 추가 플러그인 불필요.
- `alias` `@` → `frontend/src` 권장(없으면 추가).

### 7.3 폰트 로딩

`frontend/index.html` head에 Google Fonts preconnect + Inter/Noto Sans CSS link. `font-display: swap`.

### 7.4 백엔드

변경 없음. 단, FastAPI catch-all이 `/foreign/*`를 `index.html`로 fallback하는지 1줄 확인 후 통과. 필요 시 정규식 보정.

### 7.5 Cache-Control (전역 CLAUDE.md 준수)

- HTML 응답: `public, max-age=0, must-revalidate`
- Vite 빌드 산출물(해시 자산): `public, max-age=31536000, immutable`
- F1 착수 시 FastAPI 미들웨어 존재 여부 1줄 확인, 없으면 추가.

### 7.6 SEO

| 페이지 | `<title>` | `<meta robots>` | `<link hreflang>` |
|--------|-----------|----------------|-------------------|
| `/foreign/:lang/` | "SodamJobs Global — Jobs in Korea for Foreigners" (lang별) | `index,follow` | KO/EN/RU 3개 |
| `/foreign/:lang/about` | "About — SodamJobs Global" | `index,follow` | 3개 |
| `/foreign/:lang/login`, `/signup` | "Log in" / "Sign up" | `noindex` | - |
| placeholder 11개 | "Coming Soon — {section}" | `noindex,nofollow` | - |

`hreflang` 패턴:
```html
<link rel="alternate" hreflang="ko" href="https://sodam-jobs.twinverse.org/foreign/ko/" />
<link rel="alternate" hreflang="en" href="https://sodam-jobs.twinverse.org/foreign/en/" />
<link rel="alternate" hreflang="ru" href="https://sodam-jobs.twinverse.org/foreign/ru/" />
<link rel="alternate" hreflang="x-default" href="https://sodam-jobs.twinverse.org/foreign/" />
```

### 7.7 sitemap.xml / robots.txt

- `frontend/public/sitemap.xml`(있으면) 6개 라우트 추가: `/foreign/{ko,en,ru}/`, `/foreign/{ko,en,ru}/about`
- 없으면 정적 파일 생성 (placeholder 미포함)
- `robots.txt`에 `Disallow: /foreign/*/me`, `Disallow: /foreign/*/employer/me` 추가

### 7.8 배포 롤아웃 (옵션 B — feature flag)

- 빌드타임 상수 또는 env: `FOREIGN_SUBAPP_VISIBLE` (기본 `false`)
- `false`일 때: 본가 TopBar 메뉴 + HomeForeignBanner 숨김. 라우트는 살아있음(직접 URL 진입 가능 — 운영자 데모용)
- F2 종료 후 `true`로 전환 평가

### 7.9 운영 검증 체크리스트 (F1 done 시)

- [ ] `/foreign/`, `/foreign/ko`, `/foreign/en`, `/foreign/ru` 모두 진입 가능
- [ ] 언어 토글 3개 정상 동작 + localStorage 저장
- [ ] 잘못된 lang(`/foreign/jp`) 자동 리다이렉트
- [ ] TopBar/Footer/BottomNav 모바일·데스크탑 반응형
- [ ] 본가 TopBar 메뉴 + 홈 배너 노출 (flag ON 시) / 미노출 (flag OFF 시)
- [ ] sub-app TopBar 본가 복귀 링크
- [ ] 14개 라우트 모두 페이지 로드 (placeholder는 ComingSoonCard 표시)
- [ ] helmet 메타: 완성 indexable, placeholder noindex
- [ ] `document.documentElement.lang` 정상 갱신
- [ ] 폰트 로딩 (FOUT 한계 내)
- [ ] Lighthouse 모바일/데스크탑 85+ 유지
- [ ] 본가 페이지 회귀 없음 (홈, jobs, community, admin)
- [ ] Cache-Control 헤더 점검

---

## 8. Done / Out-of-scope / 위험

### 8.1 Definition of Done

세 게이트 모두 통과:

**A. 기능 체크리스트** — 7.9의 14개 항목 ✅

**B. 코드 품질**
- `npm run build` 클린 (경고 0 또는 기존 baseline 유지)
- `npm run lint` 통과
- `value ?? default` 패턴으로 undefined props 방어
- CSS module 클래스 케이스 일관
- 번역 키 누락: `parseMissingKeyHandler` 콘솔 0건

**C. 검토 게이트**
- 사용자가 운영(또는 staging)에서 14개 라우트 직접 클릭 검증
- 본가 회귀 없음 확인
- 모바일에서 sub-app 정상

### 8.2 명시적 Out-of-scope (F1 절대 금지)

| 항목 | 다음 위치 | 이유 |
|------|----------|------|
| `ForeignJob` 백엔드 모델 | F2 | 데이터 모델은 F2 cycle 전체 주제 |
| 외국인 회원 비자/한국어 필드 수집 | F4 | ForeignSeekerProfile 분리 |
| 실 채용공고 데이터 | F2 | placeholder만 |
| 자동 매칭 알고리즘 | F5 | 데이터 선행 필요 |
| 뉴스/비자/생활 가이드 콘텐츠 | F6 | CMS 의존 |
| Pretendard 폰트 도입 | F7 | 130KB 부담 |
| 다크 모드 | F7 또는 별도 | 본가 미지원 |
| RU 번역 전수 검수 | F7 | F1엔 핵심 키만 |
| sub-app 별도 약관 | (미정) | 본가 약관 재사용 |
| 가입 시 비자 데이터 | F4 | 인증 공유 |
| sitemap.xml 동적 생성 | F6 | 정적 6개만 |
| 외부 RSS 어그리게이션 | F6 | |
| 본가 페이지 i18n 확장 | 별도 cycle | sub-app 분리 원칙 |

### 8.3 위험과 대응

| 위험 | 시점 | 대응 |
|------|------|------|
| 본가 회귀 | 구현 중 | TopBar/HomePage 변경 별도 commit, 시각 회귀 수동 검증 |
| i18n key drift | 운영 후 | `parseMissingKeyHandler` + 빌드 단계 missing key 검사 task |
| FastAPI catch-all 충돌 | 첫 배포 | 로컬 docker run 사전 확인, main.py catch-all 정규식 점검 |
| Google Fonts 차단 지역 | 운영 후 | system-ui fallback 수용. F7에서 self-host 전환 평가 |
| Cloudflare stale HTML | 첫 배포 | 전역 CLAUDE.md 캐시 헤더 규칙 준수 검증 |
| localStorage 언어 충돌 | 향후 | `i18nextLng` 표준 키 유지, 본가 i18n 도입 시 그대로 |
| Helmet async race | 운영 후 | Googlebot은 JS 실행. SSR은 F7 또는 별도 cycle 평가 |
| lang 파라미터 누락 | 개발 중 | `buildForeignPath(lang, path)` 헬퍼 강제 사용 |
| Feature flag OFF 시 placeholder 노출 | 운영 후 | noindex로 SEO 안전. 직접 URL 접근은 의도된 운영자/데모 용도 |

### 8.4 작업 추정

| 항목 | 시간 |
|------|------|
| 의존성 설치 + Vite/index.html 설정 | 1h |
| i18n 셋업 (config, locale 파일 6개, gate) | 4h |
| 디자인 토큰 (foreign-tokens.css) | 2h |
| 셸 컴포넌트 4개 + ComingSoonCard | 8h |
| LanguageSwitcher + foreignNav.js + buildForeignPath | 3h |
| 완성 페이지 4개 (Home/About/Login/Signup) | 10h |
| Placeholder 페이지 8개 | 4h |
| 본가 TopBar 메뉴 + HomeForeignBanner | 4h |
| Helmet/SEO/sitemap | 2h |
| 번역 KO 전수 + EN 전수 + RU 핵심 | 6h |
| QA / 회귀 검증 | 4h |
| **합계** | **48h ≈ 6 작업일 (1.5주)** |

### 8.5 F1 → F2 인계 산출물

F1 종료 시 다음 cycle(F2 foreign-jobs)이 즉시 활용:
- `ForeignLayout` + sub-app 셸 — F2는 placeholder를 진짜 컴포넌트로 교체만
- i18n config + `foreign` 네임스페이스 — F2는 키 추가만
- `buildForeignPath` 헬퍼 — F2 모든 jobs 링크 통과
- 디자인 토큰 — F2 카드/필터가 그대로 상속
- `ComingSoonCard` — F2 안에서 일부 미완성(매칭 점수 등) placeholder 재사용

---

## 9. 사용자 확인 사항 (구현 착수 전)

- [ ] 운영 법인명 — `ForeignAboutPage`의 "운영주체" 표기
- [ ] 본가 약관 페이지 URL 존재 여부 (없으면 F1 placeholder 또는 별도 cycle)
- [ ] `FOREIGN_SUBAPP_VISIBLE` 환경변수 명명 컨벤션 확인 (Vite는 `VITE_` 접두사 필요)
- [ ] M-Mobile 사이클 종료 시점 — F1 착수 정확 일자

---

## 참고 자료

- [capawork.com](https://capawork.com) — 클론 대상
- [capa.ai/knowledge/post/외국인-인력-채용](https://capa.ai/knowledge/post/외국인-인력-채용-이제-capa-work에서-한번에-해결하세요) — 서비스 설명
- [eps.go.kr](https://www.eps.go.kr) — 고용허가제 공식
- [hikorea.go.kr](https://www.hikorea.go.kr) — 출입국·외국인 정책
- [global.seoul.go.kr](https://global.seoul.go.kr) — 서울 외국인 포털
- [kowork.kr](https://kowork.kr) — 경쟁 플랫폼 참고
- [jobploy.kr](https://www.jobploy.kr) — 경쟁 플랫폼 참고

---

*F1 spec 끝. 다음 단계: writing-plans 스킬로 task-level 구현 계획 작성.*
