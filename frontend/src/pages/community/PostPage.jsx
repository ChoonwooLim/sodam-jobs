import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import PostDetail from "../../components/board/PostDetail";
import PostForm from "../../components/board/PostForm";
import CommentSection from "../../components/board/CommentSection";
import FileUpload from "../../components/board/FileUpload";
import styles from "./PostPage.module.css";

export default function PostPage() {
  const { boardType, postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.pathname.endsWith("/edit");

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const load = () => {
    setLoading(true);
    api.get(`/api/boards/${boardType}/${postId}`)
      .then((r) => setPost(r.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [boardType, postId]);

  const handleUpdate = async (data) => {
    await api.put(`/api/boards/${boardType}/${postId}`, data);
    navigate(`/community/${boardType}/${postId}`);
    load();
  };

  const handleDelete = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    await api.delete(`/api/boards/${boardType}/${postId}`);
    navigate(`/community/${boardType}`);
  };

  if (loading) return <div className={styles.page}>로딩 중...</div>;
  if (!post) return <div className={styles.page}>게시글을 찾을 수 없습니다.</div>;

  if (isEdit) {
    return (
      <div className={styles.page}>
        <h2 className={styles.editHeading}>게시글 수정</h2>
        <PostForm
          initial={post}
          boardType={boardType}
          isAdmin={isAdmin}
          onSubmit={handleUpdate}
          onCancel={() => navigate(`/community/${boardType}/${postId}`)}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PostDetail post={post} boardType={boardType} currentUser={user} onDelete={handleDelete} />
      {user && (post.author_id === user.id || isAdmin) && (
        <FileUpload postId={post.id} onUploaded={() => load()} />
      )}
      <CommentSection postId={post.id} currentUser={user} />
    </div>
  );
}
