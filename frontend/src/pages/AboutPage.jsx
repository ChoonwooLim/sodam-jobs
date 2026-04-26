import styles from "./AboutPage.module.css";

export default function AboutPage() {
  return (
    <div className={styles.about}>
      <h1 className={styles.title}>회사소개</h1>
      <section className={styles.section}>
        <h2>비전</h2>
        <p>SodamJobs는 동네 단위 단기 알바 시장을 더 안전하고 투명하게 만들어, 사장님과 알바생 모두가 신뢰할 수 있는 직거래 플랫폼을 지향합니다.</p>
      </section>
      <section className={styles.section}>
        <h2>미션</h2>
        <p>거리·평판·인증 데이터를 결합해 가장 적합한 매칭을 빠르게 제공하고, 복잡한 이력서 대신 3줄 자기소개로 즉시 대화를 시작할 수 있게 합니다.</p>
      </section>
      <section className={styles.section}>
        <h2>팀</h2>
        <p>현장 경험을 가진 운영진과 엔지니어, 디자이너로 구성된 작은 팀입니다.</p>
      </section>
      <section className={styles.section}>
        <h2>연혁</h2>
        <ul className={styles.timeline}>
          <li><strong>2026</strong> — SodamJobs 프로젝트 시작</li>
          <li><strong>2026</strong> — MVP 런칭 (서울/경기)</li>
        </ul>
      </section>
    </div>
  );
}
