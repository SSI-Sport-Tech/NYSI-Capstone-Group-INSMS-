"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, BookOpen } from "lucide-react";
import {
  getTabs,
  removeTab,
  type SupplementTab,
  TABS_EVENT,
} from "@/utils/supplementTabs";

interface SupplementTabBarProps {
  /** "library" when on the library page, supplement uuid when on a detail page */
  activeId: string;
}

export default function SupplementTabBar({ activeId }: SupplementTabBarProps) {
  const router = useRouter();
  const [tabs, setTabs] = useState<SupplementTab[]>([]);

  useEffect(() => {
    setTabs(getTabs());
    const refresh = () => setTabs(getTabs());
    window.addEventListener(TABS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TABS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [activeId]);

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    removeTab(tabId);
    if (tabId === activeId) {
      const remaining = getTabs();
      const prev = remaining[remaining.length - 1];
      router.push(prev ? `/SSS/supplements/${prev.id}` : "/SSS/library");
    }
  };

  return (
    <div className="relative z-[60] bg-white border-b border-gray-200 px-6 flex items-center gap-0 overflow-x-auto shrink-0">
      {/* Pinned: Supplement Library */}
      <div
        onClick={() => router.push("/SSS/library")}
        className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 shrink-0 cursor-pointer transition-colors ${
          activeId === "library"
            ? "border-blue-500 text-blue-700 font-medium"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span>Supplement Library</span>
      </div>

      {/* Open supplement tabs */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <div
            key={tab.id}
            className={`flex items-center gap-1 px-3 py-2.5 text-sm border-b-2 shrink-0 transition-colors ${
              isActive
                ? "border-blue-500 text-blue-700 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700 cursor-pointer"
            }`}
          >
            <button
              onClick={() => !isActive && router.push(`/SSS/supplements/${tab.id}`)}
              className="max-w-[160px] truncate text-left"
            >
              {tab.name}
            </button>
            <button
              onClick={(e) => handleClose(e, tab.id)}
              className="text-gray-300 hover:text-gray-600 ml-1 transition-colors"
              aria-label={`Close ${tab.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
