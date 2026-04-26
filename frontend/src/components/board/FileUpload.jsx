import { useState } from "react";
import api from "../../services/api";
import styles from "./FileUpload.module.css";

export default function FileUpload({ postId, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post(`/api/files/upload?post_id=${postId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded?.(data);
    } catch (err) {
      setError(err.response?.data?.detail || "업로드 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className={styles.wrap}>
      <label className={styles.btn}>
        {uploading ? "업로드 중..." : "파일 첨부"}
        <input type="file" onChange={handleChange} disabled={uploading} hidden />
      </label>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
