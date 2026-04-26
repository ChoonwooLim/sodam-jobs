import { useState, useEffect } from "react";
import api from "../../services/api";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/admin/stats")
      .then((r) => setStats(r.data))
      .catch((err) => setError(err.response?.data?.detail || "통계를 불러올 수 없습니다."));
  }, []);

  if (error) return <div className={styles.page}><p className={styles.error}>{error}</p></div>;
  if (!stats) return <div className={styles.page}>로딩 중...</div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>관리자 대시보드</h1>
      <p className={styles.welcome}>안녕하세요, <strong>{stats.admin}</strong>님</p>
      <div className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>전체 사용자</span>
          <span className={styles.cardValue}>{stats.total_users}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>활성 사용자</span>
          <span className={styles.cardValue}>{stats.active_users}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>전체 게시글</span>
          <span className={styles.cardValue}>{stats.total_posts}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>전체 댓글</span>
          <span className={styles.cardValue}>{stats.total_comments}</span>
        </div>
      </div>
    </div>
  );
}
