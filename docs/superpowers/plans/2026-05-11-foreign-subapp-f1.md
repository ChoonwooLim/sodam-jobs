# F1 (foreign-shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SodamJobs 내에 외국인 전용 sub-app (`/foreign/*`)의 셸·라우팅·i18n 인프라를 구축하고, 14개 라우트(4 완성 + 8 placeholder + 1 NotFound + 1 lang gate + 1 entry redirect)를 동작 가능한 상태로 만든다.

**Architecture:** React Router v7의 중첩 라우트로 본가 `MainLayout`과 외국인 `ForeignLayout`을 병렬 배치. `/foreign/:lang/*` 경로 접두사로 i18n URL을 정규화하고, react-i18next로 KO/EN/RU 3국어를 처리한다. 인증·DB는 본가와 완전 공유, 디자인 토큰은 `.foreign-scope` 클래스로 컬러 팔레트만 분리한다.

**Tech Stack:** React 19, React Router 7, Vite 8, react-i18next 17, i18next-browser-languagedetector 9, react-helmet-async 2, CSS Modules.

**Prerequisites:**
- M-Mobile 사이클 완료 + main 브랜치 머지
- 작업 디렉토리: `c:/WORK/sodam-jobs` (main 브랜치) 또는 신규 worktree `sodam-jobs-foreign-f1` (브랜치 `foreign-f1`)
- Docker / Orbitron 운영 환경 정상

**Estimated:** ~48h (6 작업일, 1.5주)

**Spec:** [`docs/superpowers/specs/2026-05-11-foreign-subapp-f1-design.md`](../specs/2026-05-11-foreign-subapp-f1-design.md)

**Verification convention:** sodam-jobs는 단위 테스트 인프라가 없음 (M4a 선례). F1도 같은 패턴 — 각 task 종료 시 `npm run build` 클린 + 명시된 manual smoke 점검으로 검증. 순수 로직 함수는 inline `node -e` REPL one-liner로 빠르게 검증.

---

## File Structure (책임 맵)

### 신규 파일 (31개)

| 경로 | 책임 |
|------|------|
| `frontend/src/i18n/config.js` | react-i18next 초기화, SUPPORTED_LANGS 상수 |
| `frontend/src/i18n/locales/ko/common.json` | KO 공통 어휘 (actions, nav, errors) |
| `frontend/src/i18n/locales/ko/foreign.json` | KO 외국인 sub-app 전용 |
| `frontend/src/i18n/locales/en/common.json` | EN 공통 |
| `frontend/src/i18n/locales/en/foreign.json` | EN 외국인 |
| `frontend/src/i18n/locales/ru/common.json` | RU 공통 (핵심 키만) |
| `frontend/src/i18n/locales/ru/foreign.json` | RU 외국인 (핵심 키만) |
| `frontend/src/lib/foreignLink.js` | `buildForeignPath(lang, path)` 헬퍼 |
| `frontend/src/lib/foreignNav.js` | TopBar / BottomNav / Footer 메뉴 데이터 |
| `frontend/src/styles/foreign-tokens.css` | `.foreign-scope` 스코프 토큰 (컬러+폰트) |
| `frontend/src/components/foreign/ForeignEntryRedirect.jsx` | `/foreign` → `/foreign/{lang}` 분기 |
| `frontend/src/components/foreign/ForeignLangGate.jsx` | URL `:lang` 검증 + `i18n.changeLanguage` |
| `frontend/src/components/foreign/ForeignLayout.jsx` (+ .module.css) | sub-app 레이아웃 셸 |
| `frontend/src/components/foreign/ForeignTopBar.jsx` (+ .module.css) | sub-app 상단바 |
| `frontend/src/components/foreign/ForeignFooter.jsx` (+ .module.css) | sub-app 푸터 (3컬럼) |
| `frontend/src/components/foreign/ForeignBottomNav.jsx` (+ .module.css) | 모바일 하단 4탭 + FAB |
| `frontend/src/components/foreign/LanguageSwitcher.jsx` (+ .module.css) | 🇰🇷🇬🇧🇷🇺 드롭다운 |
| `frontend/src/components/foreign/ComingSoonCard.jsx` (+ .module.css) | placeholder 공용 카드 |
| `frontend/src/components/foreign/HomeForeignBanner.jsx` (+ .module.css) | 본가 홈에 삽입되는 sub-app 진입 배너 |
| `frontend/src/pages/foreign/ForeignHomePage.jsx` (+ .module.css) | 랜딩 (6 섹션) |
| `frontend/src/pages/foreign/ForeignAboutPage.jsx` (+ .module.css) | 소개 |
| `frontend/src/pages/foreign/ForeignLoginPage.jsx` (+ .module.css) | 로그인 (본가 API 재사용) |
| `frontend/src/pages/foreign/ForeignSignupPage.jsx` (+ .module.css) | 회원가입 (본가 API 재사용) |
| `frontend/src/pages/foreign/ForeignJobsPlaceholder.jsx` | placeholder |
| `frontend/src/pages/foreign/ForeignEmployerPlaceholder.jsx` | placeholder |
| `frontend/src/pages/foreign/ForeignSeekerPlaceholder.jsx` | placeholder |
| `frontend/src/pages/foreign/ForeignMatchingPlaceholder.jsx` | placeholder |
| `frontend/src/pages/foreign/ForeignNewsPlaceholder.jsx` | placeholder |
| `frontend/src/pages/foreign/ForeignVisaGuidePlaceholder.jsx` | placeholder |
| `frontend/src/pages/foreign/ForeignLifeGuidePlaceholder.jsx` | placeholder |
| `frontend/src/pages/foreign/ForeignNotFound.jsx` (+ .module.css) | sub-app 404 |

### 수정 파일 (8개)

| 경로 | 변경 |
|------|------|
| `frontend/package.json` | 4 deps 추가 |
| `frontend/index.html` | Google Fonts preconnect + Inter/Noto Sans link |
| `frontend/src/main.jsx` | `import './i18n/config'` + `HelmetProvider` 래핑 |
| `frontend/src/App.jsx` | sub-app 라우트 17개 추가 |
| `frontend/src/components/layout/TopBar.jsx` | "외국인 구인" 메뉴 1개 (flag 게이트) |
| `frontend/src/pages/HomePage.jsx` | `<HomeForeignBanner />` 1줄 (flag 게이트) |
| `frontend/public/robots.txt` (있으면) | `Disallow: /foreign/*/me`, `/foreign/*/employer/me` 추가 |
| `frontend/public/sitemap.xml` (있으면) | sub-app 6 URL 추가 |
| `backend/main.py` | Cache-Control 미들웨어 추가 (없으면) |
| `frontend/.env.example` | `VITE_FOREIGN_SUBAPP_VISIBLE=false` 항목 |

---

## Task Sequence

14 task. 각 task는 commit 1개로 마감. Task 간 의존성은 위→아래 순서로 진행.

1. T1 의존성 + 환경변수 + 폰트
2. T2 i18n config + locale 골격
3. T3 헬퍼 (foreignLink, foreignNav)
4. T4 디자인 토큰 (foreign-tokens.css)
5. T5 라우트 게이트 (EntryRedirect, LangGate)
6. T6 셸 컴포넌트 (Layout/TopBar/Footer/BottomNav/LanguageSwitcher)
7. T7 ComingSoonCard + 8 placeholder + NotFound
8. T8 ForeignHomePage
9. T9 ForeignAboutPage
10. T10 ForeignLoginPage + ForeignSignupPage
11. T11 번역 본격 채움 (KO/EN 전수, RU 핵심)
12. T12 본가 진입점 (TopBar 메뉴 + HomeForeignBanner)
13. T13 SEO (sitemap + robots + helmet 검증)
14. T14 백엔드 catch-all + Cache-Control + 14 라우트 smoke

---

