import { useState } from "react";
import styles from "./MobilePreviewPage.module.css";

const QUICK_PATHS = [
  { label: "홈", path: "/" },
  { label: "알바 목록", path: "/jobs" },
  { label: "회사소개", path: "/about" },
  { label: "서비스", path: "/services" },
  { label: "로그인", path: "/login" },
  { label: "공지사항", path: "/community/notice" },
];

const DEVICES = {
  phone: { label: "스마트폰", width: 390, height: 844 },
  tablet: { label: "태블릿", width: 820, height: 1180 },
};

export default function MobilePreviewPage() {
  const [path, setPath] = useState("/");
  const [device, setDevice] = useState("phone");
  const [iframeKey, setIframeKey] = useState(0);

  const reload = () => setIframeKey((k) => k + 1);

  const safe = path === "/mobile-preview" ? "/" : path;
  const src = `${window.location.origin}${safe.startsWith("/") ? safe : "/" + safe}`;
  const dim = DEVICES[device];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>모바일 미리보기</h1>
          <p className={styles.sub}>실제 SodamJobs 사이트를 폰 프레임 안에서 봅니다.</p>
        </div>

        <div className={styles.deviceToggle}>
          {Object.entries(DEVICES).map(([key, info]) => (
            <button
              key={key}
              type="button"
              className={`${styles.deviceBtn} ${device === key ? styles.deviceBtnActive : ""}`}
              onClick={() => setDevice(key)}
            >
              {info.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.urlBar}>
          <span className={styles.origin}>{window.location.origin}</span>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            className={styles.pathInput}
            placeholder="/"
          />
          <button type="button" onClick={reload} className={styles.reloadBtn}>새로고침</button>
        </div>

        <div className={styles.quickRow}>
          {QUICK_PATHS.map((q) => (
            <button
              key={q.path}
              type="button"
              className={`${styles.quickBtn} ${path === q.path ? styles.quickBtnActive : ""}`}
              onClick={() => setPath(q.path)}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.stage}>
        <div
          className={`${styles.frame} ${device === "phone" ? styles.framePhone : styles.frameTablet}`}
          style={{ width: dim.width, height: dim.height }}
        >
          <div className={styles.notch} aria-hidden="true" />
          <iframe
            key={iframeKey}
            src={src}
            title="SodamJobs mobile preview"
            className={styles.iframe}
            referrerPolicy="same-origin"
          />
        </div>
        <p className={styles.hint}>
          {dim.width}×{dim.height} · iframe src: <code>{src}</code>
        </p>
      </div>
    </div>
  );
}
