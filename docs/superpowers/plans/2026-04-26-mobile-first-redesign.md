# M-Mobile (Mobile-First 재설계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert SodamJobs from desktop-styled UI to mobile-first shell — 440px max content width with BottomNav + per-page sticky `PageHeader` + center FAB for employer/admin + desktop side panels — and add basic PWA + ProfilePage + ChatPlaceholder + 셈하나 cross-promo.

**Architecture:** New `MobileShell` layout component replaces `MainLayout`. Global `TopBar` is deleted; each page renders its own sticky `PageHeader`. New `BottomNav` shows 4 tabs to all + a center FAB to employer/admin only. Desktop (≥1024px) adds side panels alongside the centered phone column. PWA: `manifest.json` + icons (no service worker this cycle).

**Tech Stack:** React 19 · react-router-dom 7 · CSS Modules (no library). FastAPI backend (PUT `/api/auth/me`, POST `/api/auth/me/password`). PWA: `manifest.json` + `apple-touch-icon`.

**Spec:** [docs/superpowers/specs/2026-04-26-mobile-first-redesign-design.md](../specs/2026-04-26-mobile-first-redesign-design.md)

**Test strategy:** No automated test framework (per project convention from M4a). Each task ends with a manual smoke check (build + curl/devtools probe) before commit. Visual smoke via running `npm run dev` and checking 390×844 mobile + 1440×900 desktop in Chrome devtools.

---

## Phase 1 — Layout infrastructure

### Task 1: External-links module + SemhanaLink component

**Files:**
- Create: `frontend/src/lib/externalLinks.js`
- Create: `frontend/src/components/layout/SemhanaLink.jsx`
- Create: `frontend/src/components/layout/SemhanaLink.module.css`

- [ ] **Step 1: Create constants module**

`frontend/src/lib/externalLinks.js`:

```javascript
// External services SodamJobs links to. Centralized so domain changes are one-file edits.
export const SEMHANA_URL = "https://sodamfn.twinverse.org";
export const TWINVERSE_URL = "https://twinverse.org";
```

- [ ] **Step 2: Create SemhanaLink component**

`frontend/src/components/layout/SemhanaLink.jsx`:

```jsx
import { SEMHANA_URL } from "../../lib/externalLinks";
import styles from "./SemhanaLink.module.css";

/**
 * Cross-promo link to 셈하나 (SodamFN). Three render variants:
 * - variant="card": full card for ProfilePage (employer)
 * - variant="hint": small inline hint for empty states (MyJobsPage)
 * - variant="footer": tiny sister-link for Footer
 */
export default function SemhanaLink({ variant = "card" }) {
  const href = SEMHANA_URL;
  const common = { href, target: "_blank", rel: "noopener noreferrer" };

  if (variant === "footer") {
    return (
      <a {...common} className={styles.footer}>
        셈하나
      </a>
    );
  }

  if (variant === "hint") {
    return (
      <p className={styles.hint}>
        💡 매장 운영도 함께 시작하시려면 <a {...common} className={styles.hintLink}>셈하나</a>
      </p>
    );
  }

  // card (default)
  return (
    <a {...common} className={styles.card}>
      <div className={styles.cardIcon}>🍙</div>
      <div className={styles.cardBody}>
        <strong className={styles.cardTitle}>셈하나</strong>
        <p className={styles.cardDesc}>매출 · 직원 · 재고를 한 곳에서</p>
      </div>
      <span className={styles.cardCta}>매장 관리 시작 →</span>
    </a>
  );
}
```

- [ ] **Step 3: Styles**

`frontend/src/components/layout/SemhanaLink.module.css`:

```css
/* card variant — used in ProfilePage */
.card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: linear-gradient(135deg, #2540a8 0%, #1b2f7c 100%);
  color: #fff;
  border-radius: var(--radius-lg);
  text-decoration: none;
  box-shadow: 0 4px 16px rgba(37, 64, 168, 0.2);
  transition: transform 0.15s ease;
}
.card:hover { transform: translateY(-1px); color: #fff; }

.cardIcon { font-size: 2rem; flex-shrink: 0; }

.cardBody { flex: 1; min-width: 0; }
.cardTitle {
  display: block;
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 2px;
}
.cardDesc {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
}

.cardCta {
  font-size: 0.85rem;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.95);
}

/* hint variant — empty state inline hint */
.hint {
  margin-top: var(--sp-4);
  padding-top: var(--sp-3);
  border-top: 1px dashed var(--color-line);
  font-size: 0.85rem;
  color: var(--color-ink-mute);
  text-align: center;
}
.hintLink {
  color: var(--color-accent);
  font-weight: 600;
  text-decoration: underline;
}

/* footer variant — sister link in global footer */
.footer {
  color: var(--color-ink-mute);
  font-size: 0.8rem;
  text-decoration: underline;
}
.footer:hover { color: var(--color-ink); }
```

- [ ] **Step 4: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build (component is unrouted; tree-shaken).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/externalLinks.js frontend/src/components/layout/SemhanaLink.jsx frontend/src/components/layout/SemhanaLink.module.css
git commit -m "feat(m-mobile): add externalLinks module and SemhanaLink component (3 variants)"
```

---

### Task 2: PageHeader component

**Files:**
- Create: `frontend/src/components/layout/PageHeader.jsx`
- Create: `frontend/src/components/layout/PageHeader.module.css`

- [ ] **Step 1: Component**

`frontend/src/components/layout/PageHeader.jsx`:

```jsx
import { useNavigate } from "react-router-dom";
import styles from "./PageHeader.module.css";

/**
 * Sticky per-page header. 56px tall, sits at top of phone column.
 * Props:
 *   title:    string | ReactNode (required, can include interactive elements like 동네 셀렉터)
 *   subtitle: optional secondary line (e.g., 거리 / 시간)
 *   back:     true to render ← back button (router.back())
 *   actions:  optional ReactNode array rendered on the right (icon buttons)
 */
