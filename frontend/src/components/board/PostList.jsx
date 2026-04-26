import { Link } from "react-router-dom";
import styles from "./PostList.module.css";

export default function PostList({ boardType, posts, page, total, size, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className={styles.wrap}>
      {posts.length === 0 ? (
        <div className={styles.empty}>등록된 게시글이 없습니다.</div>
      ) : (
        <ul className={styles.list}>
          {posts.map((p) => (
            <li key={p.id} className={`${styles.item} ${p.is_pinned ? styles.pinned : ""}`}>
              <Link to={`/community/${boardType}/${p.id}`} className={styles.row}>
                <span className={styles.title}>
                  {p.is_pinned && <span className={styles.badge}>공지</span>}
                  {p.title}
                </span>
                <span className={styles.meta}>
                  <span>{p.author}</span>
                  <span>·</span>
                  <span>조회 {p.view_count}</span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleDateString("ko-KR")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.pagination}>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>이전</button>
        <span className={styles.pageInfo}>{page} / {totalPages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>다음</button>
      </div>
    </div>
  );
}
