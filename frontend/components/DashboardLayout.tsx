"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, redirect } from "next/navigation";
import { ChevronDown, Archive, BookOpenText, Globe, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [supplementOpen, setSupplementOpen] = useState(true);
  const [amsOpen, setAmsOpen] = useState(true);
  const { isAuthenticated, loading, user, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    redirect("/login");
  }

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
              <div className="mt-2 space-y-1">
                <Link
                  href="/inventory"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                    pathname === "/inventory"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  <span>Inventory</span>
                </Link>
                <Link
                  href="/web-scraper"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                    pathname === "/web-scraper"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Web Scraper</span>
                </Link>
                <Link
                  href="/library"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                    pathname === "/library"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <BookOpenText className="w-4 h-4" />
                  <span>Library</span>
                </Link>
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => setAmsOpen(!amsOpen)}
              className="flex items-center justify-between w-full px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="font-medium">Athlete Management</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${amsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {amsOpen && (
              <div className="mt-2 space-y-1">
                <Link
                  href="/athlete-management"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                    pathname === "/athlete-management"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  <span>Athletes</span>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* User info + Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm truncate">
              <p className="font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-gray-500 text-xs truncate">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
