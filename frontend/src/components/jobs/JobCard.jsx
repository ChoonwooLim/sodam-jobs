import { Link } from "react-router-dom";
import {
  JOB_CATEGORIES,
  PAY_TYPES,
  formatKRW,
  formatDistance,
} from "../../lib/jobConstants";
import styles from "./JobCard.module.css";

export default function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className={styles.card}>
      <div className={styles.thumb}>
        {job.thumbnail ? (
          <img src={job.thumbnail} alt={job.title} loading="lazy" />
        ) : (
          <div className={styles.thumbPlaceholder}>
            <span>{JOB_CATEGORIES[job.category] || "알바"}</span>
          </div>
        )}
        {job.is_verified && (
          <span className={styles.verifiedBadge} title="SodamFN 안심 사업장">
            안심
          </span>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{job.title}</h3>
        <div className={styles.metaRow}>
          <span>{job.business_name}</span>
          {job.distance_m != null && (
            <>
              <span className={styles.dot}>·</span>
              <span>{formatDistance(job.distance_m)}</span>
            </>
          )}
        </div>
        <div className={styles.payRow}>
          <span className={styles.payType}>{PAY_TYPES[job.pay_type] || job.pay_type}</span>
          <span className={styles.payAmount}>{formatKRW(job.pay_amount)}</span>
        </div>
        <div className={styles.tagRow}>
          <span className={styles.tag}>{JOB_CATEGORIES[job.category] || job.category}</span>
          {job.status !== "active" && (
            <span className={`${styles.tag} ${styles.tagMute}`}>마감</span>
          )}
        </div>
      </div>
    </Link>
  );
}
