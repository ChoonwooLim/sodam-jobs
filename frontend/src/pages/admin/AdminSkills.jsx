import { useState, useEffect } from "react";
import api from "../../services/api";
import styles from "./AdminSkills.module.css";

export default function AdminSkills() {
  const [skills, setSkills] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get("/api/skills/list").then((r) => setSkills(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/api/skills/${selected}`).then((r) => setDetail(r.data)).catch(() => setDetail(null));
  }, [selected]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>AI 스킬</h1>
      <p className={styles.subtitle}>{`.claude/skills/`} 디렉토리에 등록된 스킬 {skills.length}개</p>

      <div className={styles.layout}>
        <ul className={styles.list}>
          {skills.map((s) => (
            <li key={s.key}>
              <button
                className={`${styles.skillBtn} ${selected === s.key ? styles.active : ""}`}
                onClick={() => setSelected(s.key)}
              >
                <span className={styles.skillName}>{s.name}</span>
                <span className={styles.skillDesc}>{s.description}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.detail}>
          {detail ? (
            <>
              <h2>{detail.name}</h2>
              <p className={styles.detailDesc}>{detail.description}</p>
              <pre className={styles.body}>{detail.body}</pre>
            </>
          ) : (
            <p className={styles.hint}>왼쪽에서 스킬을 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
