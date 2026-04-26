import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import styles from "./AdminBoards.module.css";

export default function AdminBoards() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const size = 20;

  const load = () => {
    api.get(`/api/admin/posts?page=${page}&size=${size}`)
      .then((r) => { setPosts(r.data.items); setTotal(r.data.total); })
      .catch(() => {});
  };

  useEffect(() => { load(); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>게시판 관리</h1>
      <p className={styles.summary}>총 {total}개의 게시글</p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th><th>게시판</th><th>제목</th><th>작성자</th><th>조회</th><th>작성일</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.board_type}</td>
              <td><Link to={`/community/${p.board_type}/${p.id}`}>{p.title}</Link></td>
              <td>{p.author}</td>
              <td>{p.view_count}</td>
              <td>{new Date(p.created_at).toLocaleDateString("ko-KR")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.pagination}>
        <button onClick={() => setPage(page - 1)} disabled={page <= 1}>이전</button>
        <span>{page} / {totalPages}</span>
        <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}>다음</button>
      </div>
    </div>
  );
}
