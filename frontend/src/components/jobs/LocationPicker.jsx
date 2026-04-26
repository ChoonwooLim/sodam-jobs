import { useState } from "react";
import styles from "./LocationPicker.module.css";

const LS_KEY = "userLocation";

export function getSavedLocation() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data?.lat === "number" && typeof data?.lng === "number") return data;
  } catch (_) { /* fallthrough */ }
  return null;
}

export function saveLocation(loc) {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...loc, savedAt: Date.now() }));
}

export function clearLocation() {
  localStorage.removeItem(LS_KEY);
}

export default function LocationPicker({ initial, onSave, onClose }) {
  const start = initial || getSavedLocation() || {};
  const [lat, setLat] = useState(start.lat ?? "");
  const [lng, setLng] = useState(start.lng ?? "");
  const [neighborhood, setNeighborhood] = useState(start.neighborhood ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const useCurrent = () => {
    if (!navigator.geolocation) {
      setError("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
      return;
    }
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        setError(`위치 가져오기 실패: ${err.message}`);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!isFinite(latNum) || latNum < -90 || latNum > 90) {
      setError("위도는 -90 ~ 90 범위의 숫자여야 합니다.");
      return;
    }
    if (!isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      setError("경도는 -180 ~ 180 범위의 숫자여야 합니다.");
      return;
    }
    const loc = { lat: latNum, lng: lngNum, neighborhood: neighborhood || null };
    saveLocation(loc);
    onSave?.(loc);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>내 위치 설정</h2>
        <p className={styles.help}>
          가까운 알바를 보려면 위치가 필요합니다. 현재 위치 버튼을 누르거나 직접 좌표를 입력하세요.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <button type="button" onClick={useCurrent} disabled={busy} className={styles.geoBtn}>
            {busy ? "가져오는 중..." : "📍 현재 위치 사용"}
          </button>

          <label className={styles.field}>
            <span>위도 (lat)</span>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="37.5012"
              required
            />
          </label>
          <label className={styles.field}>
            <span>경도 (lng)</span>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="127.0396"
              required
            />
          </label>
          <label className={styles.field}>
            <span>동네 이름 (선택)</span>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="강남구 역삼동"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancel}>취소</button>
            <button type="submit" className={styles.save}>저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}
