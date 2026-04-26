import styles from "./ServicesPage.module.css";

const SERVICES = [
  { title: "지역 기반 매칭", desc: "GPS 기반으로 가까운 알바 자리만 보여주고, 거리 표시로 출퇴근 부담을 미리 가늠할 수 있습니다.", features: ["거리 표시", "동네 카테고리", "지도 뷰"] },
  { title: "안심 사업장 인증", desc: "SodamFN 검증을 통과한 사업장에만 안심 배지를 부여해 안전한 근로 환경을 보장합니다.", features: ["사업자 검증", "리뷰 시스템", "근로계약서 템플릿"] },
  { title: "3줄 자기소개 매칭", desc: "복잡한 이력서 없이 자기소개 3줄만으로 사장님과 즉시 대화를 시작할 수 있습니다.", features: ["빠른 지원", "실시간 채팅", "프로필 검증"] },
  { title: "사장님 도구", desc: "구인 등록부터 지원자 관리, 근로 일정 관리까지 한 곳에서 처리할 수 있습니다.", features: ["구인 등록", "지원자 관리", "근로 스케줄"] },
];

export default function ServicesPage() {
  return (
    <div className={styles.services}>
      <h1 className={styles.title}>서비스</h1>
      <p className={styles.intro}>SodamJobs는 동네 단위 단기 알바 매칭에 집중한 직거래 플랫폼입니다.</p>
      <div className={styles.grid}>
        {SERVICES.map((s) => (
          <div key={s.title} className={styles.card}>
            <h2 className={styles.cardTitle}>{s.title}</h2>
            <p className={styles.cardDesc}>{s.desc}</p>
            <ul className={styles.features}>{s.features.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}
