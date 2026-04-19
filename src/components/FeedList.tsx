import Image from "next/image";
import Link from "next/link";

const dummyJobs = [
  {
    id: 1,
    title: "소담김밥 역삼점 홀서빙 급구",
    company: "소담김밥",
    location: "강남구 역삼동 · 300m",
    payType: "시급",
    payAmount: "12,000원",
    time: "32분 전",
    imageUrl: "/placeholder1.jpg",
    isSodamVerified: true,
  },
  {
    id: 2,
    title: "역삼 카페 아르바이트생 구합니다",
    company: "카페 르카페",
    location: "서초구 서초동 · 1.2km",
    payType: "시급",
    payAmount: "10,500원",
    time: "1시간 전",
    imageUrl: "/placeholder2.jpg",
    isSodamVerified: false,
  },
  {
    id: 3,
    title: "편의점 주말 야간 구해요",
    company: "CU 역삼본점",
    location: "강남구 역삼동 · 500m",
    payType: "월급",
    payAmount: "2,500,000원",
    time: "2시간 전",
    imageUrl: "/placeholder3.jpg",
    isSodamVerified: true,
  },
];

export default function FeedList() {
  return (
    <div className="flex flex-col gap-0.5 bg-gray-100 dark:bg-gray-900 pb-20">
      {/* Category Tabs */}
      <div className="flex px-4 py-3 gap-2 overflow-x-auto whitespace-nowrap bg-surface dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 scrollbar-hide">
        <button className="px-4 py-1.5 bg-gray-900 text-white dark:bg-white dark:text-black rounded-full text-sm font-bold">인기(서울/경기)</button>
        <button className="px-4 py-1.5 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium">단기알바</button>
        <button className="px-4 py-1.5 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium">홀서빙</button>
        <button className="px-4 py-1.5 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium">편의점</button>
      </div>

      {/* Feed Items */}
      <div className="flex flex-col bg-surface dark:bg-surface-dark divide-y divide-gray-100 dark:divide-gray-800">
        {dummyJobs.map((job) => (
          <Link href={`/jobs/${job.id}`} key={job.id} className="flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center">
              {/* placeholder image icon */}
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="flex flex-col justify-between py-0.5 flex-1 w-0">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">{job.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="truncate">{job.company}</span>
                  <span>·</span>
                  <span>{job.location}</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-gray-900 dark:text-white">{job.payType}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{job.payAmount}</span>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  {job.isSodamVerified ? (
                     <div className="flex items-center gap-1 bg-secondary/10 px-1.5 py-0.5 rounded text-[10px] text-secondary-dark dark:text-secondary-light font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>소담 안심식당</span>
                     </div>
                  ) : <div />}
                  <span className="text-[11px] text-gray-400">{job.time}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Floating Action Button for Job Registration */}
      <button className="fixed bottom-20 right-4 sm:right-[calc(50%-18rem)] sm:-mr-4 md:-mr-0 md:right-[calc(50%-22rem)] z-20 bg-primary hover:bg-primary-dark text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
