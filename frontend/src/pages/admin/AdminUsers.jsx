import { useState, useEffect } from "react";
import api from "../../services/api";
import styles from "./AdminUsers.module.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const isSuperadmin = currentUser?.role === "superadmin";

  const load = () => {
    api.get("/api/admin/users")
      .then((r) => setUsers(r.data))
      .catch((err) => setError(err.response?.data?.detail || "사용자 목록을 불러올 수 없습니다."));
  };

  useEffect(() => { load(); }, []);

  const updateRole = async (id, role) => {
    try {
      await api.put(`/api/admin/users/${id}/role`, { role });
      load();
    } catch (err) {
      alert(err.response?.data?.detail || "권한 변경 실패");
    }
  };

  const toggleActive = async (id, is_active) => {
    await api.put(`/api/admin/users/${id}/active`, { is_active: !is_active });
    load();
  };

  if (error) return <div className={styles.page}><p>{error}</p></div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>사용자 관리</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th><th>Username</th><th>Email</th><th>역할</th><th>활성</th><th>가입일</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  {isSuperadmin && <option value="superadmin">superadmin</option>}
                </select>
              </td>
              <td>
                <button
                  className={`${styles.toggle} ${u.is_active ? styles.on : styles.off}`}
                  onClick={() => toggleActive(u.id, u.is_active)}
                >
                  {u.is_active ? "활성" : "비활성"}
                </button>
              </td>
              <td>{new Date(u.created_at).toLocaleDateString("ko-KR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
