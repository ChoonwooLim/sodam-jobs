import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import JobCard from "../../components/jobs/JobCard";
import JobFilters from "../../components/jobs/JobFilters";
import LocationPicker, { getSavedLocation } from "../../components/jobs/LocationPicker";
import styles from "./JobListPage.module.css";

export default function JobListPage() {
  const [location, setLocation] = useState(getSavedLocation());
  const [showPicker, setShowPicker] = useState(false);
  const [filters, setFilters] = useState({ radius_km: 5 });
  const [page, setPage] = useState(1);
  const size = 20;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const canPost = user && (user.role === "employer" || user.role === "admin" || user.role === "superadmin");

  // Auto-prompt picker once per session if no saved location
  useEffect(() => {
    if (!location && !sessionStorage.getItem("jobsLocationPromptShown")) {
      setShowPicker(true);
      sessionStorage.setItem("jobsLocationPromptShown", "1");
    }
  }, [location]);

  // Fetch list whenever inputs change
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

  // Reset to page 1 when filters or location change
  useEffect(() => { setPage(1); }, [filters, location]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>알바</h1>
          {location ? (
            <p className={styles.locationLine}>
              내 위치: {location.neighborhood || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
              {" "}
              <button className={styles.locLink} onClick={() => setShowPicker(true)}>변경</button>
            </p>
          ) : (
            <p className={styles.locationLine}>
              <button className={styles.locLink} onClick={() => setShowPicker(true)}>📍 내 위치 설정</button>
              {" "}— 거리 정렬을 사용하려면 위치가 필요합니다
            </p>
          )}
        </div>
        {canPost && (
          <Link to="/jobs/new" className={styles.postBtn}>알바 등록</Link>
        )}
      </div>

      <JobFilters value={filters} onChange={setFilters} />

      {loading ? (
        <p className={styles.empty}>불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>조건에 맞는 알바가 없습니다.</p>
      ) : (
        <div className={styles.grid}>
          {items.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      )}

      <div className={styles.pagination}>
        <button onClick={() => setPage(page - 1)} disabled={page <= 1}>이전</button>
        <span>{page} / {totalPages} (총 {total})</span>
        <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}>다음</button>
      </div>

      {showPicker && (
        <LocationPicker
          initial={location}
          onClose={() => setShowPicker(false)}
          onSave={(loc) => { setLocation(loc); setShowPicker(false); }}
        />
      )}
    </div>
  );
}
