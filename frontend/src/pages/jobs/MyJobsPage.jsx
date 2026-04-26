import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
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
    const next = job.status === "active" ? "closed" : "active";
    await api.put(`/api/jobs/${job.id}`, { status: next });
    load();
  };

  const handleDelete = async (job) => {
    if (!confirm(`"${job.title}" 알바를 삭제하시겠습니까?`)) return;
    await api.delete(`/api/jobs/${job.id}`);
    load();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>내가 등록한 알바</h1>
        <Link to="/jobs/new" className={styles.postBtn}>새 알바 등록</Link>
      </div>

      {loading ? (
        <p className={styles.empty}>불러오는 중...</p>
      ) : jobs.length === 0 ? (
        <p className={styles.empty}>등록한 알바가 없습니다.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>제목</th>
              <th>카테고리</th>
              <th>급여</th>
              <th>상태</th>
              <th>조회</th>
              <th>등록일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td><Link to={`/jobs/${j.id}`}>{j.title}</Link></td>
                <td>{JOB_CATEGORIES[j.category] || j.category}</td>
                <td>{PAY_TYPES[j.pay_type]} {formatKRW(j.pay_amount)}</td>
                <td>
                  <button
                    className={`${styles.statusBtn} ${j.status === "active" ? styles.statusOn : styles.statusOff}`}
                    onClick={() => toggleStatus(j)}
                  >
                    {JOB_STATUS_LABELS[j.status] || j.status}
                  </button>
                </td>
                <td>{j.view_count}</td>
                <td>{new Date(j.created_at).toLocaleDateString("ko-KR")}</td>
                <td className={styles.actionsCell}>
                  <Link to={`/jobs/${j.id}/edit`} className={styles.editLink}>수정</Link>
                  <button onClick={() => handleDelete(j)} className={styles.deleteBtn}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
