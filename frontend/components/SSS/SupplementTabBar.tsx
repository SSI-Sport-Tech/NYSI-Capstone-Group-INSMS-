"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
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
  const userRole = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  return (
    <div className="relative z-[90] shrink-0 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-6 px-6">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center">
            {SSS_SECTIONS.map((section) => (
              <div
                key={section.id}
                onClick={() => activeId !== section.id && router.push(section.href)}
                className={`px-5 py-4 text-sm border-b-2 shrink-0 transition-colors whitespace-nowrap ${
                  activeId === section.id
                    ? "border-blue-500 text-blue-700 font-medium cursor-default"
                    : "border-transparent text-gray-500 hover:text-gray-700 cursor-pointer"
                }`}
              >
                {section.label}
              </div>
            ))}

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
                      className={`flex items-center gap-1 px-3 py-4 text-sm border-b-2 shrink-0 transition-colors ${
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
        </div>

        {user && (
          <div className="hidden shrink-0 items-center gap-3 py-3 md:flex">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold select-none">
                {(user.first_name?.[0] ?? "").toUpperCase()}
                {(user.last_name?.[0] ?? "").toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
            </div>
            <div className="text-sm leading-tight">
              <p className="font-semibold text-gray-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-gray-500 text-xs">{userRole}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
