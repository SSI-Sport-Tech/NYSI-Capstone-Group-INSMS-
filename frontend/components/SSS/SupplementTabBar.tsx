"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  getTabs,
  removeTab,
  type SupplementTab,
  TABS_EVENT,
} from "@/utils/supplementTabs";

interface SupplementTabBarProps {
  /**
   * "library" | "inventory" | "web-scraper" | "batch-testing"
   * or a supplement UUID when on a detail page
   */
  activeId: string;
}

const SSS_SECTIONS = [
  { id: "library",       label: "Supplement Library", href: "/SSS/library" },
  { id: "inventory",     label: "Inventory",          href: "/SSS/inventory" },
  { id: "web-scraper",   label: "Web Scraper",        href: "/SSS/web-scraper" },
  { id: "batch-testing", label: "Batch Testing",      href: "/SSS/batch-testing" },
];

export default function SupplementTabBar({ activeId }: SupplementTabBarProps) {
  const router = useRouter();
  const [supplementTabs, setSupplementTabs] = useState<SupplementTab[]>([]);

  useEffect(() => {
    setSupplementTabs(getTabs());
    const refresh = () => setSupplementTabs(getTabs());
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

  const sectionIsActive = SSS_SECTIONS.some((s) => s.id === activeId);

  return (
    <div className="relative z-[90] bg-white border-b border-gray-200 px-6 flex items-center overflow-x-auto shrink-0">
      {/* Always-visible SSS section tabs */}
      {SSS_SECTIONS.map((section) => (
        <div
          key={section.id}
          onClick={() => activeId !== section.id && router.push(section.href)}
          className={`px-4 py-2.5 text-sm border-b-2 shrink-0 transition-colors whitespace-nowrap ${
            activeId === section.id
              ? "border-blue-500 text-blue-700 font-medium cursor-default"
              : "border-transparent text-gray-500 hover:text-gray-700 cursor-pointer"
          }`}
        >
          {section.label}
        </div>
      ))}

      {/* Opened supplement detail tabs (with group label) */}
      {supplementTabs.length > 0 && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-3 shrink-0" />
          <span className="text-xs text-gray-400 font-medium shrink-0 mr-1 whitespace-nowrap">
            Opened:
          </span>
          {supplementTabs.map((tab) => {
            const isActive = !sectionIsActive && tab.id === activeId;
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
        </>
      )}
    </div>
  );
}