### Task 1: 의존성 설치 + 환경변수 + 폰트 로딩

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/index.html`
- Modify: `frontend/.env.example` (없으면 신규)
- Create: `frontend/.env.local` (gitignore 처리, 개발용)

- [ ] **Step 1.1: 작업 디렉토리 확인**

```bash
cd c:/WORK/sodam-jobs && git status && git branch --show-current
```

Expected: branch=`main`, clean working tree. (또는 `git worktree add c:/WORK/sodam-jobs-foreign-f1 -b foreign-f1` 으로 worktree 생성 후 거기서 작업)

- [ ] **Step 1.2: npm 의존성 4개 설치**

```bash
cd frontend && npm install i18next@^25 react-i18next@^17 i18next-browser-languagedetector@^9 react-helmet-async@^2
```

Expected: package.json `dependencies`에 4개 항목 추가. lock file 갱신.

- [ ] **Step 1.3: `frontend/index.html`의 `<head>`에 Google Fonts 링크 추가**

`frontend/index.html`에서 기존 `<title>` 위/아래 적절한 위치에 다음 3줄 추가:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 1.4: `.env.example` 추가/갱신**

`frontend/.env.example` 파일에 다음 줄 추가 (파일 없으면 생성):

```
# 외국인 sub-app 노출 게이트. 'true' 시 본가 TopBar 메뉴 + 홈 배너 표시.
# 라우트 자체는 항상 살아있어 직접 URL 진입 가능.
VITE_FOREIGN_SUBAPP_VISIBLE=false
```

- [ ] **Step 1.5: `.env.local` 생성 (개발 중 메뉴 노출용)**

`frontend/.env.local` (gitignored — `.env` 가 `.gitignore`에 있는지 확인):

```
VITE_FOREIGN_SUBAPP_VISIBLE=true
```

- [ ] **Step 1.6: build 검증**

```bash
cd frontend && npm run build
```

Expected: 클린 통과, 경고 0 또는 기존 baseline. 새 의존성 인식 확인.

- [ ] **Step 1.7: 커밋**

```bash
git add frontend/package.json frontend/package-lock.json frontend/index.html frontend/.env.example
git commit -m "feat(foreign): T1 — i18n/helmet 의존성 + Google Fonts + VITE_FOREIGN_SUBAPP_VISIBLE env"
```

---

### Task 2: i18n config + locale 골격

**Files:**
- Create: `frontend/src/i18n/config.js`
- Create: `frontend/src/i18n/locales/ko/common.json`
- Create: `frontend/src/i18n/locales/ko/foreign.json`
- Create: `frontend/src/i18n/locales/en/common.json`
- Create: `frontend/src/i18n/locales/en/foreign.json`
- Create: `frontend/src/i18n/locales/ru/common.json`
- Create: `frontend/src/i18n/locales/ru/foreign.json`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 2.1: `frontend/src/i18n/config.js` 생성**

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
    fallbackLng: { ru: ['en', 'ko'], default: ['ko'] },
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

- [ ] **Step 2.2: KO common 골격 생성 — `frontend/src/i18n/locales/ko/common.json`**

```json
{
  "actions": {
    "save": "저장",
    "cancel": "취소",
    "submit": "제출",
    "close": "닫기",
    "back": "뒤로",
    "next": "다음",
    "login": "로그인",
    "logout": "로그아웃",
    "signup": "회원가입"
  },
  "errors": {
    "network": "네트워크 오류가 발생했습니다.",
    "invalid_credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "required": "필수 입력 항목입니다.",
    "passwords_mismatch": "비밀번호가 일치하지 않습니다."
  }
}
```

- [ ] **Step 2.3: KO foreign 골격 생성 — `frontend/src/i18n/locales/ko/foreign.json`**

```json
{
  "brand": "SodamJobs Global",
  "topbar": {
    "menu_jobs": "채용공고",
    "menu_matching": "매칭",
    "menu_news": "뉴스",
    "menu_visa_guide": "비자 가이드",
    "menu_about": "소개",
    "back_to_local": "← sodam-jobs (한국인 알바)"
  },
  "footer": {
    "col_about": "회사",
    "col_workers": "외국인 구직자",
    "col_employers": "기업",
    "link_local": "sodam-jobs 본가",
    "link_terms": "이용약관",
    "link_privacy": "개인정보처리방침",
    "powered_by": "Powered by sodam-jobs",
    "copyright": "© 2026 SodamJobs Global"
  },
  "bottomnav": {
    "home": "홈",
    "jobs": "공고",
    "fab": "공고 등록",
    "news": "뉴스",
    "me": "내 정보"
  },
  "language_switcher": {
    "ko": "한국어",
    "en": "English",
    "ru": "Русский"
  },
  "placeholder": {
    "title": "준비 중입니다",
    "coming_soon_label": "Coming Soon",
    "try_local": "본가 단기알바 보기",
    "external_eps": "공식 정부 가이드 (eps.go.kr)",
    "external_hikorea": "공식 출입국 가이드 (hikorea.go.kr)",
    "external_seoul_global": "서울 외국인 포털"
  },
  "home": {
    "hero_title": "한국에서 일하고 싶은 모든 외국인에게",
    "hero_subtitle": "비자 지원 · 다국어 채용 · 동네 단기 알바부터 정규직까지",
    "cta_browse": "채용공고 둘러보기",
    "cta_signup_employer": "기업 회원가입"
  },
  "about": {
    "hero": "외국인 인재와 한국 기업을 잇습니다",
    "section_what_title": "우리가 하는 일",
    "section_who_title": "누구를 위해",
    "section_org_title": "운영주체",
    "operator_name": "SodamJobs Global"
  },
  "login": {
    "title": "로그인",
    "subtitle": "외국인 구직 계정으로 들어오세요",
    "email_label": "이메일",
    "password_label": "비밀번호",
    "no_account": "계정이 없으신가요?",
    "go_signup": "회원가입"
  },
  "signup": {
    "title": "회원가입",
    "subtitle": "외국인 구직 계정 만들기",
    "email_label": "이메일",
    "password_label": "비밀번호",
    "password_confirm_label": "비밀번호 확인",
    "name_label": "이름",
    "role_seeker": "구직자",
    "role_employer": "기업",
    "agree_terms": "이용약관에 동의합니다",
    "have_account": "이미 계정이 있으신가요?",
    "go_login": "로그인"
  },
  "banner": {
    "home_title": "외국인을 위한 한국 채용 플랫폼이 열렸습니다",
    "home_subtitle": "Find your next job in Korea — KO · EN · RU",
    "home_cta": "둘러보기"
  }
}
```

- [ ] **Step 2.4: EN common 골격 — `frontend/src/i18n/locales/en/common.json`**

```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "login": "Log in",
    "logout": "Log out",
    "signup": "Sign up"
  },
  "errors": {
    "network": "A network error occurred.",
    "invalid_credentials": "Invalid email or password.",
    "required": "This field is required.",
    "passwords_mismatch": "Passwords do not match."
  }
}
```

- [ ] **Step 2.5: EN foreign 골격 — `frontend/src/i18n/locales/en/foreign.json`**

```json
{
  "brand": "SodamJobs Global",
  "topbar": {
    "menu_jobs": "Jobs",
    "menu_matching": "Matching",
    "menu_news": "News",
    "menu_visa_guide": "Visa Guide",
    "menu_about": "About",
    "back_to_local": "← sodam-jobs (Local jobs)"
  },
  "footer": {
    "col_about": "Company",
    "col_workers": "For Foreign Workers",
    "col_employers": "For Employers",
    "link_local": "sodam-jobs (main site)",
    "link_terms": "Terms of Service",
    "link_privacy": "Privacy Policy",
    "powered_by": "Powered by sodam-jobs",
    "copyright": "© 2026 SodamJobs Global"
  },
  "bottomnav": {
    "home": "Home",
    "jobs": "Jobs",
    "fab": "Post a Job",
    "news": "News",
    "me": "Me"
  },
  "language_switcher": {
    "ko": "한국어",
    "en": "English",
    "ru": "Русский"
  },
  "placeholder": {
    "title": "Coming Soon",
    "coming_soon_label": "Coming Soon",
    "try_local": "Browse local jobs",
    "external_eps": "Official government guide (eps.go.kr)",
    "external_hikorea": "Official immigration guide (hikorea.go.kr)",
    "external_seoul_global": "Seoul Global Center"
  },
  "home": {
    "hero_title": "Find your next job in Korea",
    "hero_subtitle": "Visa support · multilingual hiring · short-term gigs to full-time roles",
    "cta_browse": "Browse jobs",
    "cta_signup_employer": "Sign up as employer"
  },
  "about": {
    "hero": "Bridging foreign talent and Korean employers",
    "section_what_title": "What we do",
    "section_who_title": "Who it's for",
    "section_org_title": "Operator",
    "operator_name": "SodamJobs Global"
  },
  "login": {
    "title": "Log in",
    "subtitle": "Sign in to your foreign-worker account",
    "email_label": "Email",
    "password_label": "Password",
    "no_account": "Don't have an account?",
    "go_signup": "Sign up"
  },
  "signup": {
    "title": "Sign up",
    "subtitle": "Create your foreign-worker account",
    "email_label": "Email",
    "password_label": "Password",
    "password_confirm_label": "Confirm password",
    "name_label": "Name",
    "role_seeker": "Job seeker",
    "role_employer": "Employer",
    "agree_terms": "I agree to the Terms of Service",
    "have_account": "Already have an account?",
    "go_login": "Log in"
  },
  "banner": {
    "home_title": "A Korean job platform built for foreigners has launched",
    "home_subtitle": "Find your next job in Korea — KO · EN · RU",
    "home_cta": "Explore"
  }
}
```

- [ ] **Step 2.6: RU common (핵심 키만) — `frontend/src/i18n/locales/ru/common.json`**

```json
{
  "actions": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "submit": "Отправить",
    "close": "Закрыть",
    "back": "Назад",
    "next": "Далее",
    "login": "Войти",
    "logout": "Выйти",
    "signup": "Регистрация"
  },
  "errors": {
    "network": "Произошла сетевая ошибка.",
    "invalid_credentials": "Неверный email или пароль.",
    "required": "Обязательное поле.",
    "passwords_mismatch": "Пароли не совпадают."
  }
}
```

- [ ] **Step 2.7: RU foreign (핵심 키만, 나머지는 EN fallback) — `frontend/src/i18n/locales/ru/foreign.json`**

```json
{
  "brand": "SodamJobs Global",
  "topbar": {
    "menu_jobs": "Вакансии",
    "menu_matching": "Подбор",
    "menu_news": "Новости",
    "menu_visa_guide": "Виза",
    "menu_about": "О нас",
    "back_to_local": "← sodam-jobs (Локальные)"
  },
  "footer": {
    "col_about": "Компания",
    "col_workers": "Иностранцам",
    "col_employers": "Работодателям",
    "link_local": "sodam-jobs (главный сайт)",
    "link_terms": "Условия",
    "link_privacy": "Конфиденциальность",
    "powered_by": "Powered by sodam-jobs",
    "copyright": "© 2026 SodamJobs Global"
  },
  "bottomnav": {
    "home": "Главная",
    "jobs": "Работа",
    "fab": "Новая вакансия",
    "news": "Новости",
    "me": "Профиль"
  },
  "language_switcher": {
    "ko": "한국어",
    "en": "English",
    "ru": "Русский"
  },
  "home": {
    "hero_title": "Найдите работу в Корее",
    "hero_subtitle": "Поддержка виз · многоязычный найм · от подработок до постоянной работы",
    "cta_browse": "Смотреть вакансии",
    "cta_signup_employer": "Регистрация работодателя"
  },
  "login": {
    "title": "Вход",
    "email_label": "Email",
    "password_label": "Пароль",
    "no_account": "Нет аккаунта?",
    "go_signup": "Регистрация"
  },
  "signup": {
    "title": "Регистрация",
    "email_label": "Email",
    "password_label": "Пароль",
    "password_confirm_label": "Подтвердите пароль",
    "name_label": "Имя",
    "role_seeker": "Соискатель",
    "role_employer": "Работодатель",
    "have_account": "Уже есть аккаунт?",
    "go_login": "Войти"
  }
}
```

- [ ] **Step 2.8: `frontend/src/main.jsx`에 i18n import + HelmetProvider 래핑**

기존 `main.jsx` 내용을 확인한 뒤 다음 패턴으로 수정 (구조는 거의 동일, 단지 import 1줄 + HelmetProvider 래핑 추가):

```jsx
import './i18n/config';
import { HelmetProvider } from 'react-helmet-async';
// ... 기존 import 유지 ...

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
```

(기존 `<React.StrictMode>` 래핑이 있으면 그 안쪽 또는 바깥쪽 어디든 OK. HelmetProvider 위치만 App 바깥이면 됨.)

- [ ] **Step 2.9: build 검증**

```bash
cd frontend && npm run build
```

Expected: 클린 통과. 번역 JSON import 정상 인식.

- [ ] **Step 2.10: 커밋**

```bash
git add frontend/src/i18n frontend/src/main.jsx
git commit -m "feat(foreign): T2 — i18n config + KO/EN/RU locale skeleton (common+foreign 6 files)"
```

---

### Task 3: 헬퍼 — foreignLink + foreignNav

**Files:**
- Create: `frontend/src/lib/foreignLink.js`
- Create: `frontend/src/lib/foreignNav.js`

- [ ] **Step 3.1: `frontend/src/lib/foreignLink.js` 생성**

```js
import { SUPPORTED_LANGS, DEFAULT_LANG } from '@/i18n/config';

export function buildForeignPath(lang, path = '') {
  const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  const clean = String(path).replace(/^\/+/, '');
  return clean ? `/foreign/${safeLang}/${clean}` : `/foreign/${safeLang}/`;
}

