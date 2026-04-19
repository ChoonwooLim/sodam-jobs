"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function Profile() {
  const [bio, setBio] = useState("안녕하세요! 역삼동 근처에서 주말 아르바이트를 구하고 있습니다. 카페나 식당 서빙 경험 1년 있습니다. 성실하게 일하겠습니다!");

  return (
    <div className="flex flex-col min-h-screen bg-surface dark:bg-surface-dark">
      {/* Local Header (Overriding global header style for Profile view) */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 bg-surface dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-xl font-bold">나의 당근.. 아니 소담 프로필</h1>
      </header>

      <main className="flex-1 flex flex-col p-5 gap-8 bg-gray-50 dark:bg-black">
        {/* Profile Card */}
        <div className="bg-surface dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-2xl">
            김
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">김소담</h2>
            <p className="text-sm text-gray-500">강남구 역삼동 · 인증 완료</p>
          </div>
        </div>

        {/* 3-Line Bio Editor */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">3줄 자기소개</h3>
            <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">가장 중요해요!</span>
          </div>
          <div className="relative">
            <textarea
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none h-32"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="사장님께 어필할 자기소개를 3줄로 짧게 적어보세요."
              maxLength={150}
            />
            <div className="absolute bottom-3 right-4 text-xs text-gray-400">
              {bio.length} / 150
            </div>
          </div>
          <p className="text-xs text-gray-500 ml-1">
            복잡한 이력서 없이 이 3줄 요약만으로 사장님과 대화를 시작할 수 있습니다.
          </p>
        </div>

        {/* Save Button */}
        <button className="w-full h-14 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl mt-4 transition-colors">
          프로필 저장하기
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
