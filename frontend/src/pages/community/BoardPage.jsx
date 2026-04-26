import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import PostList from "../../components/board/PostList";
import PostForm from "../../components/board/PostForm";
import styles from "./BoardPage.module.css";

const BOARD_TITLES = {
  notice: "공지사항",
  qna: "Q&A",
  gallery: "이미지 갤러리",
  video: "동영상",
};

export default function BoardPage() {
  const { boardType } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [size] = useState(20);
  const [showForm, setShowForm] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isLoggedIn = !!user;
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const canPost = boardType === "notice" ? isAdmin : isLoggedIn;

  const load = () => {
    api.get(`/api/boards/${boardType}?page=${page}&size=${size}`)
      .then((r) => { setPosts(r.data.items); setTotal(r.data.total); })
      .catch(() => {});
  };

  useEffect(() => { setPage(1); }, [boardType]);
  useEffect(() => { load(); }, [boardType, page]);

  const handleCreate = async (data) => {
    const res = await api.post(`/api/boards/${boardType}`, data);
    setShowForm(false);
    navigate(`/community/${boardType}/${res.data.id}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{BOARD_TITLES[boardType] || boardType}</h1>
        {canPost && !showForm && (
          <button className={styles.writeBtn} onClick={() => setShowForm(true)}>글쓰기</button>
        )}
      </div>

      {showForm ? (
        <PostForm
          boardType={boardType}
          isAdmin={isAdmin}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <PostList
          boardType={boardType}
          posts={posts}
          page={page}
          total={total}
          size={size}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