export function detectInitialLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  const saved = window.localStorage?.getItem('i18nextLng');
  if (SUPPORTED_LANGS.includes(saved)) return saved;
  const browser = (window.navigator?.language || '').slice(0, 2);
  if (SUPPORTED_LANGS.includes(browser)) return browser;
  return DEFAULT_LANG;
}
```

> Note: `@/` alias가 `vite.config.js`에 등록되어 있는지 확인. 없으면 상대경로 `'../i18n/config'`로 변경.

- [ ] **Step 3.2: 빠른 로직 검증 (node REPL 한 줄)**

```bash
cd frontend && node -e "
const { SUPPORTED_LANGS, DEFAULT_LANG } = { SUPPORTED_LANGS: ['ko','en','ru'], DEFAULT_LANG: 'ko' };
function buildForeignPath(lang, path = '') {
  const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  const clean = String(path).replace(/^\/+/, '');
  return clean ? \`/foreign/\${safeLang}/\${clean}\` : \`/foreign/\${safeLang}/\`;
}
console.log(buildForeignPath('en', 'jobs'));        // /foreign/en/jobs
console.log(buildForeignPath('en', '/jobs/42'));    // /foreign/en/jobs/42
console.log(buildForeignPath('fr', 'jobs'));        // /foreign/ko/jobs (fallback)
console.log(buildForeignPath('ko'));                // /foreign/ko/
"
```

Expected output:
```
/foreign/en/jobs
/foreign/en/jobs/42
/foreign/ko/jobs
/foreign/ko/
```

- [ ] **Step 3.3: `frontend/src/lib/foreignNav.js` 생성**

```js
// TopBar 메뉴 (데스크탑 + 모바일 드로어 공통 소스)
export const FOREIGN_TOPBAR_NAV = [
  { key: 'jobs', pathSuffix: 'jobs', labelKey: 'foreign:topbar.menu_jobs' },
  { key: 'matching', pathSuffix: 'matching', labelKey: 'foreign:topbar.menu_matching' },
  { key: 'news', pathSuffix: 'news', labelKey: 'foreign:topbar.menu_news' },
  { key: 'visa', pathSuffix: 'visa-guide', labelKey: 'foreign:topbar.menu_visa_guide' },
  { key: 'about', pathSuffix: 'about', labelKey: 'foreign:topbar.menu_about' },
];

// BottomNav (모바일 전용) — 4 탭 + 가운데 FAB
export const FOREIGN_BOTTOMNAV = [
  { key: 'home', pathSuffix: '', icon: '🏠', labelKey: 'foreign:bottomnav.home' },
  { key: 'jobs', pathSuffix: 'jobs', icon: '🔍', labelKey: 'foreign:bottomnav.jobs' },
  { key: 'fab', pathSuffix: 'employer/jobs/new', icon: '➕', labelKey: 'foreign:bottomnav.fab', fab: true },
  { key: 'news', pathSuffix: 'news', icon: '📰', labelKey: 'foreign:bottomnav.news' },
  { key: 'me', pathSuffix: 'me', icon: '👤', labelKey: 'foreign:bottomnav.me' },
];

// Footer 컬럼
export const FOREIGN_FOOTER_COLUMNS = [
  {
    titleKey: 'foreign:footer.col_about',
    items: [
      { labelKey: 'foreign:footer.link_local', to: '/' },
      { labelKey: 'foreign:footer.link_terms', to: '#' },
      { labelKey: 'foreign:footer.link_privacy', to: '#' },
    ],
  },
  {
    titleKey: 'foreign:footer.col_workers',
    items: [
      { labelKey: 'foreign:topbar.menu_jobs', pathSuffix: 'jobs' },
      { labelKey: 'foreign:topbar.menu_matching', pathSuffix: 'matching' },
      { labelKey: 'foreign:topbar.menu_visa_guide', pathSuffix: 'visa-guide' },
      { labelKey: 'foreign:bottomnav.fab', pathSuffix: 'employer/jobs/new' },
    ],
  },
  {
    titleKey: 'foreign:footer.col_employers',
    items: [
      { labelKey: 'foreign:topbar.menu_news', pathSuffix: 'news' },
      { labelKey: 'foreign:topbar.menu_about', pathSuffix: 'about' },
    ],
  },
];
```

- [ ] **Step 3.4: build 검증**

```bash
cd frontend && npm run build
```

Expected: 클린.

- [ ] **Step 3.5: 커밋**

```bash
git add frontend/src/lib/foreignLink.js frontend/src/lib/foreignNav.js
git commit -m "feat(foreign): T3 — buildForeignPath / detectInitialLang 헬퍼 + 네비 메뉴 데이터"
```

---

### Task 4: 디자인 토큰 — foreign-tokens.css

**Files:**
- Create: `frontend/src/styles/foreign-tokens.css`
- Modify: `frontend/src/main.jsx` (import 1줄 추가)

- [ ] **Step 4.1: `frontend/src/styles/foreign-tokens.css` 생성**

```css
/* ============================================================
 * SodamJobs Global (foreign sub-app) — Scoped Design Tokens
 * Overrides palette + typography within .foreign-scope only.
 * Spacing / radius / shadow inherit from sodam-jobs base.
 * ============================================================ */

.foreign-scope {
  /* Palette (B2B global trust — cool off-white + sapphire + teal) */
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

  /* success/warning/danger inherit from base */

  /* Typography */
  --font-display: 'Inter', 'Pretendard', 'Noto Sans KR', 'Noto Sans', system-ui, sans-serif;
  --font-body: 'Inter', 'Pretendard', 'Noto Sans KR', 'Noto Sans', system-ui, sans-serif;
}

/* Scope의 직계 background는 토큰을 따르도록 */
.foreign-scope {
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-body);
  min-height: 100vh;
}
```

- [ ] **Step 4.2: `frontend/src/main.jsx`에 token 파일 import**

기존 `import './styles/global.css'` 다음 줄에:

```jsx
import './styles/foreign-tokens.css';
```

- [ ] **Step 4.3: build 검증 + 토큰 cascade 점검**

```bash
cd frontend && npm run build
```

빌드된 CSS 묶음에 `.foreign-scope` 셀렉터가 포함됐는지 확인:

```bash
grep -l "foreign-scope" frontend/dist/assets/*.css
```

Expected: 매칭 파일 1개 이상.

- [ ] **Step 4.4: 커밋**

```bash
git add frontend/src/styles/foreign-tokens.css frontend/src/main.jsx
git commit -m "feat(foreign): T4 — .foreign-scope 토큰 (사파이어/청록 팔레트 + Inter)"
```

---

### Task 5: 라우트 게이트 — EntryRedirect + LangGate

**Files:**
- Create: `frontend/src/components/foreign/ForeignEntryRedirect.jsx`
- Create: `frontend/src/components/foreign/ForeignLangGate.jsx`
- Modify: `frontend/src/App.jsx` (sub-app 진입점만 우선 등록, 자식 라우트는 T7에서)

- [ ] **Step 5.1: `ForeignEntryRedirect.jsx` 생성**

```jsx
import { Navigate } from 'react-router-dom';
import { detectInitialLang } from '@/lib/foreignLink';

export default function ForeignEntryRedirect() {
  const lang = detectInitialLang();
  return <Navigate to={`/foreign/${lang}`} replace />;
}
```

- [ ] **Step 5.2: `ForeignLangGate.jsx` 생성**

```jsx
import { useEffect } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, DEFAULT_LANG } from '@/i18n/config';

export default function ForeignLangGate({ children }) {
  const { lang } = useParams();
  const location = useLocation();
  const { i18n } = useTranslation();

  if (!SUPPORTED_LANGS.includes(lang)) {
    const rest = location.pathname.replace(/^\/foreign\/[^/]+/, '');
    return <Navigate to={`/foreign/${DEFAULT_LANG}${rest}${location.search}`} replace />;
  }

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    document.documentElement.lang = lang;
  }, [lang, i18n]);

  return children;
}
```

- [ ] **Step 5.3: `App.jsx`에 sub-app 진입 라우트 임시 등록 (placeholder 자식 1개)**

기존 import 구역에:

```jsx
import ForeignEntryRedirect from "./components/foreign/ForeignEntryRedirect";
import ForeignLangGate from "./components/foreign/ForeignLangGate";
```

기존 `<Routes>` 안의 본가 라우트 닫힘 직후 (`</Route>` 다음, `</Routes>` 직전)에 추가:

```jsx
{/* 외국인 sub-app — 자식 라우트는 T6/T7에서 채움 */}
<Route path="/foreign" element={<ForeignEntryRedirect />} />
<Route path="/foreign/:lang" element={<ForeignLangGate><div style={{padding:"40px"}}>foreign sub-app shell — under construction</div></ForeignLangGate>} />
```

> 임시 inline placeholder. T6에서 `ForeignLayout`으로 교체, T7에서 자식 라우트 본격 추가.

- [ ] **Step 5.4: 개발 서버 띄워 라우트 확인**

```bash
cd frontend && npm run dev
```

Browser에서 다음 URL 진입 후 확인 (다른 터미널에서 curl로도 가능):
- `http://localhost:5173/foreign` → `/foreign/ko` 또는 `/foreign/en`로 리다이렉트
- `http://localhost:5173/foreign/en` → "under construction" 표시
- `http://localhost:5173/foreign/jp` → `/foreign/ko`로 리다이렉트

브라우저 console에 `<html lang="en">` 등으로 업데이트되는지 점검(개발자 도구 Elements 탭).

- [ ] **Step 5.5: build 검증**

```bash
cd frontend && npm run build
```

- [ ] **Step 5.6: 커밋**

```bash
git add frontend/src/components/foreign/ForeignEntryRedirect.jsx frontend/src/components/foreign/ForeignLangGate.jsx frontend/src/App.jsx
git commit -m "feat(foreign): T5 — /foreign 진입 분기 + :lang 게이트 (i18n.changeLanguage)"
```

---

### Task 6: 셸 컴포넌트 — Layout / TopBar / Footer / BottomNav / LanguageSwitcher

**Files:**
- Create: `frontend/src/components/foreign/ForeignLayout.jsx` + `.module.css`
- Create: `frontend/src/components/foreign/ForeignTopBar.jsx` + `.module.css`
- Create: `frontend/src/components/foreign/ForeignFooter.jsx` + `.module.css`
- Create: `frontend/src/components/foreign/ForeignBottomNav.jsx` + `.module.css`
- Create: `frontend/src/components/foreign/LanguageSwitcher.jsx` + `.module.css`
- Modify: `frontend/src/App.jsx` (ForeignLangGate 자식에 ForeignLayout 끼움)

- [ ] **Step 6.1: `ForeignLayout.jsx` + CSS 생성**

`ForeignLayout.jsx`:

```jsx
import { Outlet } from 'react-router-dom';
import ForeignTopBar from './ForeignTopBar';
import ForeignFooter from './ForeignFooter';
import ForeignBottomNav from './ForeignBottomNav';
import styles from './ForeignLayout.module.css';

export default function ForeignLayout() {
  return (
    <div className={`foreign-scope ${styles.shell}`}>
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

`ForeignLayout.module.css`:

```css
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: var(--sp-5) var(--sp-4);
}

@media (max-width: 1023px) {
  .main {
    padding: var(--sp-4) var(--sp-3) calc(var(--sp-8) + 60px);
    /* BottomNav 자리 padding-bottom */
  }
}
```

- [ ] **Step 6.2: `LanguageSwitcher.jsx` + CSS 생성**

`LanguageSwitcher.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS } from '@/i18n/config';
import styles from './LanguageSwitcher.module.css';

const FLAGS = { ko: '🇰🇷', en: '🇬🇧', ru: '🇷🇺' };

export default function LanguageSwitcher() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('foreign');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const switchTo = (newLang) => {
    if (newLang === lang) { setOpen(false); return; }
    const newPath = location.pathname.replace(/^\/foreign\/[^/]+/, `/foreign/${newLang}`);
    localStorage.setItem('i18nextLng', newLang);
    navigate(`${newPath}${location.search}`, { replace: false });
    setOpen(false);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
      >
        <span className={styles.flag}>{FLAGS[lang] || '🌐'}</span>
        <span className={styles.label}>{t(`language_switcher.${lang}`)}</span>
        <span className={styles.chev}>▾</span>
      </button>
      {open && (
        <ul className={styles.menu} role="listbox">
          {SUPPORTED_LANGS.map((code) => (
            <li key={code}>
              <button
                type="button"
                className={`${styles.option} ${code === lang ? styles.optionActive : ''}`}
                onClick={() => switchTo(code)}
                role="option"
                aria-selected={code === lang}
              >
                <span className={styles.flag}>{FLAGS[code]}</span>
                <span>{t(`language_switcher.${code}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`LanguageSwitcher.module.css`:

```css
.wrap { position: relative; }

.trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-ink);
  font-size: 0.9rem;
}
.trigger:hover { background: var(--color-surface-elev); }

.flag { font-size: 1.1rem; line-height: 1; }
.label { white-space: nowrap; }
.chev { font-size: 0.7rem; color: var(--color-ink-mute); }

@media (max-width: 1023px) {
  .label { display: none; }
}

.menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 160px;
  margin: 0;
  padding: var(--sp-1);
  list-style: none;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 100;
}

.option {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  cursor: pointer;
  font-size: 0.95rem;
}
.option:hover { background: var(--color-surface-elev); }
.optionActive { background: var(--color-accent-soft); color: var(--color-accent-ink); }
```

- [ ] **Step 6.3: `ForeignTopBar.jsx` + CSS 생성**

`ForeignTopBar.jsx`:

```jsx
import { useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FOREIGN_TOPBAR_NAV } from '@/lib/foreignNav';
import { buildForeignPath } from '@/lib/foreignLink';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './ForeignTopBar.module.css';

export default function ForeignTopBar() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'foreign']);
  const [open, setOpen] = useState(false);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate(buildForeignPath(lang, 'login'));
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.inner}>
        <Link to={buildForeignPath(lang)} className={styles.logo} onClick={() => setOpen(false)}>
          {t('foreign:brand')}
        </Link>

        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>

        <nav className={`${styles.nav} ${open ? styles.navOpen : ''}`}>
          {FOREIGN_TOPBAR_NAV.map((item) => (
            <NavLink
              key={item.key}
              to={buildForeignPath(lang, item.pathSuffix)}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}
              onClick={() => setOpen(false)}
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
          <Link to="/" className={styles.backLocal} onClick={() => setOpen(false)}>
            {t('foreign:topbar.back_to_local')}
          </Link>
        </nav>

        <div className={styles.right}>
          <LanguageSwitcher />
          {token ? (
            <div className={styles.userMenu}>
              <span className={styles.username}>{user?.username}</span>
              <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
                {t('common:actions.logout')}
              </button>
            </div>
          ) : (
            <Link to={buildForeignPath(lang, 'login')} className={styles.loginBtn}>
              {t('common:actions.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
```

`ForeignTopBar.module.css`:

```css
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-line);
}

.inner {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--sp-3) var(--sp-4);
}

.logo {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-ink);
  letter-spacing: -0.01em;
  text-decoration: none;
}

.nav {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex: 1;
}

.navLink {
  color: var(--color-ink-soft);
  font-size: 0.95rem;
  text-decoration: none;
  padding: var(--sp-2) 0;
  border-bottom: 2px solid transparent;
}
.navLink:hover { color: var(--color-ink); }
.navActive { color: var(--color-accent-ink); border-bottom-color: var(--color-accent); }

.backLocal {
  margin-left: auto;
  color: var(--color-ink-mute);
  font-size: 0.85rem;
  text-decoration: none;
}
.backLocal:hover { color: var(--color-ink-soft); text-decoration: underline; }

.right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.userMenu { display: flex; align-items: center; gap: var(--sp-2); }
.username { font-size: 0.9rem; color: var(--color-ink-soft); }
.logoutBtn {
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 0.85rem;
}
.loginBtn {
  padding: var(--sp-2) var(--sp-4);
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  text-decoration: none;
}
.loginBtn:hover { background: var(--color-accent-ink); }

.hamburger { display: none; }

@media (max-width: 1023px) {
  .hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 32px;
    height: 32px;
    margin-left: auto;
    background: transparent;
    border: 0;
  }
  .hamburger span {
    display: block;
    width: 22px;
    height: 2px;
    background: var(--color-ink);
  }
  .nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-line);
    padding: var(--sp-2);
  }
  .navOpen { display: flex; }
  .navLink {
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--color-line-soft);
  }
  .backLocal {
    padding: var(--sp-3) var(--sp-4);
    border-top: 1px solid var(--color-line);
    margin-left: 0;
    margin-top: var(--sp-2);
  }
  .right { gap: var(--sp-2); }
  .username, .logoutBtn { display: none; } /* 모바일에선 드로어 안에 두는 게 본래 의도 */
}
```

- [ ] **Step 6.4: `ForeignFooter.jsx` + CSS 생성**

`ForeignFooter.jsx`:

```jsx
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FOREIGN_FOOTER_COLUMNS } from '@/lib/foreignNav';
import { buildForeignPath } from '@/lib/foreignLink';
import styles from './ForeignFooter.module.css';

