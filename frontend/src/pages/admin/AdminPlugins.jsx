import { useState, useEffect } from "react";
import api from "../../services/api";
import styles from "./AdminPlugins.module.css";

export default function AdminPlugins() {
  const [plugins, setPlugins] = useState([]);
  const [openKey, setOpenKey] = useState(null);

  const load = () => {
    api.get("/api/plugins/list").then((r) => setPlugins(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (key) => {
    if (!confirm(`플러그인 '${key}'을(를) 삭제하시겠습니까?`)) return;
    await api.delete(`/api/plugins/${key}`);
    load();
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>플러그인 관리</h1>
      <p className={styles.subtitle}>설치된 MCP 서버 {plugins.length}개</p>

      <div className={styles.list}>
        {plugins.map((p) => {
          const isOpen = openKey === p.key;
          return (
            <div key={p.key} className={`${styles.card} ${isOpen ? styles.cardOpen : ""}`}>
              <button className={styles.cardHeader} onClick={() => setOpenKey(isOpen ? null : p.key)}>
                <div>
                  <span className={styles.cardName}>{p.display_name}</span>
                  <span className={styles.cardKey}>{p.key}</span>
                </div>
                <span className={p.is_configured ? styles.badgeAuto : styles.badgeKey}>
                  {p.is_configured ? "준비됨" : "키 필요"}
                </span>
              </button>
              {isOpen && (
                <div className={styles.cardBody}>
                  <p>{p.description}</p>
                  {p.usage && <p className={styles.usage}>사용법: {p.usage}</p>}
                  {p.requires_key && (
                    <p className={styles.envKey}>
                      필수 환경변수: <code>{p.key_name}</code>
                    </p>
                  )}
                  <div className={styles.cmd}>
                    <code>{p.command} {p.args.join(" ")}</code>
                  </div>
                  <button onClick={() => handleRemove(p.key)} className={styles.removeBtn}>삭제</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