export default function PageHeader({ title, subtitle, back = false, actions = [] }) {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      {back ? (
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <span className={styles.spacer} aria-hidden="true" />
      )}

      <div className={styles.titleBlock}>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>

      <div className={styles.actions}>
        {actions.map((action, i) => (
          <span key={i} className={styles.actionSlot}>{action}</span>
        ))}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/components/layout/PageHeader.module.css`:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 var(--sp-3);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-line-soft);
  gap: var(--sp-2);
}

.backBtn, .spacer {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}
.backBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-ink);
  background: transparent;
}
.backBtn:hover { background: var(--color-surface-elev); }

.titleBlock {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.subtitle {
  font-size: 0.75rem;
  color: var(--color-ink-mute);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.actionSlot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.actionSlot button,
.actionSlot a {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-ink);
  background: transparent;
}
.actionSlot button:hover,
.actionSlot a:hover { background: var(--color-surface-elev); }
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/PageHeader.jsx frontend/src/components/layout/PageHeader.module.css
git commit -m "feat(m-mobile): add PageHeader sticky mini-header component"
```

---

### Task 3: BottomNav with conditional FAB

**Files:**
- Create: `frontend/src/components/layout/BottomNav.jsx`
- Create: `frontend/src/components/layout/BottomNav.module.css`

- [ ] **Step 1: Component**

`frontend/src/components/layout/BottomNav.jsx`:

```jsx
import { Link, useLocation } from "react-router-dom";
import styles from "./BottomNav.module.css";

const TABS = [
  { key: "home",    label: "홈",     path: "/",        match: (p) => p === "/" },
  { key: "jobs",    label: "알바",   path: "/jobs",    match: (p) => p.startsWith("/jobs") || p.startsWith("/my/jobs") },
  { key: "chat",    label: "채팅",   path: "/chat",    match: (p) => p.startsWith("/chat"), disabled: true },
  { key: "profile", label: "내정보", path: "/profile", match: (p) => p.startsWith("/profile") },
];

const CAN_POST_ROLES = new Set(["employer", "admin", "superadmin"]);

function HomeIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-7H10v7H5a1 1 0 01-1-1v-9z" strokeLinejoin="round" />
    </svg>
  );
}
function BriefcaseIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" strokeLinejoin="round" />
    </svg>
  );
}
function ChatIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12a8 8 0 01-8 8H8l-5 3v-3a8 8 0 010-16h2a8 8 0 0116 0z" strokeLinejoin="round" />
    </svg>
  );
}
function UserIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = {
  home:    HomeIcon,
  jobs:    BriefcaseIcon,
  chat:    ChatIcon,
  profile: UserIcon,
};

export default function BottomNav() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const canPost = user && CAN_POST_ROLES.has(user.role);

  // Insert FAB visually between jobs (idx 1) and chat (idx 2) when canPost.
  // We render 4 nav slots always (균등 4탭), and overlay the FAB absolutely between #2 and #3.
  return (
    <nav className={styles.nav} aria-label="기본 네비게이션">
      <ul className={styles.tabs}>
        {TABS.map((tab) => {
          const Icon = ICONS[tab.key];
          const active = tab.match(location.pathname);
          return (
            <li key={tab.key} className={styles.tabItem}>
              <Link
                to={tab.path}
                className={`${styles.tab} ${active ? styles.tabActive : ""} ${tab.disabled ? styles.tabDisabled : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon active={active} />
                <span className={styles.tabLabel}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {canPost && (
        <Link to="/jobs/new" className={styles.fab} aria-label="구인 등록">
          <PlusIcon />
        </Link>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/components/layout/BottomNav.module.css`:

```css
.nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-line-soft);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 60;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  list-style: none;
  margin: 0;
  padding: 0;
  height: 64px;
}

.tabItem {
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--color-ink-mute);
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 500;
  transition: color 0.12s ease;
}
.tab:hover { color: var(--color-ink); }
.tabActive {
  color: var(--color-accent-ink);
}
.tabDisabled {
  opacity: 0.45;
  pointer-events: auto;  /* allow click-to-placeholder navigation, just visually muted */
}

.tabLabel {
  font-size: 0.7rem;
  line-height: 1;
}

/* FAB sits between tab #2 (jobs) and #3 (chat) — i.e., centered on the column */
.fab {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(208, 74, 42, 0.4);
  text-decoration: none;
  transition: transform 0.15s ease, background 0.15s ease;
}
.fab:hover {
  background: var(--color-accent-ink);
  color: #fff;
  transform: translateX(-50%) translateY(-2px);
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/BottomNav.jsx frontend/src/components/layout/BottomNav.module.css
git commit -m "feat(m-mobile): add BottomNav 4-tab + employer FAB component"
```

---

### Task 4: DesktopSidePanel components

**Files:**
- Create: `frontend/src/components/layout/DesktopSidePanel.jsx`
- Create: `frontend/src/components/layout/DesktopSidePanel.module.css`

- [ ] **Step 1: Component**

`frontend/src/components/layout/DesktopSidePanel.jsx`:

```jsx
import SemhanaLink from "./SemhanaLink";
import styles from "./DesktopSidePanel.module.css";

/**
 * Side panels visible only at desktop widths (≥1024px). Hidden below.
 * Two variants:
 *   side="left"  → brand block + project pitch
 *   side="right" → "open on phone" QR + 셈하나 sister card + footer-style helper text
 */
export function DesktopSideLeft() {
  return (
    <aside className={`${styles.side} ${styles.left}`} aria-hidden="false">
      <div className={styles.brand}>
        <h2 className={styles.brandTitle}>SodamJobs</h2>
        <p className={styles.brandTag}>동네 단기 알바 직거래</p>
      </div>

      <ul className={styles.pitchList}>
        <li><strong>📍 가까운 알바</strong><br />위치 기반 거리 정렬</li>
        <li><strong>🛡️ 안심 사업장</strong><br />SodamFN 검증 배지</li>
        <li><strong>💬 3줄 자기소개</strong><br />복잡한 이력서 없이 바로 매칭</li>
      </ul>
    </aside>
  );
}

export function DesktopSideRight() {
  // Encode the current page URL into a QR via api.qrserver.com (no extra dep).
  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://sodam-jobs.twinverse.org/";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`;

  return (
    <aside className={`${styles.side} ${styles.right}`} aria-hidden="false">
      <div className={styles.qrCard}>
        <h3 className={styles.qrTitle}>📱 폰에서 열기</h3>
        <p className={styles.qrDesc}>지금 보는 페이지를 휴대폰에서 그대로</p>
        <img src={qrSrc} alt="현재 페이지 QR 코드" className={styles.qrImg} loading="lazy" />
      </div>

      <div className={styles.semhanaWrap}>
        <p className={styles.semhanaCaption}>함께 보는 서비스</p>
        <SemhanaLink variant="card" />
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Styles**

`frontend/src/components/layout/DesktopSidePanel.module.css`:

```css
.side {
  display: none;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-7) var(--sp-5);
  width: 280px;
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .side { display: flex; }
}

.left {
  align-items: flex-start;
}
.right {
  align-items: stretch;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--color-line);
  width: 100%;
}
.brandTitle {
  font-family: var(--font-display);
  font-size: 1.6rem;
  letter-spacing: -0.02em;
  margin: 0;
}
.brandTag {
  margin: 0;
  color: var(--color-ink-mute);
  font-size: 0.9rem;
}

.pitchList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  font-size: 0.875rem;
  color: var(--color-ink-soft);
  line-height: 1.55;
}
.pitchList strong {
  display: block;
  color: var(--color-ink);
  margin-bottom: 2px;
}

.qrCard {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: var(--sp-4);
  text-align: center;
}
.qrTitle {
  font-size: 0.95rem;
  margin: 0 0 4px;
}
.qrDesc {
  margin: 0 0 var(--sp-3);
  font-size: 0.8rem;
  color: var(--color-ink-mute);
}
.qrImg {
  width: 180px;
  height: 180px;
  margin: 0 auto;
  display: block;
  background: #fff;
  border-radius: var(--radius-md);
}

.semhanaWrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.semhanaCaption {
  font-size: 0.75rem;
  color: var(--color-ink-mute);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/DesktopSidePanel.jsx frontend/src/components/layout/DesktopSidePanel.module.css
git commit -m "feat(m-mobile): add DesktopSideLeft/Right panels (brand + QR + 셈하나)"
```

---

### Task 5: Footer rewrite (mobile compact + 셈하나 sister-link)

**Files:**
- Modify: `frontend/src/components/layout/Footer.jsx`
- Modify: `frontend/src/components/layout/Footer.module.css`

- [ ] **Step 1: Replace Footer.jsx entirely**

`frontend/src/components/layout/Footer.jsx`:

```jsx
import SemhanaLink from "./SemhanaLink";
import { TWINVERSE_URL } from "../../lib/externalLinks";
import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <span className={styles.brand}>SodamJobs</span>
      <span className={styles.dot}>·</span>
      <span className={styles.byline}>
        made by <a href={TWINVERSE_URL} target="_blank" rel="noopener noreferrer">Twinverse</a>
      </span>
      <span className={styles.dot}>·</span>
      <span className={styles.sister}>
        함께 보기: <SemhanaLink variant="footer" />
      </span>
      <span className={styles.copy}>© {year}</span>
    </footer>
  );
}
```

- [ ] **Step 2: Replace Footer.module.css entirely**

`frontend/src/components/layout/Footer.module.css`:

```css
.footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px var(--sp-2);
  padding: var(--sp-4) var(--sp-3);
  font-size: 0.75rem;
  color: var(--color-ink-mute);
  border-top: 1px solid var(--color-line-soft);
}

.brand {
  font-weight: 600;
  color: var(--color-ink-soft);
}

.dot { color: var(--color-line); }

.byline a {
  color: inherit;
  text-decoration: underline;
}

.sister {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.copy {
  flex-basis: 100%;
  text-align: center;
  margin-top: 2px;
  font-size: 0.7rem;
}

@media (min-width: 480px) {
  .copy {
    flex-basis: auto;
    margin-top: 0;
  }
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Footer.jsx frontend/src/components/layout/Footer.module.css
git commit -m "feat(m-mobile): rewrite Footer compact w/ Twinverse + 셈하나 sister-link"
```

---

### Task 6: MobileShell layout + delete TopBar + wire App.jsx

**Files:**
- Create: `frontend/src/components/layout/MobileShell.jsx`
- Create: `frontend/src/components/layout/MobileShell.module.css`
- Delete: `frontend/src/components/layout/TopBar.jsx`
- Delete: `frontend/src/components/layout/TopBar.module.css`
- Modify: `frontend/src/components/layout/MainLayout.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Write MobileShell**

`frontend/src/components/layout/MobileShell.jsx`:

```jsx
import { Outlet, useLocation } from "react-router-dom";
import { DesktopSideLeft, DesktopSideRight } from "./DesktopSidePanel";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import styles from "./MobileShell.module.css";

/**
 * Mobile-first 3-column layout:
 *   [DesktopSideLeft]   [phone column 440px]   [DesktopSideRight]
 * Phone column has the routed page content + Footer + reserved bottom-padding for BottomNav.
 * Side panels are hidden below 1024px.
 *
 * BottomNav is fixed at bottom of viewport (max-w 440 centered).
 */
export default function MobileShell() {
  const location = useLocation();

  // Whether the current route is a placeholder/full-bleed page that hides BottomNav
  // (e.g., login). Hide on /login so the auth form takes the entire viewport.
  const hideBottomNav = location.pathname === "/login";

  return (
    <div className={styles.shell}>
      <DesktopSideLeft />

      <main className={`${styles.column} ${hideBottomNav ? styles.columnFullBleed : ""}`}>
        <Outlet />
        <Footer />
      </main>

      <DesktopSideRight />

      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
```

- [ ] **Step 2: MobileShell styles**

`frontend/src/components/layout/MobileShell.module.css`:

```css
.shell {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: var(--sp-5);
  min-height: 100vh;
  background: var(--color-bg);
  padding: 0 var(--sp-3);
}

.column {
  width: 100%;
  max-width: 440px;
  min-height: 100vh;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  /* reserve space below content for fixed BottomNav (64px) + safe-area + Footer (~56px).
     Footer is rendered inside the column, so we only need to reserve BottomNav + safe-area. */
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
  box-shadow: 0 0 24px rgba(20, 17, 15, 0.04);
}

.columnFullBleed {
  /* Full-bleed pages (login) do not show BottomNav, so no reservation needed. */
  padding-bottom: 0;
}

@media (min-width: 1024px) {
  .shell {
    padding: var(--sp-6) var(--sp-5);
  }
  .column {
    min-height: calc(100vh - 2 * var(--sp-6));
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
}
```

- [ ] **Step 3: Delete TopBar files**

```bash
rm frontend/src/components/layout/TopBar.jsx frontend/src/components/layout/TopBar.module.css
```

- [ ] **Step 4: Replace MainLayout.jsx**

`frontend/src/components/layout/MainLayout.jsx` — final content:

```jsx
// Backwards-compatible re-export so existing imports keep working.
// New code should import MobileShell directly.
export { default } from "./MobileShell";
```

Also clear the now-unused module CSS:

`frontend/src/components/layout/MainLayout.module.css` — final content:

```css
/* MainLayout was replaced by MobileShell — see MobileShell.module.css. */
```

- [ ] **Step 5: Update App.jsx — replace MainLayout usage and add new routes**

Read the current `frontend/src/App.jsx`. Make these changes:

1. Change the import:
   ```jsx
   import MainLayout from "./components/layout/MainLayout";
   ```
   to:
   ```jsx
   import MobileShell from "./components/layout/MobileShell";
   ```

2. Change the wrapping route element from `<MainLayout />` to `<MobileShell />`.

3. Add two new public routes inside the wrapper, after `/login`:
   ```jsx
   <Route path="/profile" element={<ProtectedRoute requiredRole="user"><ProfilePage /></ProtectedRoute>} />
   <Route path="/chat" element={<ChatPlaceholderPage />} />
   ```

4. Add the imports near the other page imports:
   ```jsx
   import ProfilePage from "./pages/ProfilePage";
   import ChatPlaceholderPage from "./pages/ChatPlaceholderPage";
   ```

The `/profile` route uses `requiredRole="user"` which (per ProtectedRoute role hierarchy from M4a) means all logged-in users (user/employer/admin/superadmin) can access — guests are bounced to `/login`.

`/chat` is public so guests can hit the placeholder and see the "준비 중" message.

After this edit, the imports section near top of App.jsx should look like (existing + 2 new):

```jsx
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ServicesPage from "./pages/ServicesPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import ChatPlaceholderPage from "./pages/ChatPlaceholderPage";
import BoardPage from "./pages/community/BoardPage";
import PostPage from "./pages/community/PostPage";
// ... admin/jobs/preview imports unchanged
```

The Public routes block should become:
```jsx
{/* Public */}
<Route path="/" element={<HomePage />} />
<Route path="/about" element={<AboutPage />} />
<Route path="/services" element={<ServicesPage />} />
<Route path="/login" element={<LoginPage />} />
<Route path="/profile" element={<ProtectedRoute requiredRole="user"><ProfilePage /></ProtectedRoute>} />
<Route path="/chat" element={<ChatPlaceholderPage />} />
<Route path="/mobile-preview" element={<MobilePreviewPage />} />
```

Note: `ProfilePage` and `ChatPlaceholderPage` will be created in Tasks 18-19. For now App.jsx will fail to compile until those files exist. Workaround for Task 6: create stub files first.

- [ ] **Step 6: Create stub pages so App.jsx compiles**

`frontend/src/pages/ProfilePage.jsx`:

```jsx
export default function ProfilePage() {
  return <div style={{ padding: 16 }}>프로필 (구현 대기)</div>;
}
```

`frontend/src/pages/ChatPlaceholderPage.jsx`:

```jsx
export default function ChatPlaceholderPage() {
  return <div style={{ padding: 16 }}>채팅 (M6 준비 중)</div>;
}
```

These will be properly implemented in Tasks 18-19.

- [ ] **Step 7: Smoke build + visual check**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

Optional visual check via dev server:
```bash
cd frontend && npm run dev
```
Open `http://localhost:5174/` (or 5173, whichever Vite picks). Resize Chrome DevTools to 390x844 — verify BottomNav at bottom, no TopBar. Resize to 1440x900 — verify 3-column layout with side panels visible.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/layout/MobileShell.jsx frontend/src/components/layout/MobileShell.module.css
git add frontend/src/components/layout/MainLayout.jsx frontend/src/components/layout/MainLayout.module.css
git add frontend/src/App.jsx
git add frontend/src/pages/ProfilePage.jsx frontend/src/pages/ChatPlaceholderPage.jsx
git rm frontend/src/components/layout/TopBar.jsx frontend/src/components/layout/TopBar.module.css
git commit -m "feat(m-mobile): MobileShell layout, delete TopBar, wire /profile + /chat routes (stubs)"
```

---

## Phase 2 — PWA basic

### Task 7: PWA manifest + icons + index.html meta

**Files:**
- Create: `frontend/public/manifest.json`
- Create: `frontend/public/icons/icon-192.png`
- Create: `frontend/public/icons/icon-512.png`
- Create: `frontend/public/icons/icon-maskable-512.png`
- Modify: `frontend/index.html`

- [ ] **Step 1: Generate placeholder icons**

Use Python (PIL/Pillow) to generate three PNG icons with brand color background and "S" text. Run from project root:

```bash
python -c "
from PIL import Image, ImageDraw, ImageFont
import os
os.makedirs('frontend/public/icons', exist_ok=True)

def make(size, path, maskable=False):
    bg = (208, 74, 42)  # #d04a2a
    img = Image.new('RGBA', (size, size), bg + (255,))
    draw = ImageDraw.Draw(img)
    # rounded corners visual feel for non-maskable: draw filled rect with brand color (already filled)
    text = 'S'
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', int(size * (0.55 if not maskable else 0.4)))
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text(((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1]), text, fill=(255, 255, 255, 255), font=font)
    img.save(path, 'PNG')
    print('wrote', path, size)

make(192, 'frontend/public/icons/icon-192.png')
make(512, 'frontend/public/icons/icon-512.png')
make(512, 'frontend/public/icons/icon-maskable-512.png', maskable=True)
"
```

Expected: three PNG files written. Designer-quality icons can replace these later — file paths/sizes are stable.

If Pillow isn't installed: `pip install Pillow` first.

- [ ] **Step 2: Create manifest.json**

`frontend/public/manifest.json`:

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
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 3: Update index.html head**

In `frontend/index.html`, add the following inside `<head>`, just after the existing favicon link:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#d04a2a" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="SodamJobs" />
```

- [ ] **Step 4: Smoke verify**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build, dist contains `manifest.json` + `icons/*.png`.

```bash
ls -la frontend/dist/manifest.json frontend/dist/icons/
```

Expected: 4 files exist (manifest + 3 icons).

Run dev server and open `http://localhost:5174/` in Chrome → DevTools → Application → Manifest tab. Should show "SodamJobs" with theme color and 3 icons. Lighthouse PWA audit should pass "Web app manifest meets the installability requirements".

- [ ] **Step 5: Commit**

```bash
git add frontend/public/manifest.json frontend/public/icons/ frontend/index.html
git commit -m "feat(m-mobile): PWA basic — manifest.json + 192/512/maskable icons + apple-touch-icon meta"
```

---

## Phase 3 — Backend `/me` endpoints

### Task 8: PUT /api/auth/me + POST /api/auth/me/password

**Files:**
- Modify: `backend/routers/auth.py`

- [ ] **Step 1: Add ProfileUpdate + PasswordChange models and routes**

Append the following to `backend/routers/auth.py` after the existing `get_me` endpoint:

```python
from datetime import datetime


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    phone: Optional[str] = None
    neighborhood: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.put("/me")
def update_me(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Self-service profile update for nickname/phone/neighborhood.
    username/email/role/password are NOT changed by this endpoint."""
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(user, key, value)
    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    session.refresh(user)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "nickname": user.nickname,
        "phone": user.phone,
        "neighborhood": user.neighborhood,
    }


@router.post("/me/password")
def change_password(
    body: PasswordChange,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Self-service password change. Requires current password."""
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(body.new_password)
    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    return {"status": "updated"}
```

Also extend `get_me` to return the new fields. Replace its body:

```python
@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "nickname": user.nickname,
        "phone": user.phone,
        "neighborhood": user.neighborhood,
    }
```

Add `Optional` to the typing import line if not already present:

```python
from typing import Literal, Optional
```

- [ ] **Step 2: Smoke check (live)**

Start the backend if not running. Find a free port (8001 is usually OK; 8000 is OpenClaw):

```bash
cd backend && uvicorn main:app --host 127.0.0.1 --port 8001 --log-level warning &
UVI=$!
sleep 5

# Login as alba_test (user) — created earlier, password pw12345
TOKEN=$(curl -s -X POST http://127.0.0.1:8001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alba_test","password":"pw12345"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# GET /me (should include new fields, all null)
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8001/api/auth/me | python -m json.tool

# PUT /me (set nickname + neighborhood)
curl -s -X PUT http://127.0.0.1:8001/api/auth/me \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nickname":"알바테스트","neighborhood":"강남구 역삼동"}' | python -m json.tool

# POST /me/password (wrong current → 400)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8001/api/auth/me/password \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"current_password":"WRONG","new_password":"newpw123"}'

# POST /me/password (correct current → 200)
curl -s -X POST http://127.0.0.1:8001/api/auth/me/password \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"current_password":"pw12345","new_password":"newpw123"}'
echo

# Reset password back so subsequent test runs work
curl -s -X POST http://127.0.0.1:8001/api/auth/me/password \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"current_password":"newpw123","new_password":"pw12345"}'
echo

kill $UVI 2>/dev/null
wait 2>/dev/null
```

Expected:
- `GET /me` returns object with `nickname/phone/neighborhood` (initially null, then "알바테스트"/null/"강남구 역삼동" after PUT).
- `PUT /me` returns updated object.
- Wrong password → HTTP 400.
- Correct password change → `{"status":"updated"}`.

- [ ] **Step 3: Commit**

```bash
git add backend/routers/auth.py
git commit -m "feat(m-mobile): add PUT /api/auth/me and POST /api/auth/me/password"
```

---

## Phase 4 — Marketing & auth pages mobile redesign

### Task 9: HomePage mobile

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx`
- Modify: `frontend/src/pages/HomePage.module.css`

- [ ] **Step 1: Replace HomePage.jsx entirely**

`frontend/src/pages/HomePage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import JobCard from "../components/jobs/JobCard";
import { getSavedLocation } from "../components/jobs/LocationPicker";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const [notices, setNotices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [hasLocation] = useState(() => Boolean(getSavedLocation()));
  const [neighborhoodLabel] = useState(() => {
    const loc = getSavedLocation();
    return loc?.neighborhood || (loc ? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}` : "내 위치 설정 필요");
  });

  useEffect(() => {
    api.get("/api/boards/notice?size=3").then((r) => setNotices(r.data.items)).catch(() => {});
    const loc = getSavedLocation();
    const params = new URLSearchParams({ size: "3" });
    if (loc) {
      params.set("lat", loc.lat);
      params.set("lng", loc.lng);
      params.set("radius_km", "5");
    }
    api.get(`/api/jobs?${params.toString()}`).then((r) => setJobs(r.data.items)).catch(() => {});
  }, []);

  return (
    <div className={styles.home}>
      <PageHeader
        title={
          <Link to="/jobs" className={styles.locTrigger}>
            📍 {neighborhoodLabel} <span className={styles.locArrow}>▾</span>
          </Link>
        }
        actions={[
          <Link to="/jobs" aria-label="알바 검색" key="search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </Link>,
        ]}
      />

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>SodamJobs</h1>
        <p className={styles.heroSub}>동네 알바, 가까운 곳부터</p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{hasLocation ? "내 동네 알바" : "최신 알바"}</h2>
          <Link to="/jobs" className={styles.moreLink}>더보기 →</Link>
        </div>
        {jobs.length > 0 ? (
          <div className={styles.cardCol}>
            {jobs.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        ) : (
          <p className={styles.empty}>
            {hasLocation
              ? "주변에 등록된 알바가 없습니다."
              : <><Link to="/jobs">내 위치를 설정</Link>하면 가까운 알바를 보여드립니다.</>}
          </p>
        )}
      </section>

      {notices.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>공지사항</h2>
            <Link to="/community/notice" className={styles.moreLink}>더보기 →</Link>
          </div>
          <ul className={styles.noticeList}>
            {notices.map((n) => (
              <li key={n.id}>
                <Link to={`/community/notice/${n.id}`} className={styles.noticeItem}>
                  <span className={styles.noticeTitle}>{n.title}</span>
                  <span className={styles.noticeDate}>{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace HomePage.module.css entirely**

`frontend/src/pages/HomePage.module.css`:

```css
.home {
  display: flex;
  flex-direction: column;
}

.locTrigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-ink);
  text-decoration: none;
}
.locArrow {
  font-size: 0.75rem;
  color: var(--color-ink-mute);
}

.hero {
  padding: var(--sp-5) var(--sp-4) var(--sp-4);
  text-align: left;
}
.heroTitle {
  font-family: var(--font-display);
  font-size: 1.6rem;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}
.heroSub {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.95rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-top: 8px solid var(--color-line-soft);
}

.sectionHeader {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.sectionTitle {
  font-size: 1.05rem;
  margin: 0;
}
.moreLink {
  font-size: 0.85rem;
  color: var(--color-ink-mute);
}

.cardCol {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.empty {
  margin: 0;
  padding: var(--sp-5);
  text-align: center;
  color: var(--color-ink-mute);
  font-size: 0.9rem;
  background: var(--color-surface-elev);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-line);
}
.empty a {
  font-weight: 600;
}

.noticeList {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-line-soft);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.noticeItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--color-line-soft);
  color: var(--color-ink);
  text-decoration: none;
  font-size: 0.9rem;
}
.noticeList li:last-child .noticeItem { border-bottom: none; }
.noticeTitle {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: var(--sp-3);
}
.noticeDate {
  font-size: 0.75rem;
  color: var(--color-ink-mute);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/HomePage.jsx frontend/src/pages/HomePage.module.css
git commit -m "feat(m-mobile): HomePage mobile-first — sticky 위치 헤더 + 카드 1열 + 공지 리스트"
```

---

### Task 10: LoginPage mobile (single column)

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/pages/LoginPage.module.css`

- [ ] **Step 1: Replace LoginPage.jsx entirely**

`frontend/src/pages/LoginPage.jsx`:

```jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/", { replace: true });
      return;
    }
    usernameRef.current?.focus();
  }, [navigate]);

  const resetForm = () => { setUsername(""); setEmail(""); setPassword(""); setRole("user"); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { username, password }
        : { username, email, password, role };
      const { data } = await api.post(endpoint, body);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.role === "admin" || data.user.role === "superadmin" ? "/admin" : "/");
    } catch (err) {
      const msg = err.response?.data?.detail;
      setError(mode === "login" ? msg || "로그인에 실패했습니다." : msg || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.brandLink}>
        <span className={styles.brand}>Sodam<span className={styles.brandAccent}>Jobs</span></span>
      </Link>
      <p className={styles.tagline}>동네 단기 알바 직거래</p>

      <div className={styles.tabRow}>
        <button
          type="button"
          className={`${styles.tab} ${isLogin ? styles.tabActive : ""}`}
          onClick={() => { setMode("login"); resetForm(); }}
        >로그인</button>
        <button
          type="button"
          className={`${styles.tab} ${!isLogin ? styles.tabActive : ""}`}
          onClick={() => { setMode("register"); resetForm(); }}
        >회원가입</button>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>아이디</span>
          <input
            ref={usernameRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        {!isLogin && (
          <label className={styles.field}>
            <span>이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
        )}

        {!isLogin && (
          <fieldset className={styles.roleFieldset}>
            <legend>가입 유형</legend>
            <label className={`${styles.roleOption} ${role === "user" ? styles.roleOptionActive : ""}`}>
              <input type="radio" name="role" value="user" checked={role === "user"} onChange={(e) => setRole(e.target.value)} />
              <span className={styles.roleEmoji}>🎒</span>
              <span className={styles.roleLabel}>알바생</span>
            </label>
            <label className={`${styles.roleOption} ${role === "employer" ? styles.roleOptionActive : ""}`}>
              <input type="radio" name="role" value="employer" checked={role === "employer"} onChange={(e) => setRole(e.target.value)} />
              <span className={styles.roleEmoji}>🏪</span>
              <span className={styles.roleLabel}>사장님</span>
            </label>
          </fieldset>
        )}

        <label className={styles.field}>
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? "..." : isLogin ? "로그인" : "회원가입"}
        </button>
      </form>

      <Link to="/" className={styles.back}>← 홈으로</Link>
    </div>
  );
}
```

- [ ] **Step 2: Replace LoginPage.module.css entirely**

`frontend/src/pages/LoginPage.module.css`:

```css
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: var(--sp-7) var(--sp-5);
  background: var(--color-surface);
  gap: var(--sp-4);
}

.brandLink {
  text-decoration: none;
  width: fit-content;
}
.brand {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-ink);
}
.brandAccent {
  color: var(--color-warm);
}

.tagline {
  margin: 0 0 var(--sp-3);
  color: var(--color-ink-mute);
  font-size: 0.95rem;
}

.tabRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--color-line);
  margin-bottom: var(--sp-3);
}
.tab {
  padding: var(--sp-3) 0;
  font-size: 1rem;
  color: var(--color-ink-mute);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
}
.tabActive {
  color: var(--color-ink);
  border-bottom-color: var(--color-warm);
  font-weight: 600;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field span {
  font-size: 0.85rem;
  color: var(--color-ink-soft);
  font-weight: 500;
}
.field input {
  height: 48px;
  padding: 0 var(--sp-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 1rem;
  color: var(--color-ink);
}
.field input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.roleFieldset {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
  border: none;
  padding: 0;
  margin: 0;
}
.roleFieldset legend {
  font-size: 0.85rem;
  color: var(--color-ink-soft);
  font-weight: 500;
  margin-bottom: 6px;
  padding: 0;
}
.roleOption {
  position: relative;
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.roleOption input[type="radio"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.roleOptionActive {
  border-color: var(--color-warm);
  background: var(--color-warm-soft);
}
.roleEmoji { font-size: 1.5rem; }
.roleLabel { font-size: 0.9rem; font-weight: 500; }

.error {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  background: var(--color-warm-soft);
  border-radius: var(--radius-sm);
  color: var(--color-danger);
  font-size: 0.85rem;
}

.submit {
  height: 52px;
  background: var(--color-ink);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  margin-top: var(--sp-2);
}
.submit:disabled { opacity: 0.6; }

.back {
  margin-top: auto;
  padding-top: var(--sp-5);
  color: var(--color-ink-mute);
  font-size: 0.875rem;
  text-decoration: none;
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx frontend/src/pages/LoginPage.module.css
git commit -m "feat(m-mobile): LoginPage single-column mobile layout w/ role tile picker"
```

---

### Task 11: AboutPage + ServicesPage mobile (PageHeader + tighter content)

**Files:**
- Modify: `frontend/src/pages/AboutPage.jsx`
- Modify: `frontend/src/pages/AboutPage.module.css`
- Modify: `frontend/src/pages/ServicesPage.jsx`
- Modify: `frontend/src/pages/ServicesPage.module.css`

- [ ] **Step 1: Replace AboutPage.jsx entirely**

`frontend/src/pages/AboutPage.jsx`:

```jsx
import PageHeader from "../components/layout/PageHeader";
import styles from "./AboutPage.module.css";

export default function AboutPage() {
  return (
    <div className={styles.about}>
      <PageHeader title="회사소개" back />

      <section className={styles.section}>
        <h2>비전</h2>
        <p>SodamJobs는 동네 단위 단기 알바 시장을 더 안전하고 투명하게 만들어, 사장님과 알바생 모두가 신뢰할 수 있는 직거래 플랫폼을 지향합니다.</p>
      </section>

      <section className={styles.section}>
        <h2>미션</h2>
        <p>거리·평판·인증 데이터를 결합해 가장 적합한 매칭을 빠르게 제공하고, 복잡한 이력서 대신 3줄 자기소개로 즉시 대화를 시작할 수 있게 합니다.</p>
      </section>

      <section className={styles.section}>
        <h2>팀</h2>
        <p>현장 경험을 가진 운영진과 엔지니어, 디자이너로 구성된 작은 팀입니다.</p>
      </section>

      <section className={styles.section}>
        <h2>연혁</h2>
        <ul className={styles.timeline}>
          <li><strong>2026</strong> SodamJobs 프로젝트 시작</li>
          <li><strong>2026</strong> MVP 런칭 (서울/경기)</li>
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Replace AboutPage.module.css entirely**

`frontend/src/pages/AboutPage.module.css`:

```css
.about {
  display: flex;
  flex-direction: column;
}

.section {
  padding: var(--sp-4);
  border-top: 1px solid var(--color-line-soft);
}
.section:first-of-type { border-top: none; padding-top: var(--sp-5); }
.section h2 {
  font-size: 1.05rem;
  margin: 0 0 var(--sp-2);
  color: var(--color-accent-ink);
}
.section p {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.65;
  font-size: 0.95rem;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.timeline li {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--color-surface-elev);
  border-left: 3px solid var(--color-warm);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
}
.timeline strong {
  color: var(--color-accent-ink);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Replace ServicesPage.jsx entirely**

`frontend/src/pages/ServicesPage.jsx`:

```jsx
import PageHeader from "../components/layout/PageHeader";
import styles from "./ServicesPage.module.css";

const SERVICES = [
  { title: "지역 기반 매칭", desc: "GPS 기반 거리 표시로 출퇴근 부담을 미리 가늠.", features: ["거리 표시", "동네 카테고리", "지도 뷰"] },
  { title: "안심 사업장 인증", desc: "SodamFN 검증을 통과한 사업장만 안심 배지.", features: ["사업자 검증", "리뷰 시스템", "근로계약서 템플릿"] },
  { title: "3줄 자기소개", desc: "이력서 없이 자기소개 3줄로 즉시 대화 시작.", features: ["빠른 지원", "실시간 채팅", "프로필 검증"] },
  { title: "사장님 도구", desc: "구인 등록부터 지원자/근로 일정 관리까지.", features: ["구인 등록", "지원자 관리", "근로 스케줄"] },
];

export default function ServicesPage() {
  return (
    <div className={styles.services}>
      <PageHeader title="서비스" back />

      <p className={styles.intro}>SodamJobs는 동네 단위 단기 알바 매칭에 집중한 직거래 플랫폼입니다.</p>

      <div className={styles.list}>
        {SERVICES.map((s) => (
          <div key={s.title} className={styles.card}>
            <h2 className={styles.cardTitle}>{s.title}</h2>
            <p className={styles.cardDesc}>{s.desc}</p>
            <ul className={styles.features}>
              {s.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace ServicesPage.module.css entirely**

`frontend/src/pages/ServicesPage.module.css`:

```css
.services {
  display: flex;
  flex-direction: column;
}

.intro {
  padding: var(--sp-4);
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.95rem;
  line-height: 1.55;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: 0 var(--sp-4) var(--sp-4);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: var(--sp-4);
}
.cardTitle {
  font-size: 1.05rem;
  margin: 0 0 var(--sp-2);
  color: var(--color-accent-ink);
}
.cardDesc {
  margin: 0 0 var(--sp-3);
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  line-height: 1.55;
}

.features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.features li {
  font-size: 0.8rem;
  padding: 3px 10px;
  background: var(--color-warm-soft);
  color: var(--color-warm);
  border-radius: 999px;
}
```

- [ ] **Step 5: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/AboutPage.jsx frontend/src/pages/AboutPage.module.css frontend/src/pages/ServicesPage.jsx frontend/src/pages/ServicesPage.module.css
git commit -m "feat(m-mobile): AboutPage + ServicesPage mobile-first w/ PageHeader"
```

---

## Phase 5 — Job pages mobile redesign

### Task 12: JobListPage mobile (filter bottom sheet)

**Files:**
- Modify: `frontend/src/pages/jobs/JobListPage.jsx`
- Modify: `frontend/src/pages/jobs/JobListPage.module.css`

- [ ] **Step 1: Replace JobListPage.jsx entirely**

`frontend/src/pages/jobs/JobListPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import PageHeader from "../../components/layout/PageHeader";
import JobCard from "../../components/jobs/JobCard";
import JobFilters from "../../components/jobs/JobFilters";
import LocationPicker, { getSavedLocation } from "../../components/jobs/LocationPicker";
import styles from "./JobListPage.module.css";

export default function JobListPage() {
  const [location, setLocation] = useState(getSavedLocation());
  const [showPicker, setShowPicker] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filters, setFilters] = useState({ radius_km: 5 });
  const [page, setPage] = useState(1);
  const size = 20;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location && !sessionStorage.getItem("jobsLocationPromptShown")) {
      setShowPicker(true);
      sessionStorage.setItem("jobsLocationPromptShown", "1");
    }
  }, [location]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (location) {
      params.set("lat", location.lat);
      params.set("lng", location.lng);
      params.set("radius_km", filters.radius_km ?? 5);
    }
    if (filters.category) params.set("category", filters.category);
    if (filters.pay_type) params.set("pay_type", filters.pay_type);
    if (filters.pay_min != null) params.set("pay_min", filters.pay_min);
    if (filters.q) params.set("q", filters.q);
    params.set("page", page);
    params.set("size", size);
    api.get(`/api/jobs?${params.toString()}`)
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [location, filters, page]);

  useEffect(() => { setPage(1); }, [filters, location]);

  const totalPages = Math.max(1, Math.ceil(total / size));
  const locLabel = location?.neighborhood || (location ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : "위치 미설정");

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.pay_type ? 1 : 0) +
    (filters.pay_min != null ? 1 : 0) +
    (filters.q ? 1 : 0);

  return (
    <div className={styles.page}>
      <PageHeader
        title={
          <button type="button" onClick={() => setShowPicker(true)} className={styles.locTrigger}>
            📍 {locLabel} <span className={styles.locArrow}>▾</span>
          </button>
        }
        actions={[
          <button key="filter" type="button" onClick={() => setShowFilterSheet(true)} className={styles.filterTrigger} aria-label="필터">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" />
            </svg>
            {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
          </button>,
        ]}
      />

      {loading ? (
        <p className={styles.empty}>불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>조건에 맞는 알바가 없습니다.</p>
      ) : (
        <>
          <div className={styles.list}>
            {items.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
          <div className={styles.pagination}>
            <button onClick={() => setPage(page - 1)} disabled={page <= 1}>이전</button>
            <span>{page} / {totalPages}</span>
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}>다음</button>
          </div>
        </>
      )}

      {showPicker && (
        <LocationPicker
          initial={location}
          onClose={() => setShowPicker(false)}
          onSave={(loc) => { setLocation(loc); setShowPicker(false); }}
        />
      )}

      {showFilterSheet && (
        <div className={styles.sheetBackdrop} onClick={() => setShowFilterSheet(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="필터">
            <div className={styles.sheetGrabber} />
            <div className={styles.sheetHeader}>
              <h3>필터</h3>
              <button type="button" onClick={() => setFilters({ radius_km: 5 })} className={styles.resetBtn}>초기화</button>
            </div>
            <JobFilters value={filters} onChange={setFilters} />
            <button type="button" onClick={() => setShowFilterSheet(false)} className={styles.sheetApply}>
              {total}개 결과 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace JobListPage.module.css entirely**

`frontend/src/pages/jobs/JobListPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
}

.locTrigger {
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-ink);
}
.locArrow { font-size: 0.75rem; color: var(--color-ink-mute); }

.filterTrigger {
  position: relative;
  width: 36px;
  height: 36px;
  background: transparent;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink);
}
.filterTrigger:hover { background: var(--color-surface-elev); }
.filterBadge {
  position: absolute;
  top: 2px;
  right: 2px;
  background: var(--color-warm);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-3);
}

.empty {
  margin: 0;
  padding: var(--sp-7) var(--sp-4);
  text-align: center;
  color: var(--color-ink-mute);
  font-size: 0.9rem;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-4);
  font-size: 0.875rem;
  color: var(--color-ink-soft);
}
.pagination button {
  padding: 6px var(--sp-3);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  color: var(--color-ink);
}
.pagination button:disabled { color: var(--color-ink-mute); }

/* ── Bottom sheet ─── */
.sheetBackdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 17, 15, 0.5);
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  background: var(--color-surface);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  padding: var(--sp-4);
  width: 100%;
  max-width: 440px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.sheetGrabber {
  width: 40px;
  height: 4px;
  background: var(--color-line);
  border-radius: 2px;
  margin: 0 auto var(--sp-2);
}
.sheetHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sheetHeader h3 { margin: 0; font-size: 1.1rem; }
.resetBtn {
  background: transparent;
  color: var(--color-ink-mute);
  font-size: 0.85rem;
  text-decoration: underline;
}
.sheetApply {
  margin-top: var(--sp-3);
  height: 48px;
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/jobs/JobListPage.jsx frontend/src/pages/jobs/JobListPage.module.css
git commit -m "feat(m-mobile): JobListPage — sticky 위치 헤더 + 필터 bottom sheet + 카드 1열"
```

---

### Task 13: JobDetailPage mobile (sticky apply bar)

**Files:**
- Modify: `frontend/src/pages/jobs/JobDetailPage.jsx`
- Modify: `frontend/src/pages/jobs/JobDetailPage.module.css`

- [ ] **Step 1: Replace JobDetailPage.jsx entirely**

`frontend/src/pages/jobs/JobDetailPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../../services/api";
import PageHeader from "../../components/layout/PageHeader";
import {
  JOB_CATEGORIES,
  PAY_TYPES,
  JOB_STATUS_LABELS,
  formatKRW,
} from "../../lib/jobConstants";
import styles from "./JobDetailPage.module.css";

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    setLoading(true);
    setActiveImage(0);
    api.get(`/api/jobs/${id}`)
      .then((r) => setJob(r.data))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="알바" back />
        <p className={styles.empty}>로딩 중...</p>
      </div>
    );
  }
  if (!job) {
    return (
      <div className={styles.page}>
        <PageHeader title="알바" back />
        <p className={styles.empty}>알바를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const canEdit = user && (user.id === job.employer_id || user.role === "admin" || user.role === "superadmin");
  const handleDelete = async () => {
    if (!confirm("이 구인을 삭제하시겠습니까?")) return;
    await api.delete(`/api/jobs/${id}`);
    navigate("/jobs");
  };

  const images = job.images || [];

  const headerActions = canEdit
    ? [
        <Link key="edit" to={`/jobs/${id}/edit`} aria-label="수정">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </Link>,
        <button key="del" type="button" onClick={handleDelete} aria-label="삭제">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>,
      ]
    : [];

  return (
    <article className={styles.page}>
      <PageHeader title="알바" back actions={headerActions} />

      {images.length > 0 ? (
        <div className={styles.gallery}>
          <img src={images[activeImage].stored_path} alt={job.title} className={styles.heroImage} />
          {images.length > 1 && (
            <div className={styles.thumbStrip}>
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ""}`}
                  aria-label={`이미지 ${i + 1}`}
                >
                  <img src={img.stored_path} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.heroPlaceholder}>
          <span>{JOB_CATEGORIES[job.category] || "알바"}</span>
        </div>
      )}

      <header className={styles.titleBlock}>
        <div className={styles.badges}>
          {job.is_verified && <span className={styles.verified}>✓ 안심 사업장</span>}
          {job.status !== "active" && <span className={styles.status}>{JOB_STATUS_LABELS[job.status] || job.status}</span>}
        </div>
        <h1 className={styles.title}>{job.title}</h1>
        <div className={styles.payRow}>
          <span className={styles.payType}>{PAY_TYPES[job.pay_type] || job.pay_type}</span>
          <span className={styles.payAmount}>{formatKRW(job.pay_amount)}</span>
        </div>
      </header>

      <dl className={styles.info}>
        <dt>사업장</dt><dd>{job.business_name}</dd>
        <dt>주소</dt><dd>{job.address}</dd>
        <dt>카테고리</dt><dd>{JOB_CATEGORIES[job.category] || job.category}</dd>
        {job.starts_at && <><dt>근무 시작</dt><dd>{new Date(job.starts_at).toLocaleDateString("ko-KR")}</dd></>}
        {job.ends_at && <><dt>근무 종료</dt><dd>{new Date(job.ends_at).toLocaleDateString("ko-KR")}</dd></>}
      </dl>

      <div className={styles.description}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.description || "_상세 설명이 없습니다._"}</ReactMarkdown>
      </div>

      <div className={styles.stats}>조회 {job.view_count}회</div>

      {/* Sticky bottom apply bar */}
      <div className={styles.applyBar}>
        <button type="button" className={styles.heartBtn} aria-label="찜하기">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" disabled className={styles.applyBtn} title="M4b에서 활성화 예정">
          지원하기 (준비 중)
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Replace JobDetailPage.module.css entirely**

`frontend/src/pages/jobs/JobDetailPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  padding-bottom: 80px; /* extra reserved for sticky apply bar */
}

.empty {
  padding: var(--sp-7);
  text-align: center;
  color: var(--color-ink-mute);
}

.gallery {
  width: 100%;
  background: var(--color-surface-elev);
}
.heroImage {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
}
.heroPlaceholder {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: var(--color-line-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-mute);
  font-size: 1.05rem;
}
.thumbStrip {
  display: flex;
  gap: 6px;
  padding: var(--sp-2) var(--sp-3);
  overflow-x: auto;
}
.thumb {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-surface-elev);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumbActive { border-color: var(--color-accent); }

.titleBlock {
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.verified {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  background: var(--color-warm);
  color: #fff;
  border-radius: var(--radius-sm);
}
.status {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 8px;
  background: var(--color-line);
  color: var(--color-ink-mute);
  border-radius: var(--radius-sm);
}
.title {
  font-size: 1.3rem;
  margin: 0;
  line-height: 1.35;
}
.payRow {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.payType { color: var(--color-ink-soft); font-size: 0.9rem; }
.payAmount {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-accent-ink);
}

.info {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 6px var(--sp-3);
  margin: 0;
  padding: var(--sp-4);
  background: var(--color-surface-elev);
  font-size: 0.875rem;
  border-top: 1px solid var(--color-line-soft);
  border-bottom: 1px solid var(--color-line-soft);
}
.info dt { color: var(--color-ink-mute); }
.info dd { margin: 0; color: var(--color-ink); }

.description {
  padding: var(--sp-4);
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--color-ink);
}
.description :global(p) { margin: 0 0 var(--sp-3); }
.description :global(p:last-child) { margin-bottom: 0; }
.description :global(h2) { font-size: 1.05rem; margin: var(--sp-4) 0 var(--sp-2); }
.description :global(ul), .description :global(ol) { padding-left: var(--sp-5); }

.stats {
  padding: 0 var(--sp-4) var(--sp-4);
  font-size: 0.8rem;
  color: var(--color-ink-mute);
}

/* Sticky bottom apply bar — sits ABOVE BottomNav.
   BottomNav is fixed bottom 0 with 64px height + safe-area.
   Apply bar is fixed bottom: calc(64px + safe-area).
*/
.applyBar {
  position: fixed;
  bottom: calc(64px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  background: var(--color-surface);
  border-top: 1px solid var(--color-line);
  z-index: 55;
}
.heartBtn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-ink-soft);
}
.heartBtn:hover { color: var(--color-warm); border-color: var(--color-warm); }
.applyBtn {
  flex: 1;
  height: 44px;
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 700;
}
.applyBtn:disabled {
  background: var(--color-line);
  color: var(--color-ink-mute);
  cursor: not-allowed;
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/jobs/JobDetailPage.jsx frontend/src/pages/jobs/JobDetailPage.module.css
git commit -m "feat(m-mobile): JobDetailPage — full-bleed hero + sticky 지원하기 bar above BottomNav"
```

---

### Task 14: JobFormPage mobile

**Files:**
- Modify: `frontend/src/pages/jobs/JobFormPage.jsx`
- Modify: `frontend/src/pages/jobs/JobFormPage.module.css`

- [ ] **Step 1: Replace JobFormPage.jsx entirely**

`frontend/src/pages/jobs/JobFormPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import PageHeader from "../../components/layout/PageHeader";
import {
  JOB_CATEGORIES,
  PAY_TYPES,
  JOB_CATEGORY_KEYS,
  PAY_TYPE_KEYS,
} from "../../lib/jobConstants";
import LocationPicker, { saveLocation } from "../../components/jobs/LocationPicker";
import styles from "./JobFormPage.module.css";

export default function JobFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    business_name: "",
    address: "",
    lat: "",
    lng: "",
    pay_type: "hourly",
    pay_amount: "",
    category: "hall",
    starts_at: "",
    ends_at: "",
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showLocPicker, setShowLocPicker] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/api/jobs/${id}`).then((r) => {
      const j = r.data;
      setForm({
        title: j.title,
        description: j.description || "",
        business_name: j.business_name,
        address: j.address,
        lat: "",
        lng: "",
        pay_type: j.pay_type,
        pay_amount: String(j.pay_amount),
        category: j.category,
        starts_at: j.starts_at ? j.starts_at.slice(0, 16) : "",
        ends_at: j.ends_at ? j.ends_at.slice(0, 16) : "",
      });
      setImages(j.images || []);
    }).catch(() => setError("불러오기 실패"));
  }, [id, isEdit]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      title: form.title,
      description: form.description,
      business_name: form.business_name,
      address: form.address,
      pay_type: form.pay_type,
      pay_amount: Number(form.pay_amount),
      category: form.category,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };

    const latNum = form.lat === "" ? null : Number(form.lat);
    const lngNum = form.lng === "" ? null : Number(form.lng);

    if (!isEdit && (latNum == null || lngNum == null)) {
      setError("위치(lat, lng)를 입력하거나 위치 선택 버튼을 사용하세요.");
      return;
    }
    if (latNum != null && lngNum != null) {
      payload.lat = latNum;
      payload.lng = lngNum;
    } else if ((latNum != null) !== (lngNum != null)) {
      setError("lat과 lng는 함께 입력해야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/api/jobs/${id}`, payload);
        navigate(`/jobs/${id}`);
      } else {
        const res = await api.post("/api/jobs", payload);
        const newId = res.data.id;
        navigate(`/jobs/${newId}/edit`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "저장 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isEdit) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post(`/api/jobs/${id}/images`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImages((prev) => [...prev, res.data]);
    } catch (err) {
      setError(err.response?.data?.detail || "이미지 업로드 실패");
    }
    e.target.value = "";
  };

  const handleImageDelete = async (imageId) => {
    if (!confirm("이미지를 삭제하시겠습니까?")) return;
    await api.delete(`/api/jobs/${id}/images/${imageId}`);
    setImages((prev) => prev.filter((i) => i.id !== imageId));
  };

  return (
    <div className={styles.page}>
      <PageHeader title={isEdit ? "구인 수정" : "구인 등록"} back />

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>제목 *</span>
          <input type="text" value={form.title} onChange={(e) => update({ title: e.target.value })} required />
        </label>

        <label className={styles.field}>
          <span>사업장명 *</span>
          <input type="text" value={form.business_name} onChange={(e) => update({ business_name: e.target.value })} required />
        </label>

        <label className={styles.field}>
          <span>주소 *</span>
          <input type="text" value={form.address} onChange={(e) => update({ address: e.target.value })} placeholder="서울 강남구 역삼동 123-45" required />
        </label>

        <div className={styles.locBlock}>
          <span className={styles.locLabel}>위치 (지도 좌표) {isEdit ? "(변경 시에만 입력)" : "*"}</span>
          <button type="button" onClick={() => setShowLocPicker(true)} className={styles.locBtn}>
            📍 현재 위치 / 좌표 입력
          </button>
          {(form.lat || form.lng) && (
            <p className={styles.locValue}>
              {form.lat || "—"}, {form.lng || "—"}
            </p>
          )}
        </div>

        <div className={styles.payRow}>
          <label className={styles.field}>
            <span>급여 종류 *</span>
            <select value={form.pay_type} onChange={(e) => update({ pay_type: e.target.value })}>
              {PAY_TYPE_KEYS.map((k) => <option key={k} value={k}>{PAY_TYPES[k]}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>금액 (원) *</span>
            <input type="number" min={0} step={1000} value={form.pay_amount} onChange={(e) => update({ pay_amount: e.target.value })} required />
          </label>
        </div>

        <label className={styles.field}>
          <span>카테고리 *</span>
          <select value={form.category} onChange={(e) => update({ category: e.target.value })}>
            {JOB_CATEGORY_KEYS.map((k) => <option key={k} value={k}>{JOB_CATEGORIES[k]}</option>)}
          </select>
        </label>

        <div className={styles.dateRow}>
          <label className={styles.field}>
            <span>근무 시작 (선택)</span>
            <input type="datetime-local" value={form.starts_at} onChange={(e) => update({ starts_at: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>근무 종료 (선택)</span>
            <input type="datetime-local" value={form.ends_at} onChange={(e) => update({ ends_at: e.target.value })} />
          </label>
        </div>

        <label className={styles.field}>
          <span>상세 설명 (Markdown)</span>
          <textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={8} />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.formActions}>
          <button type="button" onClick={() => navigate(-1)} className={styles.btnGhost}>취소</button>
          <button type="submit" disabled={submitting} className={styles.btnPrimary}>
            {submitting ? "저장 중..." : (isEdit ? "수정" : "등록")}
          </button>
        </div>
      </form>

      {isEdit && (
        <section className={styles.imagesSection}>
          <h2 className={styles.sectionTitle}>이미지 ({images.length})</h2>
          <div className={styles.imageGrid}>
            {images.map((img) => (
              <div key={img.id} className={styles.imageItem}>
                <img src={img.stored_path} alt={img.original_name} />
                <button type="button" onClick={() => handleImageDelete(img.id)} className={styles.imageRemove}>삭제</button>
              </div>
            ))}
            <label className={styles.imageUpload}>
              <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              + 이미지 추가
            </label>
          </div>
        </section>
      )}

      {showLocPicker && (
        <LocationPicker
          initial={{ lat: form.lat ? Number(form.lat) : null, lng: form.lng ? Number(form.lng) : null }}
          onClose={() => setShowLocPicker(false)}
          onSave={(loc) => {
            update({ lat: String(loc.lat), lng: String(loc.lng) });
            saveLocation(loc);
            setShowLocPicker(false);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace JobFormPage.module.css entirely**

`frontend/src/pages/jobs/JobFormPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4);
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field > span {
  font-size: 0.85rem;
  color: var(--color-ink-soft);
  font-weight: 500;
}
.field input, .field select, .field textarea {
  padding: var(--sp-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 0.95rem;
  color: var(--color-ink);
  width: 100%;
}
.field input:focus, .field select:focus, .field textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}
.field textarea {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  resize: vertical;
}

.locBlock {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.locLabel {
  font-size: 0.85rem;
  color: var(--color-ink-soft);
  font-weight: 500;
}
.locBtn {
  height: 48px;
  background: var(--color-warm-soft);
  border: 1px dashed var(--color-warm);
  border-radius: var(--radius-md);
  color: var(--color-warm);
  font-weight: 600;
  font-size: 0.95rem;
}
.locValue {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-ink-mute);
}

.payRow, .dateRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}

.error {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  background: var(--color-warm-soft);
  color: var(--color-danger);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.formActions {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--sp-3);
  margin-top: var(--sp-3);
}
.btnGhost {
  height: 48px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  color: var(--color-ink);
  font-weight: 500;
}
.btnPrimary {
  height: 48px;
  background: var(--color-accent);
  border: none;
  color: #fff;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 1rem;
}
.btnPrimary:disabled { opacity: 0.6; }

.imagesSection {
  padding: var(--sp-4);
  border-top: 8px solid var(--color-line-soft);
}
.sectionTitle {
  font-size: 1.05rem;
  margin: 0 0 var(--sp-3);
}
.imageGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
}
.imageItem {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface-elev);
}
.imageItem img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.imageRemove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(20, 17, 15, 0.7);
  color: #fff;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
.imageUpload {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border: 1px dashed var(--color-line);
  border-radius: var(--radius-md);
  color: var(--color-ink-mute);
  font-size: 0.85rem;
  cursor: pointer;
}
.imageUpload:hover { border-color: var(--color-accent); color: var(--color-accent); }
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/jobs/JobFormPage.jsx frontend/src/pages/jobs/JobFormPage.module.css
git commit -m "feat(m-mobile): JobFormPage — single-column mobile form with prominent 위치 button"
```

---

### Task 15: MyJobsPage mobile (card list + 셈하나 hint)

**Files:**
- Modify: `frontend/src/pages/jobs/MyJobsPage.jsx`
- Modify: `frontend/src/pages/jobs/MyJobsPage.module.css`

- [ ] **Step 1: Replace MyJobsPage.jsx entirely**

`frontend/src/pages/jobs/MyJobsPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import PageHeader from "../../components/layout/PageHeader";
import SemhanaLink from "../../components/layout/SemhanaLink";
import {
  JOB_CATEGORIES,
  PAY_TYPES,
  JOB_STATUS_LABELS,
  formatKRW,
} from "../../lib/jobConstants";
import styles from "./MyJobsPage.module.css";

export default function MyJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/api/jobs/my")
      .then((r) => setJobs(r.data))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (job) => {
    if (job.status === "expired") return;
    const next = job.status === "active" ? "closed" : "active";
    await api.put(`/api/jobs/${job.id}`, { status: next });
    load();
  };

  const handleDelete = async (job) => {
    if (!confirm(`"${job.title}" 구인을 삭제하시겠습니까?`)) return;
    await api.delete(`/api/jobs/${job.id}`);
    load();
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="내 구인"
        back
        actions={[
          <Link key="new" to="/jobs/new" aria-label="새 구인 등록">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </Link>,
        ]}
      />

      {loading ? (
        <p className={styles.empty}>불러오는 중...</p>
      ) : jobs.length === 0 ? (
        <div className={styles.emptyBlock}>
          <p className={styles.empty}>등록한 구인이 없습니다.</p>
          <Link to="/jobs/new" className={styles.cta}>+ 첫 구인 등록하기</Link>
          <SemhanaLink variant="hint" />
        </div>
      ) : (
        <div className={styles.list}>
          {jobs.map((j) => (
            <article key={j.id} className={styles.jobCard}>
              <Link to={`/jobs/${j.id}`} className={styles.jobBody}>
                <h3 className={styles.jobTitle}>{j.title}</h3>
                <div className={styles.jobMeta}>
                  <span>{JOB_CATEGORIES[j.category] || j.category}</span>
                  <span className={styles.dot}>·</span>
                  <span>{PAY_TYPES[j.pay_type]} {formatKRW(j.pay_amount)}</span>
                </div>
                <div className={styles.jobMetaSub}>
                  조회 {j.view_count} · {new Date(j.created_at).toLocaleDateString("ko-KR")}
                </div>
              </Link>

              <div className={styles.jobActions}>
                {j.status === "expired" ? (
                  <span className={`${styles.statusBtn} ${styles.statusOff}`}>
                    {JOB_STATUS_LABELS.expired}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`${styles.statusBtn} ${j.status === "active" ? styles.statusOn : styles.statusOff}`}
                    onClick={() => toggleStatus(j)}
                  >
                    {JOB_STATUS_LABELS[j.status] || j.status}
                  </button>
                )}
                <Link to={`/jobs/${j.id}/edit`} className={styles.editLink}>수정</Link>
                <button type="button" onClick={() => handleDelete(j)} className={styles.deleteBtn}>삭제</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace MyJobsPage.module.css entirely**

`frontend/src/pages/jobs/MyJobsPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
}

.empty {
  margin: 0;
  padding: var(--sp-7) var(--sp-4);
  text-align: center;
  color: var(--color-ink-mute);
}

.emptyBlock {
  padding: var(--sp-5) var(--sp-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
}
.cta {
  background: var(--color-accent);
  color: #fff;
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--radius-md);
  font-weight: 600;
  text-decoration: none;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
}

.jobCard {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
}

.jobBody { color: inherit; text-decoration: none; }
.jobTitle {
  font-size: 1rem;
  margin: 0 0 4px;
  font-weight: 600;
}
.jobMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--color-ink-soft);
}
.dot { color: var(--color-line); }
.jobMetaSub {
  font-size: 0.75rem;
  color: var(--color-ink-mute);
  margin-top: 2px;
}

.jobActions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--color-line-soft);
}
.statusBtn {
  padding: 4px var(--sp-3);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
  border: none;
}
.statusOn { background: var(--color-success); color: #fff; }
.statusOff { background: var(--color-line); color: var(--color-ink-soft); }

.editLink {
  margin-left: auto;
  font-size: 0.85rem;
  color: var(--color-accent);
}
.deleteBtn {
  font-size: 0.85rem;
  color: var(--color-danger);
  background: transparent;
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/jobs/MyJobsPage.jsx frontend/src/pages/jobs/MyJobsPage.module.css
git commit -m "feat(m-mobile): MyJobsPage card list + empty-state 셈하나 hint"
```

---

## Phase 6 — Community pages mobile redesign

### Task 16: BoardPage mobile (with category tabs)

**Files:**
- Modify: `frontend/src/pages/community/BoardPage.jsx`
- Modify: `frontend/src/pages/community/BoardPage.module.css`

The original BoardPage relied on the deleted Sidebar for category navigation. We add inline tabs at the top.

- [ ] **Step 1: Replace BoardPage.jsx entirely**

`frontend/src/pages/community/BoardPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import PageHeader from "../../components/layout/PageHeader";
import PostList from "../../components/board/PostList";
import PostForm from "../../components/board/PostForm";
import styles from "./BoardPage.module.css";

const BOARD_TABS = [
  { key: "notice",  label: "공지" },
  { key: "qna",     label: "Q&A" },
  { key: "gallery", label: "갤러리" },
  { key: "video",   label: "동영상" },
];

const BOARD_TITLES = {
  notice: "공지사항",
  qna: "Q&A",
  gallery: "이미지 갤러리",
  video: "동영상",
};

export default function BoardPage() {
  const { boardType } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [size] = useState(20);
  const [showForm, setShowForm] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isLoggedIn = !!user;
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const canPost = boardType === "notice" ? isAdmin : isLoggedIn;

  const load = () => {
    api.get(`/api/boards/${boardType}?page=${page}&size=${size}`)
      .then((r) => { setPosts(r.data.items); setTotal(r.data.total); })
      .catch(() => {});
  };

  useEffect(() => { setPage(1); setShowForm(false); }, [boardType]);
  useEffect(() => { load(); }, [boardType, page]);

  const handleCreate = async (data) => {
    const res = await api.post(`/api/boards/${boardType}`, data);
    setShowForm(false);
    navigate(`/community/${boardType}/${res.data.id}`);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title={BOARD_TITLES[boardType] || boardType}
        actions={canPost && !showForm ? [
          <button key="new" type="button" onClick={() => setShowForm(true)} aria-label="글쓰기">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>,
        ] : []}
      />

      <nav className={styles.tabs} aria-label="게시판">
        {BOARD_TABS.map((tab) => (
          <Link
            key={tab.key}
            to={`/community/${tab.key}`}
            className={`${styles.tab} ${tab.key === boardType ? styles.tabActive : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {showForm ? (
        <div className={styles.formWrap}>
          <PostForm
            boardType={boardType}
            isAdmin={isAdmin}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : (
        <div className={styles.listWrap}>
          <PostList
            boardType={boardType}
            posts={posts}
            page={page}
            total={total}
            size={size}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace BoardPage.module.css entirely**

`frontend/src/pages/community/BoardPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  position: sticky;
  top: 56px; /* below PageHeader */
  z-index: 40;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-line-soft);
  padding: 0 var(--sp-2);
}
.tab {
  flex: 1;
  text-align: center;
  padding: var(--sp-3) 0;
  color: var(--color-ink-mute);
  font-size: 0.9rem;
  border-bottom: 2px solid transparent;
  text-decoration: none;
}
.tab:hover { color: var(--color-ink); }
.tabActive {
  color: var(--color-ink);
  border-bottom-color: var(--color-warm);
  font-weight: 600;
}

.listWrap, .formWrap {
  padding: var(--sp-3) var(--sp-3);
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/community/BoardPage.jsx frontend/src/pages/community/BoardPage.module.css
git commit -m "feat(m-mobile): BoardPage mobile w/ inline 4-tab category nav (replaces Sidebar)"
```

---

### Task 17: PostPage mobile (single column + sticky comment input)

**Files:**
- Modify: `frontend/src/pages/community/PostPage.jsx`
- Modify: `frontend/src/pages/community/PostPage.module.css`

- [ ] **Step 1: Replace PostPage.jsx entirely**

`frontend/src/pages/community/PostPage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import PageHeader from "../../components/layout/PageHeader";
import PostDetail from "../../components/board/PostDetail";
import PostForm from "../../components/board/PostForm";
import CommentSection from "../../components/board/CommentSection";
import FileUpload from "../../components/board/FileUpload";
import styles from "./PostPage.module.css";

export default function PostPage() {
  const { boardType, postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.pathname.endsWith("/edit");

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const load = () => {
    setLoading(true);
    api.get(`/api/boards/${boardType}/${postId}`)
      .then((r) => setPost(r.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [boardType, postId]);

  const handleUpdate = async (data) => {
    await api.put(`/api/boards/${boardType}/${postId}`, data);
    navigate(`/community/${boardType}/${postId}`);
    load();
  };

  const handleDelete = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    await api.delete(`/api/boards/${boardType}/${postId}`);
    navigate(`/community/${boardType}`);
  };

  if (loading) return (
    <div className={styles.page}>
      <PageHeader title="게시글" back />
      <p className={styles.empty}>로딩 중...</p>
    </div>
  );
  if (!post) return (
    <div className={styles.page}>
      <PageHeader title="게시글" back />
      <p className={styles.empty}>게시글을 찾을 수 없습니다.</p>
    </div>
  );

  if (isEdit) {
    return (
      <div className={styles.page}>
        <PageHeader title="게시글 수정" back />
        <div className={styles.formWrap}>
          <PostForm
            initial={post}
            boardType={boardType}
            isAdmin={isAdmin}
            onSubmit={handleUpdate}
            onCancel={() => navigate(`/community/${boardType}/${postId}`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title={post.title} back />
      <div className={styles.body}>
        <PostDetail post={post} boardType={boardType} currentUser={user} onDelete={handleDelete} />
        {user && (post.author_id === user.id || isAdmin) && (
          <FileUpload postId={post.id} onUploaded={() => load()} />
        )}
        <CommentSection postId={post.id} currentUser={user} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace PostPage.module.css entirely**

`frontend/src/pages/community/PostPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
}

.empty {
  padding: var(--sp-7) var(--sp-4);
  text-align: center;
  color: var(--color-ink-mute);
}

.body, .formWrap {
  padding: var(--sp-3) var(--sp-3);
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/community/PostPage.jsx frontend/src/pages/community/PostPage.module.css
git commit -m "feat(m-mobile): PostPage mobile single-column with PageHeader"
```

---

## Phase 7 — New pages (ProfilePage + ChatPlaceholder)

### Task 18: ProfilePage (full implementation)

**Files:**
- Modify: `frontend/src/pages/ProfilePage.jsx`
- Create: `frontend/src/pages/ProfilePage.module.css`

The stub from Task 6 is replaced with the real implementation now.

**Spec deviation note**: The spec calls for "3줄 자기소개" (multi-line bio). M4a's `User` model has a single-line `nickname` column but no separate `bio`. To stay within scope (avoid extra ALTER migration this cycle), the implementation uses `nickname` as the single-line display name. A future cycle can add `User.bio TEXT` + textarea editor — out of scope here.

- [ ] **Step 1: Replace ProfilePage.jsx entirely**

`frontend/src/pages/ProfilePage.jsx`:

```jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/layout/PageHeader";
import SemhanaLink from "../components/layout/SemhanaLink";
import { getSavedLocation, clearLocation } from "../components/jobs/LocationPicker";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [myJobsCount, setMyJobsCount] = useState(null);

  useEffect(() => {
    api.get("/api/auth/me")
      .then((r) => {
        setMe(r.data);
        setBio(r.data.nickname || "");
      })
      .catch(() => navigate("/login"));
  }, [navigate]);

  // For employer/admin, fetch my jobs count
  useEffect(() => {
    if (!me) return;
    if (me.role === "employer" || me.role === "admin" || me.role === "superadmin") {
      api.get("/api/jobs/my").then((r) => setMyJobsCount(r.data.length)).catch(() => {});
    }
  }, [me]);

  const saveBio = async () => {
    setSavingBio(true);
    try {
      const r = await api.put("/api/auth/me", { nickname: bio });
      setMe(r.data);
      setEditingBio(false);
    } finally {
      setSavingBio(false);
    }
  };

  const handleLogout = () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleClearLocation = () => {
    if (!confirm("저장된 위치를 지우시겠습니까?")) return;
    clearLocation();
    setMe({ ...me });  // re-render
  };

  if (!me) return <div className={styles.page}><PageHeader title="내 정보" /><p className={styles.loading}>로딩 중...</p></div>;

  const isEmployer = me.role === "employer";
  const isAdmin = me.role === "admin" || me.role === "superadmin";
  const isAlba = me.role === "user";
  const savedLoc = getSavedLocation();

  return (
    <div className={styles.page}>
      <PageHeader title="내 정보" />

      {/* Profile card */}
      <section className={styles.profileCard}>
        <div className={styles.avatar}>{(me.nickname || me.username).charAt(0).toUpperCase()}</div>
        <div className={styles.profileBody}>
          <h2 className={styles.username}>{me.nickname || me.username}</h2>
          <p className={styles.role}>
            {isEmployer ? "🏪 사장님" : isAdmin ? "🛡️ 관리자" : "🎒 알바생"}
            {savedLoc && <span> · 📍 {savedLoc.neighborhood || `${savedLoc.lat.toFixed(3)}, ${savedLoc.lng.toFixed(3)}`}</span>}
          </p>
        </div>
      </section>

      {/* 3줄 자기소개 (uses User.nickname for now since dedicated bio field is not in M4a; future-proofed) */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>닉네임</h3>
          {!editingBio && <button type="button" onClick={() => setEditingBio(true)} className={styles.editBtn}>수정</button>}
        </div>
        {editingBio ? (
          <>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={50}
              placeholder="다른 사용자에게 표시할 이름"
              className={styles.bioInput}
            />
            <div className={styles.bioActions}>
              <button type="button" onClick={() => { setBio(me.nickname || ""); setEditingBio(false); }} className={styles.btnGhost}>취소</button>
              <button type="button" onClick={saveBio} disabled={savingBio} className={styles.btnPrimary}>저장</button>
            </div>
          </>
        ) : (
          <p className={styles.bioDisplay}>{me.nickname || <em>(미설정 — 수정을 눌러 추가)</em>}</p>
        )}
      </section>

      {/* Role-specific section */}
      {(isEmployer || isAdmin) && (
        <section className={styles.section}>
          <h3>사업장</h3>
          <Link to="/my/jobs" className={styles.row}>
            <span className={styles.rowIcon}>🏪</span>
            <span className={styles.rowLabel}>내 구인 {myJobsCount != null && <span className={styles.rowCount}>({myJobsCount})</span>}</span>
            <span className={styles.rowChevron}>›</span>
          </Link>
        </section>
      )}

      {isEmployer && (
        <section className={styles.section}>
          <h4 className={styles.semhanaCaption}>매장 운영 도구</h4>
          <SemhanaLink variant="card" />
        </section>
      )}

      {isAlba && (
        <section className={styles.section}>
          <h3>활동</h3>
          <div className={`${styles.row} ${styles.rowDisabled}`}>
            <span className={styles.rowIcon}>📋</span>
            <span className={styles.rowLabel}>지원내역</span>
            <span className={styles.rowBadge}>M4b 준비 중</span>
          </div>
          <div className={`${styles.row} ${styles.rowDisabled}`}>
            <span className={styles.rowIcon}>💝</span>
            <span className={styles.rowLabel}>찜한 알바</span>
            <span className={styles.rowBadge}>준비 중</span>
          </div>
        </section>
      )}

      {/* Common: location, settings */}
      <section className={styles.section}>
        <h3>설정</h3>
        {savedLoc ? (
          <button type="button" onClick={handleClearLocation} className={styles.row}>
            <span className={styles.rowIcon}>📍</span>
            <span className={styles.rowLabel}>저장된 위치 지우기</span>
            <span className={styles.rowSub}>{savedLoc.neighborhood || `${savedLoc.lat.toFixed(3)}, ${savedLoc.lng.toFixed(3)}`}</span>
          </button>
        ) : (
          <Link to="/jobs" className={styles.row}>
            <span className={styles.rowIcon}>📍</span>
            <span className={styles.rowLabel}>위치 설정</span>
            <span className={styles.rowChevron}>›</span>
          </Link>
        )}
      </section>

      {/* Admin developer tools */}
      {isAdmin && (
        <section className={styles.section}>
          <h3>개발자 도구</h3>
          <Link to="/admin" className={styles.row}>
            <span className={styles.rowIcon}>🛡️</span>
            <span className={styles.rowLabel}>어드민 대시보드</span>
            <span className={styles.rowChevron}>›</span>
          </Link>
          <Link to="/mobile-preview" className={styles.row}>
            <span className={styles.rowIcon}>📱</span>
            <span className={styles.rowLabel}>모바일 미리보기</span>
            <span className={styles.rowChevron}>›</span>
          </Link>
        </section>
      )}

      <section className={styles.section}>
        <button type="button" onClick={handleLogout} className={`${styles.row} ${styles.logoutRow}`}>
          <span className={styles.rowIcon}>🚪</span>
          <span className={styles.rowLabel}>로그아웃</span>
        </button>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create ProfilePage.module.css**

`frontend/src/pages/ProfilePage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
}

.loading {
  padding: var(--sp-7);
  text-align: center;
  color: var(--color-ink-mute);
}

.profileCard {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-5) var(--sp-4);
  background: var(--color-surface);
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-warm-soft);
  color: var(--color-warm);
  font-size: 1.6rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.profileBody {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.username {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}
.role {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-ink-mute);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--sp-4);
  border-top: 8px solid var(--color-line-soft);
}
.section h3 {
  margin: 0 0 var(--sp-2);
  font-size: 0.875rem;
  color: var(--color-ink-mute);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.section h4 { margin: 0 0 var(--sp-2); font-size: 0.875rem; color: var(--color-ink-mute); font-weight: 500; }

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-2);
}
.sectionHeader h3 { margin: 0; }

.editBtn {
  background: transparent;
  color: var(--color-accent);
  font-size: 0.85rem;
}

.bioInput {
  width: 100%;
  padding: var(--sp-3);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 0.95rem;
}
.bioActions {
  display: flex;
  gap: var(--sp-2);
  justify-content: flex-end;
  margin-top: var(--sp-2);
}
.btnGhost {
  padding: 6px var(--sp-3);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}
.btnPrimary {
  padding: 6px var(--sp-3);
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
}
.btnPrimary:disabled { opacity: 0.6; }
.bioDisplay {
  margin: 0;
  padding: var(--sp-3);
  background: var(--color-surface-elev);
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  color: var(--color-ink);
  min-height: 48px;
}
.bioDisplay em { color: var(--color-ink-mute); font-style: normal; }

.row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
  width: 100%;
  background: transparent;
  text-align: left;
  color: inherit;
  text-decoration: none;
  border-top: 1px solid var(--color-line-soft);
}
.row:first-of-type { border-top: none; }

.rowIcon {
  width: 32px;
  font-size: 1.1rem;
  text-align: center;
}
.rowLabel {
  flex: 1;
  font-size: 0.95rem;
  color: var(--color-ink);
}
.rowSub {
  font-size: 0.8rem;
  color: var(--color-ink-mute);
}
.rowCount {
  color: var(--color-accent);
  font-weight: 700;
  margin-left: 4px;
}
.rowChevron {
  color: var(--color-ink-mute);
  font-size: 1.25rem;
}
.rowBadge {
  font-size: 0.7rem;
  padding: 2px 8px;
  background: var(--color-line);
  color: var(--color-ink-mute);
  border-radius: 999px;
}
.rowDisabled .rowLabel { color: var(--color-ink-mute); }

.semhanaCaption {
  font-size: 0.8rem;
  color: var(--color-ink-mute);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.logoutRow {
  color: var(--color-danger);
}
.logoutRow .rowLabel { color: var(--color-danger); }
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ProfilePage.jsx frontend/src/pages/ProfilePage.module.css
git commit -m "feat(m-mobile): ProfilePage — role-specific sections + 셈하나 card + admin dev tools"
```

---

### Task 19: ChatPlaceholderPage

**Files:**
- Modify: `frontend/src/pages/ChatPlaceholderPage.jsx`
- Create: `frontend/src/pages/ChatPlaceholderPage.module.css`

- [ ] **Step 1: Replace ChatPlaceholderPage.jsx entirely**

`frontend/src/pages/ChatPlaceholderPage.jsx`:

```jsx
import PageHeader from "../components/layout/PageHeader";
import styles from "./ChatPlaceholderPage.module.css";

export default function ChatPlaceholderPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="채팅" />
      <div className={styles.body}>
        <div className={styles.illustration} aria-hidden="true">💬</div>
        <h1 className={styles.title}>곧 출시됩니다</h1>
        <p className={styles.desc}>
          사장님과 알바생이 직접 연락할 수 있는 1:1 채팅 기능은 준비 중입니다.
          지금은 구인 상세 페이지의 정보를 참고해 직접 연락해주세요.
        </p>
        <button type="button" className={styles.notifyBtn} disabled title="M6에서 활성화 예정">
          🔔 출시 알림 받기 (준비 중)
        </button>
        <p className={styles.milestone}>마일스톤: M6</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatPlaceholderPage.module.css**

`frontend/src/pages/ChatPlaceholderPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 56px);
}
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--sp-7) var(--sp-5);
  gap: var(--sp-3);
}
.illustration {
  font-size: 4rem;
  margin-bottom: var(--sp-3);
  opacity: 0.6;
}
.title {
  font-size: 1.4rem;
  margin: 0;
}
.desc {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 320px;
}
.notifyBtn {
  margin-top: var(--sp-3);
  padding: var(--sp-3) var(--sp-5);
  background: var(--color-line);
  color: var(--color-ink-mute);
  border-radius: var(--radius-md);
  font-weight: 500;
}
.notifyBtn:disabled { cursor: not-allowed; }
.milestone {
  margin: var(--sp-2) 0 0;
  font-size: 0.75rem;
  color: var(--color-ink-mute);
}
```

- [ ] **Step 3: Smoke build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ChatPlaceholderPage.jsx frontend/src/pages/ChatPlaceholderPage.module.css
git commit -m "feat(m-mobile): ChatPlaceholderPage — M6 출시 안내 + disabled 알림 버튼"
```

---

## Phase 8 — Verification & docs

### Task 20: E2E manual smoke + docs update

**Files:** none modified — execution + docs only.

- [ ] **Step 1: Start backend (port 8001) and frontend (Vite)**

Two terminals:

```bash
# Terminal A
cd backend && uvicorn main:app --reload --port 8001
```

```bash
# Terminal B
cd frontend && npm run dev
```

Note Vite-printed port (usually 5173 or 5174 if 5173 occupied).

- [ ] **Step 2: Mobile width smoke (Chrome DevTools 390×844)**

Open DevTools → Toggle device toolbar → "Pixel 7" or custom 390×844. Visit each page and confirm no horizontal scroll, BottomNav fixed at bottom, PageHeader sticky:

- `/` Home — 위치 헤더, 내 동네 알바 3 카드, 공지 리스트
- `/jobs` Job list — 위치 헤더, 필터 아이콘, 카드 1열
- click a card → `/jobs/:id` — full-bleed hero, sticky 지원하기 bar above BottomNav
- `/jobs/new` (login as employer first) — single column form
- `/my/jobs` — card list
- `/community/notice` — 4 tabs at top, post list
- `/community/notice/:id` — single column post
- `/about`, `/services` — narrow content
- `/login` — single column, no BottomNav
- `/profile` — sections, 셈하나 card visible only for employer
- `/chat` — placeholder
- `/mobile-preview` — accessible from ProfilePage admin section

- [ ] **Step 3: Desktop width smoke (1440×900)**

Disable device toolbar (back to desktop). Visit `/`. Confirm:
- 3-column layout: left brand panel, center 440px column, right QR + 셈하나 card
- BottomNav still pinned bottom-center within 440px
- Footer rendered inside center column

- [ ] **Step 4: Role-conditional behavior**

- Logout → register a new user (`testalba1`) with role `알바생`. Verify BottomNav has 4 tabs, no FAB. Profile shows 활동 section with disabled rows. No 셈하나 card.
- Logout → register `testboss1` with role `사장님`. Verify BottomNav has 4 tabs **+ center FAB ➕**. Click FAB → goes to `/jobs/new`. Profile shows 사업장 row + 셈하나 card.
- Login as `admin` (existing). Verify FAB visible, ProfilePage shows admin developer tools section.

- [ ] **Step 5: PWA install check**

Chrome DevTools → Application → Manifest. Verify "SodamJobs" / theme `#d04a2a` / 3 icons listed.
Lighthouse → Run audit on Mobile + PWA category. "Web app manifest meets the installability requirements" should be green.
Optional: Click address bar install icon → verify installable. Launches in standalone window with no address bar.

- [ ] **Step 6: 셈하나 cross-promo**

- ProfilePage as employer → 셈하나 card visible → click → opens `https://sodamfn.twinverse.org` in new tab.
- MyJobsPage as employer with no posted jobs → 셈하나 hint shown beneath empty state.
- After posting a job → navigate back to `/my/jobs` → hint is gone (jobs > 0).
- Footer (any page): "함께 보기: 셈하나" link clickable, opens new tab.

- [ ] **Step 7: Admin pages quick check (known-limited)**

`/admin`, `/admin/users`, `/admin/boards`, `/admin/docs/dev-plan`, `/admin/skills`, `/admin/plugins` — each loads in 440px shell. Tables overflow with horizontal scroll. Acceptable per spec (admin is desktop-primary, future cycle to extract).

- [ ] **Step 8: Update docs**

Append to `docs/work-log.md`:

```markdown

## 2026-04-26 — M-Mobile (Mobile-first 재설계) 구현

- 모바일 셸 + BottomNav + 페이지별 PageHeader 패턴 도입
- 9 소비자 페이지 + 신규 ProfilePage / ChatPlaceholderPage
- PWA basic (manifest + 3 icons)
- 백엔드 PUT /api/auth/me + POST /api/auth/me/password
- 셈하나(SodamFN) 크로스프로모 3곳 (ProfilePage 카드 + MyJobsPage 빈상태 + Footer)
- TopBar 삭제, MainLayout → MobileShell 교체
- admin 페이지는 데스크탑 레이아웃 유지(좁은 셸 안에서 가로 스크롤) — 다음 사이클에서 분리 검토
```

Append to `docs/upgrade-log.md`:

```markdown
| 2026-04-26 | M-Mobile — 모바일 퍼스트 재설계 (MobileShell + BottomNav + PageHeader + 9 페이지 재작성 + ProfilePage/ChatPlaceholder 신설 + PWA basic + 셈하나 크로스프로모) | feat | frontend/src/components/layout/*, frontend/src/pages/* |
| 2026-04-26 | 백엔드 /api/auth/me PUT + POST /me/password | feat | backend/routers/auth.py |
```

Update `docs/dev-plan.md` — replace the milestone row for M-Mobile (insert before M4b):

```markdown
| M-Mobile | 모바일 퍼스트 재설계 (셸/BottomNav/PageHeader/PWA basic) | 완료 |
| M4b | Application 상태 머신 + 마이페이지 | 예정 |
```

If "다음 단계" section exists, update to point at M4b.

- [ ] **Step 9: Commit doc updates**

```bash
git add docs/work-log.md docs/upgrade-log.md docs/dev-plan.md
git commit -m "docs(m-mobile): work-log/upgrade-log/dev-plan — M-Mobile 완료"
```

- [ ] **Step 10: Final build sanity**

```bash
cd frontend && npm run build 2>&1 | tail -5
cd ../backend && python -c "import main; print('OK')"
```

Expected: frontend clean build, backend `OK`.

- [ ] **Step 11: Push (ask user)**

Per project pattern, do not push without explicit user authorization. Stop here, summarize what's ready, and ask the user if they want to push.

```bash
git log --oneline -25
git status
```

Expected: working tree clean, ~20 new commits ready to push.

---

## Plan completion summary

After all 20 tasks:
- Mobile-first shell (MobileShell + BottomNav + PageHeader + DesktopSidePanel + Footer) live across all routes
- TopBar deleted
- 9 consumer pages re-laid for mobile widths
- ProfilePage + ChatPlaceholderPage shipped
- PWA basic (manifest + icons + meta)
- Backend `/me` PUT + password change
- 셈하나 cross-promo placed in ProfilePage card + MyJobsPage empty hint + Footer sister-link
- Admin pages remain in desktop layout, displayed inside 440px shell (known limitation, deferred to future cycle)

Next milestones: **M4b** (Application 상태 머신 + 마이페이지 — now mobile-ready from start), then **M4c** (Review system).