export default function ForeignFooter() {
  const { lang } = useParams();
  const { t } = useTranslation('foreign');

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {FOREIGN_FOOTER_COLUMNS.map((col, idx) => (
          <div key={idx} className={styles.col}>
            <div className={styles.colTitle}>{t(col.titleKey.replace(/^foreign:/, ''))}</div>
            <ul className={styles.list}>
              {col.items.map((item, i) => {
                const to = item.to ?? buildForeignPath(lang, item.pathSuffix);
                return (
                  <li key={i}>
                    <Link to={to}>{t(item.labelKey.replace(/^foreign:/, ''))}</Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.bottom}>
        <span>{t('footer.powered_by')}</span>
        <span> · </span>
        <span>{t('footer.copyright')}</span>
        <span> · </span>
        <span>{lang.toUpperCase()}</span>
      </div>
    </footer>
  );
}
```

`ForeignFooter.module.css`:

```css
.footer {
  background: var(--color-surface-elev);
  border-top: 1px solid var(--color-line);
  padding: var(--sp-6) var(--sp-4) var(--sp-5);
  margin-top: var(--sp-7);
}

.inner {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-6);
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 767px) {
  .inner { grid-template-columns: 1fr; gap: var(--sp-5); }
}

.colTitle {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-ink-mute);
  margin-bottom: var(--sp-3);
}

.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
.list a { color: var(--color-ink-soft); font-size: 0.9rem; text-decoration: none; }
.list a:hover { color: var(--color-accent); }

.bottom {
  max-width: 1200px;
  margin: var(--sp-5) auto 0;
  padding-top: var(--sp-4);
  border-top: 1px solid var(--color-line);
  font-size: 0.8rem;
  color: var(--color-ink-mute);
  text-align: center;
}
```

- [ ] **Step 6.5: `ForeignBottomNav.jsx` + CSS 생성**

`ForeignBottomNav.jsx`:

```jsx
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FOREIGN_BOTTOMNAV } from '@/lib/foreignNav';
import { buildForeignPath } from '@/lib/foreignLink';
import styles from './ForeignBottomNav.module.css';

export default function ForeignBottomNav() {
  const { lang } = useParams();
  const location = useLocation();
  const { t } = useTranslation('foreign');

  const isActive = (pathSuffix) => {
    const target = buildForeignPath(lang, pathSuffix);
    if (target.endsWith('/')) return location.pathname === target;
    return location.pathname === target || location.pathname.startsWith(`${target}/`);
  };

  return (
    <nav className={styles.bar} aria-label="Mobile navigation">
      {FOREIGN_BOTTOMNAV.map((item) => {
        const to = buildForeignPath(lang, item.pathSuffix);
        const active = isActive(item.pathSuffix);
        return (
          <Link
            key={item.key}
            to={to}
            className={`${styles.tab} ${item.fab ? styles.fab : ''} ${active ? styles.active : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.icon} aria-hidden="true">{item.icon}</span>
            <span className={styles.label}>{t(item.labelKey.replace(/^foreign:/, ''))}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

`ForeignBottomNav.module.css`:

```css
.bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background: var(--color-surface);
  border-top: 1px solid var(--color-line);
  box-shadow: 0 -2px 8px rgba(11, 18, 32, 0.04);
  padding: var(--sp-1) 0 calc(var(--sp-1) + env(safe-area-inset-bottom, 0));
}

@media (max-width: 1023px) {
  .bar { display: flex; justify-content: space-around; align-items: center; }
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  padding: var(--sp-2) 0;
  color: var(--color-ink-mute);
  font-size: 0.65rem;
  text-decoration: none;
}
.tab:hover { color: var(--color-ink-soft); }
.tab.active { color: var(--color-accent-ink); }

.icon { font-size: 1.3rem; line-height: 1; }
.label { white-space: nowrap; }

.fab {
  position: relative;
  margin-top: -16px;
}
.fab .icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.35);
}
.fab.active .icon { background: var(--color-accent-ink); }
.fab .label { color: var(--color-ink-soft); }
```

- [ ] **Step 6.6: `App.jsx` 수정 — ForeignLangGate의 자식을 ForeignLayout으로**

T5의 임시 placeholder div를 다음으로 교체. 자식 라우트는 임시로 hello 텍스트 하나만 (T7에서 채움):

```jsx
import ForeignLayout from "./components/foreign/ForeignLayout";
// ...
<Route path="/foreign" element={<ForeignEntryRedirect />} />
<Route path="/foreign/:lang" element={<ForeignLangGate><ForeignLayout /></ForeignLangGate>}>
  <Route index element={<div>Hello from foreign sub-app — T7에서 채움</div>} />
</Route>
```

- [ ] **Step 6.7: 개발 서버로 셸 동작 확인**

```bash
cd frontend && npm run dev
```

브라우저 점검 항목:
- `http://localhost:5173/foreign/ko` — TopBar 로고 "SodamJobs Global", 메뉴 5개(채용공고/매칭/뉴스/비자 가이드/소개), 본가 복귀 링크, 언어 토글, 로그인 버튼 표시
- 언어 토글 → 영어/러시아어 전환 시 URL `/foreign/en` / `/foreign/ru`로 갱신 + 메뉴 라벨 변경
- 모바일 뷰포트(개발자 도구 ~390px)에서 햄버거 노출, 클릭 시 메뉴 드로어, 하단 BottomNav 5탭(가운데 FAB 부각)
- Footer 3컬럼 표시 + 하단 카피라이트

- [ ] **Step 6.8: build 검증**

```bash
cd frontend && npm run build
```

- [ ] **Step 6.9: 커밋**

```bash
git add frontend/src/components/foreign/Foreign{Layout,TopBar,Footer,BottomNav}.{jsx,module.css} frontend/src/components/foreign/LanguageSwitcher.{jsx,module.css} frontend/src/App.jsx
git commit -m "feat(foreign): T6 — 셸 컴포넌트 5개 (Layout/TopBar/Footer/BottomNav/LanguageSwitcher)"
```

---

### Task 7: ComingSoonCard + 8 placeholder pages + NotFound + 11 라우트 연결

**Files:**
- Create: `frontend/src/components/foreign/ComingSoonCard.jsx` + `.module.css`
- Create: 8 placeholder pages + 1 NotFound (`frontend/src/pages/foreign/Foreign*Placeholder.jsx` + `ForeignNotFound.jsx`)
- Modify: `frontend/src/App.jsx`

- [ ] **Step 7.1: `ComingSoonCard.jsx` + CSS 생성**

`ComingSoonCard.jsx`:

```jsx
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ComingSoonCard.module.css';

export default function ComingSoonCard({ titleKey, bodyKey, cycleHint, fallbackCTA }) {
  const { lang } = useParams();
  const { t, i18n } = useTranslation('foreign');

  return (
    <section className={styles.card}>
      <svg className={styles.illust} viewBox="0 0 120 80" aria-hidden="true">
        <rect x="20" y="30" width="80" height="40" rx="4" fill="var(--color-accent-soft)" />
        <circle cx="40" cy="50" r="6" fill="var(--color-accent)" />
        <rect x="55" y="44" width="36" height="4" rx="2" fill="var(--color-accent)" />
        <rect x="55" y="52" width="24" height="4" rx="2" fill="var(--color-line)" />
        <path d="M60 12 L66 22 L54 22 Z" fill="var(--color-warm)" />
      </svg>
      <div className={styles.badge}>{t('placeholder.coming_soon_label')}</div>
      <h1 className={styles.title}>{t(titleKey.replace(/^foreign:/, ''))}</h1>
      <p className={styles.body}>{t(bodyKey.replace(/^foreign:/, ''))}</p>
      {cycleHint && lang === 'ko' && (
        <p className={styles.cycleHint}>다음 업데이트({cycleHint})에서 채워집니다.</p>
      )}
      {fallbackCTA && (
        <Link to={fallbackCTA.to} className={styles.cta}>
          {t(fallbackCTA.labelKey.replace(/^foreign:/, ''))} →
        </Link>
      )}
    </section>
  );
}
```

`ComingSoonCard.module.css`:

```css
.card {
  max-width: 560px;
  margin: var(--sp-6) auto;
  padding: var(--sp-6) var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  text-align: center;
}

.illust { width: 120px; height: 80px; margin: 0 auto var(--sp-4); }

.badge {
  display: inline-block;
  padding: 2px var(--sp-2);
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);
  color: var(--color-accent-ink);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: var(--sp-3);
}

.title { font-size: 1.5rem; margin-bottom: var(--sp-3); }
.body { color: var(--color-ink-soft); line-height: 1.65; margin-bottom: var(--sp-4); }
.cycleHint { color: var(--color-ink-mute); font-size: 0.85rem; margin-bottom: var(--sp-4); }

.cta {
  display: inline-block;
  padding: var(--sp-3) var(--sp-5);
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  text-decoration: none;
}
.cta:hover { background: var(--color-accent-ink); }
```

- [ ] **Step 7.2: KO/EN foreign.json에 placeholder 본문 키 추가**

`ko/foreign.json`의 `placeholder` 객체에 다음 키 8쌍 추가 (이미 일부 있으면 보강):

```json
"placeholder": {
  "title": "준비 중입니다",
  "coming_soon_label": "Coming Soon",
  "try_local": "본가 단기알바 보기",
  "external_eps": "공식 정부 가이드 (eps.go.kr)",
  "external_hikorea": "공식 출입국 가이드 (hikorea.go.kr)",
  "external_seoul_global": "서울 외국인 포털",
  "jobs_title": "외국인 채용공고",
  "jobs_body": "비자별 외국인 채용공고는 곧 공개됩니다. 한국어 / 영어 / 러시아어 필터를 지원할 예정입니다.",
  "employer_title": "기업 채용",
  "employer_body": "외국인 채용을 시작하실 기업은 먼저 회원가입 후 회사 정보를 등록해주세요.",
  "me_title": "마이페이지",
  "me_body": "이력서·지원 현황·받은 매칭은 다음 업데이트에서 공개됩니다.",
  "matching_title": "자동 매칭",
  "matching_body": "비자/언어/직종 기반 자동 매칭 기능이 준비 중입니다.",
  "news_title": "뉴스룸",
  "news_body": "외국인 채용 정책·이민·취업 가이드 콘텐츠가 곧 공개됩니다.",
  "visa_title": "비자 가이드",
  "visa_body": "E-7 / E-9 / F-시리즈 / H-2 등 비자별 자격·신청 가이드가 준비 중입니다.",
  "life_title": "한국 생활 가이드",
  "life_body": "외국인 등록·계좌·통신·주거 가이드가 준비 중입니다.",
  "notfound_title": "페이지를 찾을 수 없습니다",
  "notfound_body": "URL을 다시 확인해주세요. 홈으로 돌아가거나 메뉴에서 다른 페이지를 선택할 수 있습니다."
}
```

`en/foreign.json`의 `placeholder`에 동일 키 EN 번역:

```json
"placeholder": {
  "title": "Coming Soon",
  "coming_soon_label": "Coming Soon",
  "try_local": "Browse local jobs",
  "external_eps": "Official government guide (eps.go.kr)",
  "external_hikorea": "Official immigration guide (hikorea.go.kr)",
  "external_seoul_global": "Seoul Global Center",
  "jobs_title": "Foreign Jobs",
  "jobs_body": "Visa-aware job postings are coming soon. Korean / English / Russian filters will be supported.",
  "employer_title": "For Employers",
  "employer_body": "To hire foreign workers, please create an account and register your company profile first.",
  "me_title": "My Page",
  "me_body": "Your resume, applications, and incoming matches will appear here in a future update.",
  "matching_title": "Auto-Matching",
  "matching_body": "Automatic matching based on visa, language, and job category is in development.",
  "news_title": "Newsroom",
  "news_body": "Articles on foreign-hiring policy, immigration, and career guidance are coming soon.",
  "visa_title": "Visa Guide",
  "visa_body": "Guides for E-7 / E-9 / F-series / H-2 visas — eligibility and application process — are being prepared.",
  "life_title": "Living in Korea",
  "life_body": "Guides for alien registration, banking, mobile, and housing are being prepared.",
  "notfound_title": "Page not found",
  "notfound_body": "Please check the URL. You can return home or pick another page from the menu."
}
```

`ru/foreign.json`의 placeholder는 핵심 키(`title`, `coming_soon_label`, `try_local`)만 두고 나머지는 EN fallback 처리(키 미존재 시 자동 fallback).

- [ ] **Step 7.3: 8 placeholder 페이지 + NotFound 생성**

각 파일은 ComingSoonCard 한 줄. 패턴이 동일하므로 한 번에 8개 작성.

`frontend/src/pages/foreign/ForeignJobsPlaceholder.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import ComingSoonCard from '@/components/foreign/ComingSoonCard';

export default function ForeignJobsPlaceholder() {
  const { t } = useTranslation('foreign');
  return (
    <>
      <Helmet>
        <title>{t('placeholder.jobs_title')} — {t('brand')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <ComingSoonCard
        titleKey="placeholder.jobs_title"
        bodyKey="placeholder.jobs_body"
        cycleHint="F2"
        fallbackCTA={{ labelKey: 'placeholder.try_local', to: '/jobs' }}
      />
    </>
  );
}
```

`frontend/src/pages/foreign/ForeignEmployerPlaceholder.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ComingSoonCard from '@/components/foreign/ComingSoonCard';
import { buildForeignPath } from '@/lib/foreignLink';

export default function ForeignEmployerPlaceholder() {
  const { lang } = useParams();
  const { t } = useTranslation('foreign');
  return (
    <>
      <Helmet>
        <title>{t('placeholder.employer_title')} — {t('brand')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <ComingSoonCard
        titleKey="placeholder.employer_title"
        bodyKey="placeholder.employer_body"
        cycleHint="F3"
        fallbackCTA={{
          labelKey: 'signup.title',
          to: `${buildForeignPath(lang, 'signup')}?role=employer`,
        }}
      />
    </>
  );
}
```

`frontend/src/pages/foreign/ForeignSeekerPlaceholder.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import ComingSoonCard from '@/components/foreign/ComingSoonCard';

export default function ForeignSeekerPlaceholder() {
  const { t } = useTranslation('foreign');
  return (
    <>
      <Helmet>
        <title>{t('placeholder.me_title')} — {t('brand')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <ComingSoonCard
        titleKey="placeholder.me_title"
        bodyKey="placeholder.me_body"
        cycleHint="F4"
        fallbackCTA={{ labelKey: 'placeholder.try_local', to: '/my/jobs' }}
      />
    </>
  );
}
```

`frontend/src/pages/foreign/ForeignMatchingPlaceholder.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ComingSoonCard from '@/components/foreign/ComingSoonCard';
import { buildForeignPath } from '@/lib/foreignLink';

export default function ForeignMatchingPlaceholder() {
  const { lang } = useParams();
  const { t } = useTranslation('foreign');
  return (
    <>
      <Helmet>
        <title>{t('placeholder.matching_title')} — {t('brand')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <ComingSoonCard
        titleKey="placeholder.matching_title"
        bodyKey="placeholder.matching_body"
        cycleHint="F5"
        fallbackCTA={{ labelKey: 'topbar.menu_jobs', to: buildForeignPath(lang, 'jobs') }}
      />
    </>
  );
}
```

`frontend/src/pages/foreign/ForeignNewsPlaceholder.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import ComingSoonCard from '@/components/foreign/ComingSoonCard';

export default function ForeignNewsPlaceholder() {
  const { t } = useTranslation('foreign');
  return (
    <>
      <Helmet>
        <title>{t('placeholder.news_title')} — {t('brand')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <ComingSoonCard
        titleKey="placeholder.news_title"
        bodyKey="placeholder.news_body"
        cycleHint="F6"
        fallbackCTA={{ labelKey: 'placeholder.external_eps', to: 'https://www.eps.go.kr' }}
      />
    </>
  );
}
```

`frontend/src/pages/foreign/ForeignVisaGuidePlaceholder.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import ComingSoonCard from '@/components/foreign/ComingSoonCard';

export default function ForeignVisaGuidePlaceholder() {
  const { t } = useTranslation('foreign');
  return (
    <>
      <Helmet>
        <title>{t('placeholder.visa_title')} — {t('brand')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <ComingSoonCard
        titleKey="placeholder.visa_title"
        bodyKey="placeholder.visa_body"
        cycleHint="F6"
        fallbackCTA={{ labelKey: 'placeholder.external_hikorea', to: 'https://www.hikorea.go.kr' }}
      />
    </>
  );
}
```

`frontend/src/pages/foreign/ForeignLifeGuidePlaceholder.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import ComingSoonCard from '@/components/foreign/ComingSoonCard';

export default function ForeignLifeGuidePlaceholder() {
  const { t } = useTranslation('foreign');
  return (
    <>
      <Helmet>
        <title>{t('placeholder.life_title')} — {t('brand')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <ComingSoonCard
        titleKey="placeholder.life_title"
        bodyKey="placeholder.life_body"
        cycleHint="F6"
        fallbackCTA={{ labelKey: 'placeholder.external_seoul_global', to: 'https://global.seoul.go.kr' }}
      />
    </>
  );
}
```

`frontend/src/pages/foreign/ForeignNotFound.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buildForeignPath } from '@/lib/foreignLink';
import styles from './ForeignNotFound.module.css';

export default function ForeignNotFound() {
  const { lang } = useParams();
  const { t } = useTranslation('foreign');
  return (
    <>
      <Helmet>
        <title>404 — {t('brand')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <section className={styles.wrap}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>{t('placeholder.notfound_title')}</h1>
        <p className={styles.body}>{t('placeholder.notfound_body')}</p>
        <nav className={styles.menu}>
          <Link to={buildForeignPath(lang)}>{t('bottomnav.home')}</Link>
          <Link to={buildForeignPath(lang, 'jobs')}>{t('topbar.menu_jobs')}</Link>
          <Link to={buildForeignPath(lang, 'news')}>{t('topbar.menu_news')}</Link>
          <Link to={buildForeignPath(lang, 'visa-guide')}>{t('topbar.menu_visa_guide')}</Link>
          <Link to={buildForeignPath(lang, 'about')}>{t('topbar.menu_about')}</Link>
        </nav>
      </section>
    </>
  );
}
```

`frontend/src/pages/foreign/ForeignNotFound.module.css`:

```css
.wrap {
  text-align: center;
  padding: var(--sp-8) var(--sp-4);
}
.code {
  font-family: var(--font-display);
  font-size: 5rem;
  font-weight: 700;
  color: var(--color-accent-soft);
  line-height: 1;
}
.title { font-size: 1.5rem; margin: var(--sp-3) 0 var(--sp-3); }
.body { color: var(--color-ink-soft); margin-bottom: var(--sp-5); }
.menu { display: flex; gap: var(--sp-4); justify-content: center; flex-wrap: wrap; }
.menu a { color: var(--color-accent); text-decoration: none; }
.menu a:hover { text-decoration: underline; }
```

- [ ] **Step 7.4: `App.jsx`에 자식 라우트 11개 연결**

T6의 임시 hello div를 모두 교체. import 추가 + 라우트 본격 등록:

```jsx
import ForeignJobsPlaceholder from "./pages/foreign/ForeignJobsPlaceholder";
import ForeignEmployerPlaceholder from "./pages/foreign/ForeignEmployerPlaceholder";
import ForeignSeekerPlaceholder from "./pages/foreign/ForeignSeekerPlaceholder";
import ForeignMatchingPlaceholder from "./pages/foreign/ForeignMatchingPlaceholder";
import ForeignNewsPlaceholder from "./pages/foreign/ForeignNewsPlaceholder";
import ForeignVisaGuidePlaceholder from "./pages/foreign/ForeignVisaGuidePlaceholder";
import ForeignLifeGuidePlaceholder from "./pages/foreign/ForeignLifeGuidePlaceholder";
import ForeignNotFound from "./pages/foreign/ForeignNotFound";
// 완성 페이지 4개 (T8-T10에서 생성) — 일단 placeholder로 두고 T8 이후 교체
import ForeignJobsPlaceholder as _ForeignHomePagePlaceholder from "./pages/foreign/ForeignJobsPlaceholder"; // 임시
```

> 임시 import 트릭은 보기 흉하므로, **T7 단계에선 index/about/login/signup도 임시로 ForeignNotFound 또는 inline div로 두고, T8-T10에서 본 컴포넌트로 교체**하는 게 깔끔. 다음과 같이:

```jsx
<Route path="/foreign/:lang" element={<ForeignLangGate><ForeignLayout /></ForeignLangGate>}>
  <Route index element={<div style={{padding:32}}>Home — T8</div>} />
  <Route path="about" element={<div style={{padding:32}}>About — T9</div>} />
  <Route path="login" element={<div style={{padding:32}}>Login — T10</div>} />
  <Route path="signup" element={<div style={{padding:32}}>Signup — T10</div>} />
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
```

- [ ] **Step 7.5: build + 개발 서버에서 8개 placeholder + NotFound 진입 점검**

```bash
cd frontend && npm run build && npm run dev
```

브라우저 점검:
- `/foreign/ko/jobs` → ComingSoonCard "외국인 채용공고" + 다음 업데이트 F2 안내 + 본가 단기알바 보기 CTA
- `/foreign/en/employer` → "For Employers" 영문 + Sign up CTA
- `/foreign/ko/random-non-existent` → ForeignNotFound (404 + 메뉴 5개)
- 각 placeholder의 `<title>` (브라우저 탭) 갱신 확인
- 개발자 도구 Elements 탭에서 `<meta name="robots" content="noindex,nofollow">` 확인

- [ ] **Step 7.6: 커밋**

```bash
git add frontend/src/components/foreign/ComingSoonCard.{jsx,module.css} frontend/src/pages/foreign/Foreign*.{jsx,module.css} frontend/src/i18n/locales frontend/src/App.jsx
git commit -m "feat(foreign): T7 — ComingSoonCard + 8 placeholder + NotFound + 11 라우트 연결"
```

---

### Task 8: ForeignHomePage

**Files:**
- Create: `frontend/src/pages/foreign/ForeignHomePage.jsx` + `.module.css`
- Modify: `frontend/src/App.jsx`
- Modify: KO/EN foreign.json (home 키 확장)

- [ ] **Step 8.1: KO/EN foreign.json `home` 객체 확장**

`ko/foreign.json`의 `home` 객체를 다음으로 교체:

```json
"home": {
  "hero_title": "한국에서 일하고 싶은 모든 외국인에게",
  "hero_subtitle": "비자 지원 · 다국어 채용 · 동네 단기 알바부터 정규직까지",
  "cta_browse": "채용공고 둘러보기",
  "cta_signup_employer": "기업 회원가입",
  "values_title": "왜 SodamJobs Global인가",
  "value_1_title": "비자별 매칭",
  "value_1_body": "E-7 · E-9 · F-시리즈 · H-2 등 비자 유형에 맞춰 자격이 통과되는 공고만 골라드립니다.",
  "value_2_title": "한국어 / 영어 / 러시아어",
  "value_2_body": "검색 화면부터 지원·면접까지 3개 언어로 진행 가능합니다.",
  "value_3_title": "단기부터 정규직까지",
  "value_3_body": "동네 단기 알바와 제조업 정규직을 한 곳에서 비교하고 지원하세요.",
  "visa_chips_title": "인기 비자 카테고리",
  "preview_title": "최근 채용공고",
  "preview_note": "실 데이터 연결은 F2에서 진행됩니다.",
  "employer_cta_title": "외국인 채용을 시작하세요",
  "employer_cta_body": "회사 등록 → 공고 작성 → 비자 자격 자동 매칭 — 한 곳에서.",
  "employer_cta_btn": "기업 회원가입",
  "cross_local_title": "한국인 알바·구인은 sodam-jobs에서",
  "cross_local_btn": "본가로 가기"
}
```

`en/foreign.json`의 `home` 객체 동일 키 EN 번역:

```json
"home": {
  "hero_title": "Find your next job in Korea",
  "hero_subtitle": "Visa support · multilingual hiring · short-term gigs to full-time roles",
  "cta_browse": "Browse jobs",
  "cta_signup_employer": "Sign up as employer",
  "values_title": "Why SodamJobs Global",
  "value_1_title": "Visa-aware matching",
  "value_1_body": "We surface only the jobs whose visa eligibility matches yours — E-7, E-9, F-series, H-2 and more.",
  "value_2_title": "Korean / English / Russian",
  "value_2_body": "From browsing to applying and interviewing — all in three languages.",
  "value_3_title": "Short-term to full-time",
  "value_3_body": "Compare local part-time gigs and manufacturing full-time roles in one place.",
  "visa_chips_title": "Popular visa categories",
  "preview_title": "Recent job postings",
  "preview_note": "Live data wiring lands in F2.",
  "employer_cta_title": "Start hiring foreign talent",
  "employer_cta_body": "Register company → post a job → auto-match by visa eligibility. All in one place.",
  "employer_cta_btn": "Sign up as employer",
  "cross_local_title": "Local jobs for Koreans live on sodam-jobs",
  "cross_local_btn": "Visit main site"
}
```

- [ ] **Step 8.2: `ForeignHomePage.jsx` + CSS 생성**

`ForeignHomePage.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buildForeignPath } from '@/lib/foreignLink';
import styles from './ForeignHomePage.module.css';

const VISA_CHIPS = ['E-7', 'E-9', 'F-2', 'F-4', 'H-2', 'D-2'];

const DUMMY_PREVIEW = [
  { id: 'p1', title: '서울 강남구 카페 홀 알바 (외국인 환영)', meta: 'E-9 · 시급 12,500원' },
  { id: 'p2', title: '경기 안산 제조업 숙련공 모집', meta: 'E-7 · 월 320만원' },
  { id: 'p3', title: '부산 호텔 프론트 (영어 가능자)', meta: 'F-2 · 월 280만원' },
];

export default function ForeignHomePage() {
  const { lang } = useParams();
  const { t } = useTranslation('foreign');
  const baseUrl = 'https://sodam-jobs.twinverse.org';

  return (
    <>
      <Helmet>
        <title>{t('home.hero_title')} — {t('brand')}</title>
        <meta name="description" content={t('home.hero_subtitle')} />
        <link rel="alternate" hrefLang="ko" href={`${baseUrl}/foreign/ko/`} />
        <link rel="alternate" hrefLang="en" href={`${baseUrl}/foreign/en/`} />
        <link rel="alternate" hrefLang="ru" href={`${baseUrl}/foreign/ru/`} />
        <link rel="alternate" hrefLang="x-default" href={`${baseUrl}/foreign/`} />
      </Helmet>

      {/* 1. Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>{t('home.hero_title')}</h1>
          <p className={styles.heroSubtitle}>{t('home.hero_subtitle')}</p>
          <div className={styles.heroCtas}>
            <Link to={buildForeignPath(lang, 'jobs')} className={styles.ctaPrimary}>
              {t('home.cta_browse')} →
            </Link>
            <Link to={`${buildForeignPath(lang, 'signup')}?role=employer`} className={styles.ctaSecondary}>
              {t('home.cta_signup_employer')}
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 가치 제안 3블록 */}
      <section className={styles.values}>
        <h2 className={styles.sectionTitle}>{t('home.values_title')}</h2>
        <div className={styles.valueGrid}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={styles.valueCard}>
              <div className={styles.valueIcon}>{['🛂', '🌐', '📍'][n - 1]}</div>
              <h3 className={styles.valueTitle}>{t(`home.value_${n}_title`)}</h3>
              <p className={styles.valueBody}>{t(`home.value_${n}_body`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 비자 칩 */}
      <section className={styles.visaSection}>
        <h2 className={styles.sectionTitle}>{t('home.visa_chips_title')}</h2>
        <div className={styles.chips}>
          {VISA_CHIPS.map((visa) => (
            <Link
              key={visa}
              to={`${buildForeignPath(lang, 'visa-guide')}#${visa}`}
              className={styles.chip}
            >
              {visa}
            </Link>
          ))}
        </div>
      </section>

      {/* 4. 최근 공고 미리보기 (더미) */}
      <section className={styles.preview}>
        <h2 className={styles.sectionTitle}>{t('home.preview_title')}</h2>
        <p className={styles.previewNote}>{t('home.preview_note')}</p>
        <div className={styles.previewGrid}>
          {DUMMY_PREVIEW.map((job) => (
            <Link key={job.id} to={buildForeignPath(lang, 'jobs')} className={styles.previewCard}>
              <h3>{job.title}</h3>
              <p>{job.meta}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Employer 콜아웃 */}
      <section className={styles.employerCta}>
        <div className={styles.employerCtaInner}>
          <h2>{t('home.employer_cta_title')}</h2>
          <p>{t('home.employer_cta_body')}</p>
          <Link to={`${buildForeignPath(lang, 'signup')}?role=employer`} className={styles.ctaPrimary}>
            {t('home.employer_cta_btn')} →
          </Link>
        </div>
      </section>

      {/* 6. 본가 크로스링크 */}
      <section className={styles.crossLocal}>
        <h3>{t('home.cross_local_title')}</h3>
        <Link to="/" className={styles.crossLocalBtn}>{t('home.cross_local_btn')} →</Link>
      </section>
    </>
  );
}
```

`ForeignHomePage.module.css`:

```css
.hero {
  background: linear-gradient(135deg, var(--color-accent-soft) 0%, var(--color-bg) 100%);
  padding: var(--sp-8) var(--sp-4);
  border-radius: var(--radius-lg);
  margin-bottom: var(--sp-7);
}
.heroInner { max-width: 720px; }
.heroTitle {
  font-size: 2.5rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin-bottom: var(--sp-4);
  color: var(--color-ink);
}
.heroSubtitle {
  font-size: 1.15rem;
  color: var(--color-ink-soft);
  margin-bottom: var(--sp-5);
  line-height: 1.6;
}
.heroCtas { display: flex; gap: var(--sp-3); flex-wrap: wrap; }

.ctaPrimary {
  display: inline-block;
  padding: var(--sp-3) var(--sp-5);
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
}
.ctaPrimary:hover { background: var(--color-accent-ink); }
.ctaSecondary {
  display: inline-block;
  padding: var(--sp-3) var(--sp-5);
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  font-size: 1rem;
  text-decoration: none;
}
.ctaSecondary:hover { background: var(--color-surface-elev); }

.sectionTitle {
  font-size: 1.5rem;
  margin-bottom: var(--sp-4);
  font-family: var(--font-display);
}

.values { margin-bottom: var(--sp-7); }
.valueGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-4);
}
@media (max-width: 767px) { .valueGrid { grid-template-columns: 1fr; } }

.valueCard {
  padding: var(--sp-5);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}
.valueIcon { font-size: 2rem; margin-bottom: var(--sp-3); }
.valueTitle { font-size: 1.1rem; margin-bottom: var(--sp-2); }
.valueBody { color: var(--color-ink-soft); line-height: 1.6; font-size: 0.95rem; }

.visaSection { margin-bottom: var(--sp-7); }
.chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.chip {
  display: inline-block;
  padding: var(--sp-2) var(--sp-4);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 100px;
  color: var(--color-ink);
  font-weight: 500;
  text-decoration: none;
  font-size: 0.95rem;
}
.chip:hover { border-color: var(--color-accent); color: var(--color-accent-ink); }

.preview { margin-bottom: var(--sp-7); }
.previewNote { color: var(--color-ink-mute); font-size: 0.85rem; margin-bottom: var(--sp-3); }
.previewGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-4);
}
@media (max-width: 767px) { .previewGrid { grid-template-columns: 1fr; } }
.previewCard {
  padding: var(--sp-4);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
}
.previewCard:hover { border-color: var(--color-accent); box-shadow: var(--shadow-sm); }
.previewCard h3 { font-size: 1rem; margin-bottom: var(--sp-2); }
.previewCard p { color: var(--color-ink-mute); font-size: 0.85rem; }

