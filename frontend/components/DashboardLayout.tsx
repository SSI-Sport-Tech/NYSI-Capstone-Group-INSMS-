"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ChevronDown, Bell } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [supplementOpen, setSupplementOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-center">
            <img
              src="/HPSI_LOGO.png"
              alt="HPSI - High Performance Sport Institute"
              className="w-full max-w-[200px] h-auto"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/"
            className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${
              pathname === "/"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Supplement Support Section */}
          <div>
            <button
              onClick={() => setSupplementOpen(!supplementOpen)}
              className="flex items-center justify-between w-full px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="font-medium">Supplement Support</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${supplementOpen ? "rotate-180" : ""}`}
              />
            </button>

            {supplementOpen && (
              <div className="ml-8 mt-2 space-y-1">
                <Link
                  href="/ocr"
                  className={`block px-4 py-2 rounded-lg text-sm ${
                    pathname === "/ocr"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  OCR
                </Link>
                <Link
                  href="/search"
                  className={`block px-4 py-2 rounded-lg text-sm ${
                    pathname === "/search"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Supplement Search
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* User Profile (Bottom) */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">AT</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">Amy Tan</div>
              <div className="text-xs text-gray-500">Nutritionist</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-end">
          <div className="flex items-center space-x-6">
            {/* Notifications */}
            <button className="relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">Amy Tan</div>
                <div className="text-xs text-gray-500">Nutritionist</div>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">AT</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
