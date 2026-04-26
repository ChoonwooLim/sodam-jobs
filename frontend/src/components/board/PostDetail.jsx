import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./PostDetail.module.css";

export default function PostDetail({ post, boardType, currentUser, onDelete }) {
  const canEdit = currentUser && (currentUser.id === post.author_id || currentUser.role === "admin" || currentUser.role === "superadmin");

  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {post.is_pinned && <span className={styles.badge}>공지</span>}
          {post.title}
        </h1>
        <div className={styles.meta}>
          <span>{post.author}</span>
          <span>·</span>
          <span>{new Date(post.created_at).toLocaleString("ko-KR")}</span>
          <span>·</span>
          <span>조회 {post.view_count}</span>
        </div>
      </header>

      {post.video_url && (
        <div className={styles.video}>
          <iframe src={post.video_url} title={post.title} allowFullScreen />
        </div>
      )}

      {post.files && post.files.length > 0 && (
        <div className={styles.files}>
          {post.files.filter(f => f.file_type === "image").map((f) => (
            <img key={f.id} src={f.stored_path} alt={f.original_name} className={styles.image} />
          ))}
          {post.files.filter(f => f.file_type !== "image").map((f) => (
            <a key={f.id} href={f.stored_path} className={styles.fileLink} download>
              📎 {f.original_name} ({Math.round(f.file_size / 1024)} KB)
            </a>
          ))}
        </div>
      )}

      <div className={styles.content}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>

      <div className={styles.actions}>
        <Link to={`/community/${boardType}`} className={styles.btn}>목록</Link>
        {canEdit && (
          <>
            <Link to={`/community/${boardType}/${post.id}/edit`} className={styles.btn}>수정</Link>
            <button onClick={onDelete} className={`${styles.btn} ${styles.danger}`}>삭제</button>
          </>
        )}
      </div>
    </article>
  );
}