.employerCta {
  background: var(--color-ink);
  color: #fff;
  border-radius: var(--radius-lg);
  padding: var(--sp-6) var(--sp-5);
  margin-bottom: var(--sp-6);
}
.employerCtaInner h2 { margin-bottom: var(--sp-3); color: #fff; font-size: 1.5rem; }
.employerCtaInner p { color: rgba(255,255,255,0.8); margin-bottom: var(--sp-4); line-height: 1.6; }
.employerCta .ctaPrimary { background: #fff; color: var(--color-ink); }
.employerCta .ctaPrimary:hover { background: var(--color-surface-elev); }

.crossLocal {
  text-align: center;
  padding: var(--sp-5);
  background: var(--color-surface-elev);
  border-radius: var(--radius-md);
}
.crossLocal h3 { font-size: 1.1rem; margin-bottom: var(--sp-3); color: var(--color-ink-soft); }
.crossLocalBtn { color: var(--color-accent); font-weight: 600; text-decoration: none; }
.crossLocalBtn:hover { text-decoration: underline; }
```

- [ ] **Step 8.3: `App.jsx`의 `<Route index>` 교체**

```jsx
import ForeignHomePage from "./pages/foreign/ForeignHomePage";
// ...
<Route index element={<ForeignHomePage />} />
```

- [ ] **Step 8.4: build + 개발 서버 점검**

```bash
cd frontend && npm run build && npm run dev
```

- `/foreign/ko` 진입 → 6 섹션 모두 렌더 (Hero / 가치 3블록 / 비자 칩 6개 / 미리보기 3카드 / Employer 콜아웃 / 본가 크로스링크)
- `/foreign/en` → 영문 카피
- 모바일 뷰포트 — 그리드 1열로 접힘, BottomNav 자리 padding 정상

- [ ] **Step 8.5: 커밋**

```bash
git add frontend/src/pages/foreign/ForeignHomePage.{jsx,module.css} frontend/src/App.jsx frontend/src/i18n/locales
git commit -m "feat(foreign): T8 — ForeignHomePage 6 섹션 (Hero/가치/비자칩/미리보기/Employer/본가)"
```

---

### Task 9: ForeignAboutPage

**Files:**
- Create: `frontend/src/pages/foreign/ForeignAboutPage.jsx` + `.module.css`
- Modify: `frontend/src/App.jsx`
- Modify: KO/EN foreign.json (about 키 확장)

- [ ] **Step 9.1: KO/EN foreign.json `about` 객체 확장**

`ko/foreign.json`의 `about` 객체:

```json
"about": {
  "hero": "외국인 인재와 한국 기업을 잇습니다",
  "lead": "SodamJobs Global은 외국인 구직자가 한국에서 일자리를 찾는 모든 과정을 한 곳에서 해결할 수 있게 돕습니다.",
  "section_what_title": "우리가 하는 일",
  "section_what_body": "비자 자격과 한국어 수준에 맞는 일자리 매칭, 한국 채용 정책·이민 정보 가이드, 다국어 지원으로 구직 장벽을 낮추는 것이 우리의 임무입니다.",
  "section_who_title": "누구를 위한 곳인가요",
  "section_who_body": "E-7 숙련 인력, E-9 비전문 인력, F-시리즈 거주자, H-2 방문취업, D-시리즈 유학생 — 한국에서 합법적으로 일할 수 있는 모든 외국인 구직자와, 외국인 채용이 필요한 한국 기업을 위한 곳입니다.",
  "section_org_title": "운영주체",
  "section_org_body": "sodam-jobs의 외국인 사용자 확장 브랜드로 운영됩니다.",
  "operator_name": "SodamJobs Global",
  "local_link": "본가 sodam-jobs 바로가기"
}
```

`en/foreign.json`의 `about` 객체:

```json
"about": {
  "hero": "Bridging foreign talent and Korean employers",
  "lead": "SodamJobs Global helps foreign job seekers handle every step of finding work in Korea — in one place.",
  "section_what_title": "What we do",
  "section_what_body": "Matching jobs by visa eligibility and Korean proficiency, guides on Korean hiring policy and immigration, and multilingual support to lower the barrier to entry.",
  "section_who_title": "Who it's for",
  "section_who_body": "E-7 specialists, E-9 non-professionals, F-series residents, H-2 working-holiday visitors, D-series students — anyone legally permitted to work in Korea, plus Korean employers who want to hire foreign talent.",
  "section_org_title": "Operator",
  "section_org_body": "Operated as the foreign-audience extension brand of sodam-jobs.",
  "operator_name": "SodamJobs Global",
  "local_link": "Visit sodam-jobs main site"
}
```

- [ ] **Step 9.2: `ForeignAboutPage.jsx` + CSS 생성**

`ForeignAboutPage.jsx`:

```jsx
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './ForeignAboutPage.module.css';

export default function ForeignAboutPage() {
  const { t } = useTranslation('foreign');
  const baseUrl = 'https://sodam-jobs.twinverse.org';

  return (
    <>
      <Helmet>
        <title>{t('about.section_what_title')} — {t('brand')}</title>
        <meta name="description" content={t('about.lead')} />
        <link rel="alternate" hrefLang="ko" href={`${baseUrl}/foreign/ko/about`} />
        <link rel="alternate" hrefLang="en" href={`${baseUrl}/foreign/en/about`} />
        <link rel="alternate" hrefLang="ru" href={`${baseUrl}/foreign/ru/about`} />
      </Helmet>

      <article className={styles.wrap}>
        <header className={styles.head}>
          <h1 className={styles.hero}>{t('about.hero')}</h1>
          <p className={styles.lead}>{t('about.lead')}</p>
        </header>

        <section className={styles.section}>
          <h2>{t('about.section_what_title')}</h2>
          <p>{t('about.section_what_body')}</p>
        </section>

        <section className={styles.section}>
          <h2>{t('about.section_who_title')}</h2>
          <p>{t('about.section_who_body')}</p>
        </section>

        <section className={styles.section}>
          <h2>{t('about.section_org_title')}</h2>
          <p><strong>{t('about.operator_name')}</strong></p>
          <p>{t('about.section_org_body')}</p>
          <p><Link to="/">{t('about.local_link')} →</Link></p>
        </section>
      </article>
    </>
  );
}
```

`ForeignAboutPage.module.css`:

```css
.wrap { max-width: 720px; margin: 0 auto; }
.head { margin-bottom: var(--sp-7); }
.hero {
  font-size: 2rem;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin-bottom: var(--sp-4);
}
.lead { font-size: 1.1rem; color: var(--color-ink-soft); line-height: 1.6; }

.section { margin-bottom: var(--sp-6); }
.section h2 {
  font-size: 1.25rem;
  margin-bottom: var(--sp-3);
  padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--color-line-soft);
}
.section p {
  color: var(--color-ink-soft);
  line-height: 1.7;
  margin-bottom: var(--sp-3);
}
.section a { color: var(--color-accent); font-weight: 600; text-decoration: none; }
.section a:hover { text-decoration: underline; }
```

- [ ] **Step 9.3: `App.jsx`의 about 라우트 교체**

```jsx
import ForeignAboutPage from "./pages/foreign/ForeignAboutPage";
// ...
<Route path="about" element={<ForeignAboutPage />} />
```

- [ ] **Step 9.4: build + 개발 서버 점검**

`/foreign/ko/about`, `/foreign/en/about` 진입 시 3섹션 + Hero 정상 표시.

- [ ] **Step 9.5: 커밋**

```bash
git add frontend/src/pages/foreign/ForeignAboutPage.{jsx,module.css} frontend/src/App.jsx frontend/src/i18n/locales
git commit -m "feat(foreign): T9 — ForeignAboutPage (미션 hero + 3 섹션)"
```

---

### Task 10: ForeignLoginPage + ForeignSignupPage

**Files:**
- Create: `frontend/src/pages/foreign/ForeignLoginPage.jsx` + `.module.css`
- Create: `frontend/src/pages/foreign/ForeignSignupPage.jsx` (CSS는 LoginPage CSS 공유)
- Modify: `frontend/src/App.jsx`

> 사전 확인: 본가 `LoginPage.jsx`에서 사용하는 API endpoint를 그대로 호출. 보통 `services/api.js`에 axios instance가 있고 `POST /api/auth/login`, `POST /api/auth/register`를 호출. 작업 시 본가 LoginPage 구조를 한 번 살펴 같은 패턴으로.

- [ ] **Step 10.1: 본가 LoginPage 패턴 확인**

```bash
cat frontend/src/pages/LoginPage.jsx
```

→ axios baseURL, endpoint, 응답 구조(`token`, `user` 필드), localStorage 키 (`token`, `user`)를 메모.

- [ ] **Step 10.2: `ForeignLoginPage.jsx` + CSS 생성**

`ForeignLoginPage.jsx`:

```jsx
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { buildForeignPath } from '@/lib/foreignLink';
import styles from './ForeignLoginPage.module.css';

export default function ForeignLoginPage() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['common', 'foreign']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      const redirectTo = location.state?.from || buildForeignPath(lang);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError(t('common:errors.invalid_credentials'));
      } else {
        setError(t('common:errors.network'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('foreign:login.title')} — {t('foreign:brand')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <section className={styles.wrap}>
        <h1 className={styles.title}>{t('foreign:login.title')}</h1>
        <p className={styles.subtitle}>{t('foreign:login.subtitle')}</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span>{t('foreign:login.email_label')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className={styles.field}>
            <span>{t('foreign:login.password_label')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <div className={styles.error} role="alert">{error}</div>}
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? '...' : t('common:actions.login')}
          </button>
        </form>

        <div className={styles.bottom}>
          <span>{t('foreign:login.no_account')}</span>{' '}
          <Link to={buildForeignPath(lang, 'signup')}>{t('foreign:login.go_signup')}</Link>
        </div>
      </section>
    </>
  );
}
```

`ForeignLoginPage.module.css`:

```css
.wrap {
  max-width: 420px;
  margin: var(--sp-6) auto;
  padding: var(--sp-6);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
}

.title { font-size: 1.6rem; margin-bottom: var(--sp-2); text-align: center; }
.subtitle { color: var(--color-ink-soft); text-align: center; margin-bottom: var(--sp-5); font-size: 0.95rem; }

.form { display: flex; flex-direction: column; gap: var(--sp-3); }
.field { display: flex; flex-direction: column; gap: var(--sp-1); font-size: 0.9rem; color: var(--color-ink-soft); }
.field input {
  padding: var(--sp-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font-size: 1rem;
}
.field input:focus { outline: 2px solid var(--color-accent); outline-offset: -1px; }

.error {
  padding: var(--sp-3);
  background: var(--color-warm-soft);
  border: 1px solid var(--color-warm);
  border-radius: var(--radius-md);
  color: var(--color-warm);
  font-size: 0.9rem;
}

.submit {
  padding: var(--sp-3) var(--sp-5);
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  border: 0;
  cursor: pointer;
  margin-top: var(--sp-2);
}
.submit:hover { background: var(--color-accent-ink); }
.submit:disabled { opacity: 0.5; cursor: not-allowed; }

.bottom {
  margin-top: var(--sp-5);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--color-line-soft);
  text-align: center;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
}
.bottom a { color: var(--color-accent); font-weight: 600; text-decoration: none; margin-left: var(--sp-1); }
.bottom a:hover { text-decoration: underline; }
```

- [ ] **Step 10.3: `ForeignSignupPage.jsx` 생성**

```jsx
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { buildForeignPath } from '@/lib/foreignLink';
import styles from './ForeignLoginPage.module.css';

export default function ForeignSignupPage() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation(['common', 'foreign']);
  const roleHint = searchParams.get('role') === 'employer' ? 'employer' : 'user';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(roleHint);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError(t('common:errors.passwords_mismatch'));
      return;
    }
    if (!agreeTerms) {
      setError(t('common:errors.required'));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post('/api/auth/register', {
        email,
        password,
        username: name,
        role,
      });
      // 자동 로그인까지 처리 (백엔드가 register 시 token 반환하는 패턴 가정;
      // 그렇지 않으면 login 페이지로 redirect)
      if (data?.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate(buildForeignPath(lang), { replace: true });
      } else {
        navigate(buildForeignPath(lang, 'login'), { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.detail || t('common:errors.network'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('foreign:signup.title')} — {t('foreign:brand')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <section className={styles.wrap}>
        <h1 className={styles.title}>{t('foreign:signup.title')}</h1>
        <p className={styles.subtitle}>{t('foreign:signup.subtitle')}</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span>{t('foreign:signup.email_label')}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className={styles.field}>
            <span>{t('foreign:signup.password_label')}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} />
          </label>
          <label className={styles.field}>
            <span>{t('foreign:signup.password_confirm_label')}</span>
            <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required autoComplete="new-password" />
          </label>
          <label className={styles.field}>
            <span>{t('foreign:signup.name_label')}</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </label>

          <div className={styles.field}>
            <span>Role</span>
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <label style={{ display: 'flex', gap: 'var(--sp-1)', alignItems: 'center' }}>
                <input type="radio" name="role" value="user" checked={role === 'user'} onChange={(e) => setRole(e.target.value)} />
                <span>{t('foreign:signup.role_seeker')}</span>
              </label>
              <label style={{ display: 'flex', gap: 'var(--sp-1)', alignItems: 'center' }}>
                <input type="radio" name="role" value="employer" checked={role === 'employer'} onChange={(e) => setRole(e.target.value)} />
                <span>{t('foreign:signup.role_employer')}</span>
              </label>
            </div>
          </div>

          <label style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} required />
            <span>{t('foreign:signup.agree_terms')}</span>
          </label>

          {error && <div className={styles.error} role="alert">{error}</div>}
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? '...' : t('common:actions.signup')}
          </button>
        </form>

        <div className={styles.bottom}>
          <span>{t('foreign:signup.have_account')}</span>{' '}
          <Link to={buildForeignPath(lang, 'login')}>{t('foreign:signup.go_login')}</Link>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 10.4: `App.jsx`의 login/signup 라우트 교체**

```jsx
import ForeignLoginPage from "./pages/foreign/ForeignLoginPage";
import ForeignSignupPage from "./pages/foreign/ForeignSignupPage";
// ...
<Route path="login" element={<ForeignLoginPage />} />
<Route path="signup" element={<ForeignSignupPage />} />
```

- [ ] **Step 10.5: build + 개발 서버 점검**

```bash
cd frontend && npm run build && npm run dev
```

브라우저:
- `/foreign/ko/login` — 폼 정상, 잘못된 자격으로 시도 → "이메일 또는 비밀번호가 올바르지 않습니다" 표시
- 올바른 자격으로 로그인 → `/foreign/ko/`로 리다이렉트, TopBar에 username 표시
- `/foreign/en/signup?role=employer` — 영문 폼, role=employer 라디오 자동 선택

(만약 백엔드 register API가 token을 반환하지 않으면 ForeignSignupPage Step 10.3의 분기가 login 페이지로 redirect — 정상 동작.)

- [ ] **Step 10.6: 커밋**

```bash
git add frontend/src/pages/foreign/Foreign{Login,Signup}Page.{jsx,module.css} frontend/src/App.jsx
git commit -m "feat(foreign): T10 — Login/Signup 페이지 (본가 auth API 재사용, i18n 폼)"
```

---

### Task 11: 번역 본격 채움 — KO/EN 전수 + RU 핵심 점검

**Files:**
- Modify: 6 locale JSON files

**목표**: 모든 컴포넌트에서 실제 사용 중인 키가 KO/EN에 빠짐없이 존재. RU는 핵심(메뉴/풋터/랜딩 hero/login/signup)만.

- [ ] **Step 11.1: missing key 추출 — 개발 서버 띄우고 console.warn 수집**

```bash
cd frontend && npm run dev
```

브라우저 개발자 도구를 열고 다음 라우트를 모두 순차 방문:
- `/foreign/ko/` ~ `/foreign/ko/life-guide` 13개
- 언어 토글로 `/foreign/en/` 동일 13개
- `/foreign/ru/` 동일 13개

각 라우트에서 console에 `[i18n] missing key: <키>` 경고가 나오면 모두 메모.

- [ ] **Step 11.2: KO/EN locale에 누락 키 추가**

Step 11.1에서 모은 키 목록을 KO/EN의 적절한 네임스페이스(common 또는 foreign)에 추가. 추가 후 페이지 재방문 → console warning 0건이 되는 것이 목표.

(예시 — 흔히 빠지는 키들: 폼 라벨 부분, role 토글 'Role' 텍스트, 외부 링크 라벨 등. ForeignSignupPage.jsx의 'Role' 하드코딩 영문은 i18n 키 `foreign:signup.role_label`로 빼고 두 locale에 추가.)

- [ ] **Step 11.3: RU 핵심 키 누락 분 보강**

RU 콘솔 warning에서 메뉴/풋터/login/signup/home.hero_* 관련 키만 보강. 나머지(placeholder, home values 등)는 EN fallback에 맡김.

- [ ] **Step 11.4: 'Role' 하드코딩 제거 (10.3에서 남긴 잔여)**

`ForeignSignupPage.jsx`의 `<span>Role</span>`을 i18n 키로 교체:
- foreign.json 양쪽에 `signup.role_label` 키 추가 (KO: "역할" / EN: "Role" / RU: "Роль")
- 컴포넌트: `<span>{t('foreign:signup.role_label')}</span>`

- [ ] **Step 11.5: build + 라우트 13개 console warning 0건 확인**

```bash
cd frontend && npm run build
```

`npm run dev`로 다시 KO/EN/RU 각 핵심 라우트(home/about/login/signup) 진입 → console에 missing key warning이 없는지 확인.

- [ ] **Step 11.6: 커밋**

```bash
git add frontend/src/i18n/locales frontend/src/pages/foreign/ForeignSignupPage.jsx
git commit -m "feat(foreign): T11 — 번역 missing key 보강 + Role 라벨 i18n 분리"
```

---

### Task 12: 본가 진입점 — TopBar 메뉴 + HomeForeignBanner

**Files:**
- Modify: `frontend/src/components/layout/TopBar.jsx` (메뉴 1개 추가, flag 게이트)
- Create: `frontend/src/components/foreign/HomeForeignBanner.jsx` + `.module.css`
- Modify: `frontend/src/pages/HomePage.jsx` (배너 컴포넌트 삽입)

- [ ] **Step 12.1: `TopBar.jsx`에 외국인 메뉴 추가**

`frontend/src/components/layout/TopBar.jsx`의 `NAV_ITEMS` 배열에 마지막 항목 추가 (또는 별도 처리):

```jsx
const NAV_ITEMS = [
  { label: "홈", path: "/" },
  { label: "알바", path: "/jobs" },
  { label: "모바일", path: "/mobile-preview" },
  { label: "회사소개", path: "/about" },
  { label: "서비스", path: "/services" },
  { label: "커뮤니티", path: "/community/notice" },
];

const SHOW_FOREIGN = import.meta.env.VITE_FOREIGN_SUBAPP_VISIBLE === 'true';
```

`NAV_ITEMS.map(...)` 직후 `{isAdmin && ...}` 위에 다음 1줄 추가:

```jsx
{SHOW_FOREIGN && (
  <Link to="/foreign" className={`${styles.navLink} ${isActive("/foreign") ? styles.active : ""}`} onClick={() => setMenuOpen(false)}>
    🌐 외국인 구인
  </Link>
)}
```

- [ ] **Step 12.2: `HomeForeignBanner.jsx` + CSS 생성**

`HomeForeignBanner.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './HomeForeignBanner.module.css';

const DISMISS_KEY = 'foreign_banner_dismissed_v1';
const DISMISS_DAYS = 30;

export default function HomeForeignBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) { setVisible(true); return; }
    const ts = parseInt(dismissed, 10);
    if (Number.isNaN(ts)) { setVisible(true); return; }
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    setVisible(days >= DISMISS_DAYS);
  }, []);

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Link to="/foreign" className={styles.banner}>
      <div className={styles.text}>
        <span className={styles.icon} aria-hidden="true">🌐</span>
        <div className={styles.copy}>
          <div className={styles.title}>외국인을 위한 한국 채용 플랫폼이 열렸습니다</div>
          <div className={styles.subtitle}>Find your next job in Korea — KO · EN · RU</div>
        </div>
      </div>
      <div className={styles.actions}>
        <span className={styles.cta}>둘러보기 →</span>
        <button type="button" className={styles.close} onClick={handleDismiss} aria-label="배너 닫기">×</button>
      </div>
    </Link>
  );
}
```

`HomeForeignBanner.module.css`:

```css
.banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-5);
  margin: var(--sp-4) 0;
  background: linear-gradient(90deg, #1e40af 0%, #14307c 100%);
  color: #fff;
  border-radius: var(--radius-lg);
  text-decoration: none;
  box-shadow: var(--shadow-md);
}
.banner:hover { transform: translateY(-1px); box-shadow: var(--shadow-lg); }

.text { display: flex; align-items: center; gap: var(--sp-3); flex: 1; min-width: 0; }
.icon { font-size: 1.6rem; }
.copy { display: flex; flex-direction: column; gap: 2px; }
.title { font-weight: 600; font-size: 1rem; }
.subtitle { font-size: 0.85rem; opacity: 0.85; }

.actions { display: flex; align-items: center; gap: var(--sp-3); }
.cta {
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
}
.close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: 0;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}
.close:hover { background: rgba(255,255,255,0.25); }

@media (max-width: 767px) {
  .banner { flex-direction: column; align-items: stretch; gap: var(--sp-3); }
  .actions { justify-content: space-between; }
}
```

- [ ] **Step 12.3: `HomePage.jsx`에 배너 삽입 (Hero 직후)**

`frontend/src/pages/HomePage.jsx`에서 Hero 섹션 닫힘 직후 (또는 첫 콘텐츠 섹션 직전) 다음 추가:

```jsx
import HomeForeignBanner from "@/components/foreign/HomeForeignBanner";

// flag check
const SHOW_FOREIGN_BANNER = import.meta.env.VITE_FOREIGN_SUBAPP_VISIBLE === 'true';

// JSX 안에서 Hero 직후
{SHOW_FOREIGN_BANNER && <HomeForeignBanner />}
```

- [ ] **Step 12.4: build + 개발 서버 점검**

`.env.local`에 `VITE_FOREIGN_SUBAPP_VISIBLE=true` 상태에서:
- 본가 `/` 진입 → TopBar에 "🌐 외국인 구인" 메뉴 + Hero 직후 배너 노출
- 메뉴 클릭 → `/foreign` → `/foreign/ko` (또는 브라우저 언어)로 분기
- 배너 X 클릭 → 즉시 숨김, 새로고침 후에도 숨김 유지 (localStorage 확인)
- localStorage `foreign_banner_dismissed_v1` 키 삭제 후 새로고침 → 배너 다시 표시

`.env.local`에서 `VITE_FOREIGN_SUBAPP_VISIBLE=false` 또는 삭제 후 `npm run build && npm run preview`:
- TopBar에 외국인 메뉴 없음, 홈에 배너 없음
- `/foreign/ko` 직접 URL 진입은 여전히 가능 (라우트는 살아있음)

- [ ] **Step 12.5: 커밋**

```bash
git add frontend/src/components/layout/TopBar.jsx frontend/src/components/foreign/HomeForeignBanner.{jsx,module.css} frontend/src/pages/HomePage.jsx
git commit -m "feat(foreign): T12 — 본가 진입점 (TopBar 메뉴 + HomeForeignBanner, flag 게이트)"
```

---

### Task 13: SEO — sitemap + robots + helmet 종합 검증

**Files:**
- Modify or Create: `frontend/public/sitemap.xml`
- Modify or Create: `frontend/public/robots.txt`

- [ ] **Step 13.1: 기존 sitemap/robots 확인**

```bash
ls frontend/public/ | grep -E "sitemap|robots"
```

- [ ] **Step 13.2: `frontend/public/robots.txt` 작성 (없으면 신규)**

기존 있으면 끝에 다음 추가, 없으면 다음 전체:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /foreign/*/me
Disallow: /foreign/*/employer/me
Disallow: /foreign/*/login
Disallow: /foreign/*/signup

Sitemap: https://sodam-jobs.twinverse.org/sitemap.xml
```

- [ ] **Step 13.3: `frontend/public/sitemap.xml` 작성 (없으면 신규, 있으면 sub-app 항목 추가)**

기존 sitemap.xml 있으면 `</urlset>` 직전에 다음 6개 `<url>` 블록 추가. 없으면 다음 전체:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <url>
    <loc>https://sodam-jobs.twinverse.org/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sodam-jobs.twinverse.org/jobs</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sodam-jobs.twinverse.org/about</loc>
    <priority>0.6</priority>
  </url>

  <!-- Foreign sub-app -->
  <url>
    <loc>https://sodam-jobs.twinverse.org/foreign/ko/</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="https://sodam-jobs.twinverse.org/foreign/ko/" />
    <xhtml:link rel="alternate" hreflang="en" href="https://sodam-jobs.twinverse.org/foreign/en/" />
    <xhtml:link rel="alternate" hreflang="ru" href="https://sodam-jobs.twinverse.org/foreign/ru/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://sodam-jobs.twinverse.org/foreign/" />
  </url>
  <url>
    <loc>https://sodam-jobs.twinverse.org/foreign/en/</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sodam-jobs.twinverse.org/foreign/ru/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sodam-jobs.twinverse.org/foreign/ko/about</loc>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://sodam-jobs.twinverse.org/foreign/en/about</loc>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://sodam-jobs.twinverse.org/foreign/ru/about</loc>
    <priority>0.5</priority>
  </url>

</urlset>
```

- [ ] **Step 13.4: build + 정적 자산 점검**

```bash
cd frontend && npm run build && ls dist/
```

Expected: `dist/robots.txt`, `dist/sitemap.xml` 포함.

- [ ] **Step 13.5: helmet 메타 검증 — 14 라우트 순회**

`npm run preview`로 빌드된 정적 자산을 띄우고:
- 브라우저 개발자 도구 Elements 탭의 `<head>` 내부 확인
- 각 라우트가 의도된 `<title>`, `<meta robots>`, `<link hreflang>` 보유 여부 점검
- 특히 placeholder 8개 + login/signup에 `<meta name="robots" content="noindex,...">` 확인

- [ ] **Step 13.6: 커밋**

```bash
git add frontend/public/sitemap.xml frontend/public/robots.txt
git commit -m "feat(foreign): T13 — sitemap.xml sub-app 6 URL + robots.txt Disallow 4건"
```

---

### Task 14: 백엔드 catch-all + Cache-Control + 최종 smoke

**Files:**
- Modify: `backend/main.py` (Cache-Control 미들웨어 + SPA catch-all 확인)

- [ ] **Step 14.1: 현재 SPA catch-all 라우트 확인**

```bash
grep -nE "StaticFiles|FileResponse|catch_all|index.html" backend/main.py | head -20
```

→ catch-all이 어떻게 구현됐는지 확인. 보통 `@app.get("/{full_path:path}")` 또는 `StaticFiles(html=True)` 사용. `/api`, `/uploads`, `/health`를 제외한 모든 경로에 대해 `index.html` 반환해야 함.

- [ ] **Step 14.2: catch-all에서 `/foreign/*` 정상 처리 확인**

로컬에서 백엔드 + 프론트 빌드 결과를 동시에 띄우거나, Docker 이미지를 빌드해 서빙:

```bash
cd frontend && npm run build
cd ../backend && uvicorn main:app --reload --port 8001
```

브라우저 또는 curl로:

```bash
curl -i http://localhost:8001/foreign/ko/ | head -20
curl -i http://localhost:8001/foreign/en/jobs | head -20
curl -i http://localhost:8001/api/jobs | head -10
```

Expected:
- `/foreign/ko/`, `/foreign/en/jobs` → 200 OK + HTML(`<html lang=...>` 시작) — SPA가 받아 React Router가 처리
- `/api/jobs` → 200 JSON 또는 401 — API 응답 (HTML 아님)

만약 `/foreign/*` 에 HTML이 안 돌아오면 catch-all 정규식을 다음과 같이 보정 (백엔드 패턴에 맞춰):

```python
# 예: 라우트 마지막에
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    if full_path.startswith(("api/", "uploads/", "health")):
        raise HTTPException(status_code=404)
    return FileResponse("static/index.html")
```

(현재 main.py가 다른 패턴이면 동등한 효과로 보정.)

- [ ] **Step 14.3: Cache-Control 미들웨어 확인/추가**

```bash
grep -nE "Cache-Control|cache_control" backend/main.py
```

없으면 다음 미들웨어를 `app.add_middleware(CORSMiddleware, ...)` 뒤에 추가:

```python
import re

HASHED_ASSET_RE = re.compile(r"/assets/.+-[0-9a-fA-F]{8,}\..+")

@app.middleware("http")
async def cache_control_middleware(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if HASHED_ASSET_RE.search(path):
        # Vite 빌드 산출물 (해시 자산) — 1년 immutable
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif path.startswith(("/api/", "/uploads/", "/health")):
        # 동적 API/리소스 — 캐시 금지
        response.headers["Cache-Control"] = "no-store"
    else:
        # HTML / 정적 (index.html, sitemap, robots, /public/*)
        response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
    return response
```

- [ ] **Step 14.4: Cache-Control 헤더 확인**

```bash
curl -I http://localhost:8001/foreign/ko/
curl -I http://localhost:8001/sitemap.xml
curl -I http://localhost:8001/robots.txt
```

Expected:
- HTML 라우트 → `Cache-Control: public, max-age=0, must-revalidate`
- sitemap/robots → 동일 (정적이지만 자주 갱신 가능)
- (Vite 빌드 자산 — `dist/assets/index-xxxxxx.js` — 은 정적 파일 서빙 라우트가 별도이면 미들웨어가 잡지 못할 수 있음. 그 경우 fastapi의 `StaticFiles`에 `max_age=31536000` 헤더 사후 처리 또는 nginx/Orbitron 단에서 처리)

- [ ] **Step 14.5: 최종 smoke — 14 라우트 + 회귀**

`npm run build && npm run preview` 또는 Docker 빌드 후, 다음 라우트 14개를 브라우저에서 순서대로 진입하고 콘솔/UI 점검:

```
/foreign                            → /foreign/ko 리다이렉트
/foreign/ko/                        → ForeignHomePage 6 섹션
/foreign/ko/about                   → ForeignAboutPage 3 섹션
/foreign/ko/login                   → 폼
/foreign/ko/signup                  → 폼
/foreign/ko/jobs                    → ComingSoonCard
/foreign/ko/employer                → ComingSoonCard
/foreign/ko/me                      → ComingSoonCard
/foreign/ko/matching                → ComingSoonCard
/foreign/ko/news                    → ComingSoonCard
/foreign/ko/visa-guide              → ComingSoonCard
/foreign/ko/life-guide              → ComingSoonCard
/foreign/ko/존재안함                → ForeignNotFound
/foreign/xx/jobs                    → /foreign/ko/jobs 리다이렉트
```

언어 토글로 `/foreign/en/...`, `/foreign/ru/...` 도 동일하게 14개 진입 점검.

**회귀 점검 (본가)**:

```
/                                   → 홈 정상 (배너 ON 시 노출)
/jobs                               → 채용공고 정상
/about, /services                   → 정상
/community/notice                   → 정상
/login                              → 정상
/admin (admin 계정으로)             → 정상
```

- [ ] **Step 14.6: Lighthouse**

Chrome 개발자 도구 Lighthouse 탭에서 `/foreign/ko/`와 `/`를 각각 측정. 점수 85+ 유지 확인 (Performance / Accessibility / Best Practices / SEO).

- [ ] **Step 14.7: 커밋**

```bash
git add backend/main.py
git commit -m "feat(foreign): T14 — SPA catch-all 검증 + Cache-Control 미들웨어 (CLAUDE.md 전역 규칙)"
```

- [ ] **Step 14.8: F1 종료 — work-log + dev-plan 갱신**

`docs/work-log.md` 상단에 새 섹션 추가:

```markdown
## 2026-06-05 — F1 (foreign-shell) 완료

### 작업 요약
- M-Mobile 완료 후 F-시리즈 첫 cycle 진행
- /foreign/:lang/* 14 라우트 (4 완성 + 8 placeholder + NotFound + entry redirect + lang gate)
- react-i18next + KO/EN 전수 + RU 핵심 번역
- 본가 진입점 (TopBar 메뉴 + HomeForeignBanner, VITE_FOREIGN_SUBAPP_VISIBLE 게이트)
- 백엔드 Cache-Control 미들웨어 추가

### 다음 cycle (F2 foreign-jobs)
- ForeignJob 모델 + CRUD
- 비자/한국어/언어 필드
- 리스트/상세/등록/필터 페이지
- placeholder를 진짜 컴포넌트로 교체
```

`docs/dev-plan.md`도 F1 체크 + F2 next 갱신.

```bash
git add docs/work-log.md docs/dev-plan.md
git commit -m "docs: F1 (foreign-shell) 완료 기록 + F2 인계"
```

- [ ] **Step 14.9: PR 또는 main 머지**

worktree에서 작업했으면 PR 생성, main 직접 작업했으면 push:

```bash
git push origin main  # 또는 git push -u origin foreign-f1 + gh pr create
```

Orbitron이 자동 배포. 운영(`https://sodam-jobs.twinverse.org`)에서 `/foreign/ko/` 진입 확인.

**(주의)**: Orbitron 환경변수 패널에 `VITE_FOREIGN_SUBAPP_VISIBLE=false` (기본) 유지. F2 완료 후 사용자가 직접 `true`로 전환 평가.

---

## Self-Review (자체 검토 — 이 plan 작성 후 spec과 대조)

**Spec coverage** — spec 1–8 섹션 매핑:

| Spec 섹션 | 해당 task |
|----------|---------|
| §1 라우트 트리 | T5, T6, T7, T8, T9, T10 |
| §2 i18n 셋업 | T2, T11 |
| §3 셸 컴포넌트 | T6, T7 |
| §4 시각 정체성 | T1 (fonts), T4 |
| §5 페이지 콘텐츠 | T7, T8, T9, T10 |
| §6 진입점 | T12 |
| §7 빌드/배포 | T1, T13, T14 |
| §8 done/위험 | T11(missing key), T14(smoke + 회귀 + Lighthouse) |
| §9 합의된 기본값 | T1 (env 명명), T9 (운영주체) |

**누락 점검**: ForeignLayout 안의 `max-w-1200px` (§3.1)은 T6.1 CSS에 반영됨 ✅. Cache-Control middleware (§7.5, §8.3)은 T14.3에 반영됨 ✅. `<link hreflang>` 정적 sitemap (§7.7)은 T13.3에 반영됨 ✅.

**Type consistency**: 모든 task에서 헬퍼명 `buildForeignPath`, `detectInitialLang`, 컴포넌트명 `Foreign*`, 라우트 prefix `/foreign/:lang/*` 일관.

**Placeholder 검사**: TBD/TODO/"적절한 에러 처리" 등 부정확 표현 없음 ✅.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-11-foreign-subapp-f1.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, two-stage review (spec compliance → code quality) between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
