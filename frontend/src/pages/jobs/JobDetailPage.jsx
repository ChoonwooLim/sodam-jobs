import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../../services/api";
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
    api.get(`/api/jobs/${id}`)
      .then((r) => setJob(r.data))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.page}>로딩 중...</div>;
  if (!job) return <div className={styles.page}>알바를 찾을 수 없습니다.</div>;

  const canEdit = user && (user.id === job.employer_id || user.role === "admin" || user.role === "superadmin");

  const handleDelete = async () => {
    if (!confirm("이 알바를 삭제하시겠습니까?")) return;
    await api.delete(`/api/jobs/${id}`);
    navigate("/jobs");
  };

  const images = job.images || [];

  return (
    <article className={styles.page}>
      {images.length > 0 ? (
        <div className={styles.gallery}>
          <img src={images[activeImage].stored_path} alt={job.title} className={styles.heroImage} />
          {images.length > 1 && (
            <div className={styles.thumbStrip}>
              {images.map((img, i) => (
                <button
                  key={img.id}
                  className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ""}`}
                  onClick={() => setActiveImage(i)}
                  type="button"
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

      <header className={styles.header}>
        {job.is_verified && (
          <span className={styles.verifiedBadge}>✓ SodamFN 안심 사업장</span>
        )}
        {job.status !== "active" && (
          <span className={styles.statusBadge}>{JOB_STATUS_LABELS[job.status] || job.status}</span>
        )}

        <h1 className={styles.title}>{job.title}</h1>

        <div className={styles.payRow}>
          <span className={styles.payType}>{PAY_TYPES[job.pay_type] || job.pay_type}</span>
          <span className={styles.payAmount}>{formatKRW(job.pay_amount)}</span>
        </div>

        <dl className={styles.info}>
          <dt>사업장</dt><dd>{job.business_name}</dd>
          <dt>주소</dt><dd>{job.address}</dd>
          <dt>카테고리</dt><dd>{JOB_CATEGORIES[job.category] || job.category}</dd>
          {job.starts_at && <><dt>근무 시작</dt><dd>{new Date(job.starts_at).toLocaleDateString("ko-KR")}</dd></>}
          {job.ends_at && <><dt>근무 종료</dt><dd>{new Date(job.ends_at).toLocaleDateString("ko-KR")}</dd></>}
        </dl>
      </header>

      <div className={styles.description}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.description || "_상세 설명이 없습니다._"}</ReactMarkdown>
      </div>

      <footer className={styles.footer}>
        <span className={styles.viewCount}>조회 {job.view_count}회</span>
        <div className={styles.actions}>
          <Link to="/jobs" className={styles.btn}>목록</Link>
          {canEdit && (
            <>
              <Link to={`/jobs/${id}/edit`} className={styles.btn}>수정</Link>
              <button onClick={handleDelete} className={`${styles.btn} ${styles.danger}`}>삭제</button>
            </>
          )}
          <button className={`${styles.btn} ${styles.primary}`} disabled title="M4b에서 활성화 예정">
            지원하기 (준비 중)
          </button>
        </div>
      </footer>
    </article>
  );
}
