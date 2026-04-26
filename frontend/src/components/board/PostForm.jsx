import { useState } from "react";
import styles from "./PostForm.module.css";

export default function PostForm({ initial = {}, boardType, onSubmit, onCancel, isAdmin }) {
  const [title, setTitle] = useState(initial.title || "");
  const [content, setContent] = useState(initial.content || "");
  const [videoUrl, setVideoUrl] = useState(initial.video_url || "");
  const [isPinned, setIsPinned] = useState(initial.is_pinned || false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ title, content, video_url: videoUrl || null, is_pinned: isPinned });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label>제목</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      {boardType === "video" && (
        <div className={styles.field}>
          <label>비디오 URL</label>
          <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/..." />
        </div>
      )}

      <div className={styles.field}>
        <label>본문 (Markdown)</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={15} />
      </div>

      {isAdmin && (
        <div className={styles.fieldRow}>
          <label>
            <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} /> 상단 고정
          </label>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" onClick={onCancel} className={styles.btn}>취소</button>
        <button type="submit" disabled={submitting} className={`${styles.btn} ${styles.primary}`}>
          {submitting ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
