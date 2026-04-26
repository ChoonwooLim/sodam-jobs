import { JOB_CATEGORIES, PAY_TYPES } from "../../lib/jobConstants";
import styles from "./JobFilters.module.css";

export default function JobFilters({ value, onChange }) {
  // value shape: { category, pay_type, pay_min, radius_km, q }
  const update = (patch) => onChange({ ...value, ...patch });

  return (
    <div className={styles.wrap}>
      <div className={styles.tabRow}>
        <button
          className={`${styles.tab} ${!value.category ? styles.tabActive : ""}`}
          onClick={() => update({ category: undefined })}
          type="button"
        >
          전체
        </button>
        {Object.entries(JOB_CATEGORIES).map(([key, label]) => (
          <button
            key={key}
            className={`${styles.tab} ${value.category === key ? styles.tabActive : ""}`}
            onClick={() => update({ category: key })}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.detailRow}>
        <label className={styles.field}>
          <span>급여</span>
          <select
            value={value.pay_type || ""}
            onChange={(e) => update({ pay_type: e.target.value || undefined })}
          >
            <option value="">전체</option>
            {Object.entries(PAY_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>최소 금액</span>
          <input
            type="number"
            min={0}
            step={1000}
            placeholder="예: 12000"
            value={value.pay_min ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              update({ pay_min: v === "" ? undefined : Number(v) });
            }}
          />
        </label>

        <label className={styles.field}>
          <span>반경</span>
          <select
            value={value.radius_km ?? 5}
            onChange={(e) => update({ radius_km: Number(e.target.value) })}
          >
            <option value={1}>1km</option>
            <option value={3}>3km</option>
            <option value={5}>5km</option>
            <option value={10}>10km</option>
            <option value={20}>20km</option>
          </select>
        </label>

        <label className={`${styles.field} ${styles.fieldGrow}`}>
          <span>검색</span>
          <input
            type="search"
            placeholder="제목/내용 검색"
            value={value.q || ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
          />
        </label>
      </div>
    </div>
  );
}
