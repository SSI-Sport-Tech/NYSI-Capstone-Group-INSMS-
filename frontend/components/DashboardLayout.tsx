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
        <div className="p-6">
          <div className="flex items-center justify-center">
            <img
              src="/HPSI_LOGO.png"
              alt="HPSI - High Performance Sport Institute"
              className="w-full max-w-[100px] h-auto"
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
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
