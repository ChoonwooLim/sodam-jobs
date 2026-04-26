import { useState, useEffect } from "react";
import api from "../../services/api";
import styles from "./CommentSection.module.css";

export default function CommentSection({ postId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get(`/api/comments/${postId}`).then((r) => setComments(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !currentUser) return;
    setLoading(true);
    try {
      await api.post(`/api/comments/${postId}`, { content });
      setContent("");
      load();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await api.delete(`/api/comments/${id}`);
    load();
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>댓글 {comments.length}</h3>

      <ul className={styles.list}>
        {comments.map((c) => {
          const canDelete = currentUser && (currentUser.id === c.author_id || currentUser.role === "admin" || currentUser.role === "superadmin");
          return (
            <li key={c.id} className={styles.item}>
              <div className={styles.meta}>
                <span className={styles.author}>{c.author}</span>
                <span className={styles.date}>{new Date(c.created_at).toLocaleString("ko-KR")}</span>
                {canDelete && <button onClick={() => handleDelete(c.id)} className={styles.deleteBtn}>삭제</button>}
              </div>
              <div className={styles.content}>{c.content}</div>
            </li>
          );
        })}
        {comments.length === 0 && <li className={styles.empty}>첫 댓글을 남겨보세요.</li>}
      </ul>

      {currentUser ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="댓글을 입력하세요..." rows={3} />
          <button type="submit" disabled={loading || !content.trim()}>등록</button>
        </form>
      ) : (
        <p className={styles.loginPrompt}>댓글을 작성하려면 로그인이 필요합니다.</p>
      )}
    </section>
  );
}
