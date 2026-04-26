import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import JobCard from "../components/jobs/JobCard";
import { getSavedLocation } from "../components/jobs/LocationPicker";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const [notices, setNotices] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [hasLocation] = useState(() => Boolean(getSavedLocation()));

  useEffect(() => {
    api.get("/api/boards/notice?size=3").then((r) => setNotices(r.data.items)).catch(() => {});
    api.get("/api/boards/qna?size=5").then((r) => setRecentPosts(r.data.items)).catch(() => {});
    const loc = getSavedLocation();
    const params = new URLSearchParams({ size: "3" });
    if (loc) {
      params.set("lat", loc.lat);
      params.set("lng", loc.lng);
      params.set("radius_km", "5");
    }
    api.get(`/api/jobs?${params.toString()}`)
      .then((r) => setJobs(r.data.items))
      .catch(() => {});
  }, []);

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>SodamJobs</h1>
        <p className={styles.heroSub}>지역 기반 단기 알바 직거래 플랫폼</p>
        <div className={styles.heroCta}>
          <Link to="/services" className={styles.primaryBtn}>서비스 알아보기</Link>
          <Link to="/about" className={styles.secondaryBtn}>회사 소개</Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {hasLocation ? "내 동네 알바" : "최신 알바"}
          </h2>
          <Link to="/jobs" className={styles.moreLink}>더보기</Link>
        </div>
        {jobs.length > 0 ? (
          <div className={styles.jobsPreview}>
            {jobs.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        ) : (
          <p className={styles.jobsEmpty}>
            {hasLocation
              ? "주변에 등록된 알바가 없습니다."
              : <><Link to="/jobs">내 위치를 설정</Link>하면 가까운 알바를 보여드립니다.</>}
          </p>
        )}
      </section>

      {notices.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>공지사항</h2>
            <Link to="/community/notice" className={styles.moreLink}>더보기</Link>
          </div>
          <ul className={styles.noticeList}>
            {notices.map((n) => (
              <li key={n.id}>
                <Link to={`/community/notice/${n.id}`} className={styles.noticeItem}>
                  <span className={styles.noticeTitle}>{n.title}</span>
                  <span className={styles.noticeDate}>{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentPosts.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>최신 Q&A</h2>
            <Link to="/community/qna" className={styles.moreLink}>더보기</Link>
          </div>
          <ul className={styles.postList}>
            {recentPosts.map((p) => (
              <li key={p.id}>
                <Link to={`/community/qna/${p.id}`} className={styles.postItem}>
                  <span>{p.title}</span>
                  <span className={styles.postMeta}>{p.author} | {new Date(p.created_at).toLocaleDateString("ko-KR")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>서비스</h2>
        <div className={styles.serviceGrid}>
          <div className={styles.serviceCard}><h3>지역 기반 매칭</h3><p>내 동네에서 가까운 알바를 한눈에 찾아드립니다</p></div>
          <div className={styles.serviceCard}><h3>안심 사업장 인증</h3><p>SodamFN 검증을 통과한 안심 근로 사업장만 노출</p></div>
          <div className={styles.serviceCard}><h3>3줄 자기소개</h3><p>복잡한 이력서 없이 바로 채팅으로 시작하세요</p></div>
        </div>
      </section>
    </div>
  );
}
