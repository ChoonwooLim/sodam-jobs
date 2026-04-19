import Link from "next/link";

export default function JobDetail({ params }: { params: { id: string } }) {
  // Mock data for MVP
  const job = {
    id: params.id,
    title: "소담김밥 역삼점 홀서빙 급구",
    company: "소담김밥 역삼점",
    location: "강남구 역삼동 · 300m",
    payType: "시급",
    payAmount: "12,000원",
    time: "32분 전",
    views: 124,
    description: "새로 오픈한 소담김밥 역삼점에서 밝고 성실한 홀서빙 아르바이트생을 구합니다.\n\n[근무 조건]\n- 근무일: 주 3일 (월, 수, 금)\n- 근무시간: 10:00 ~ 14:00 (점심시간 포함)\n- 급여: 시급 12,000원 (주휴수당 별도)\n\n[우대 사항]\n- 인근 거주자 우대\n- 식당 서빙 경험자 우대\n- 장기 근무 가능자 환영\n\n식비 제공되며, 직원 휴게실 완비되어 있습니다. 편하게 지원해 주세요!",
    isSodamVerified: true,
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface dark:bg-surface-dark pb-24">
      {/* Header Back Button */}
      <header className="sticky top-0 z-10 flex items-center h-14 px-4 bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-md">
        <Link href="/" className="p-2 -ml-2 text-gray-800 dark:text-gray-200">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </header>

      {/* Hero Image */}
      <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 flex items-center justify-center relative">
        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-5 gap-6">
        <div className="flex flex-col gap-2">
          {job.isSodamVerified && (
            <div className="flex items-center gap-1.5 bg-secondary/10 px-2 py-1 rounded w-fit text-xs text-secondary-dark font-bold">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <span>SodamFN 안심 근로 사업장</span>
            </div>
          )}
          
          <h1 className="text-2xl font-bold leading-tight mt-1">{job.title}</h1>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-2 text-lg">
              <span className="font-bold text-gray-900 dark:text-white">{job.payType}</span>
              <span className="font-bold text-gray-900 dark:text-white">{job.payAmount}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
               <span>{job.company}</span>
               <span>·</span>
               <span>{job.location}</span>
               <span>·</span>
               <span>{job.time}</span>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 dark:bg-gray-800" />
        
        {/* Description */}
        <div className="text-base leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-300">
          {job.description}
        </div>
        
        {/* Stats */}
        <div className="text-xs text-gray-400 mt-4">
          조회 {job.views}
        </div>
      </main>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800 p-4 pb-safe-4 flex gap-3 z-20">
        <button className="flex items-center justify-center w-14 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        <button className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-lg transition-colors">
          지원하기
        </button>
      </div>
    </div>
  );
}
