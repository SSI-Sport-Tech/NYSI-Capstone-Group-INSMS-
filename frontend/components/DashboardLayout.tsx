"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, redirect, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  ChevronDown,
  Archive,
  BookOpenText,
  Globe,
  LogOut,
  Shield,
  Users,
  UserCog,
  TestTube,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Check if we're on an athlete profile page
  const isAthleteProfilePage =
    pathname.includes("/AMS/athlete-management/") &&
    pathname.split("/").length > 3;
  const athleteId = isAthleteProfilePage ? pathname.split("/").pop() : null;

  // Auto-manage section states based on current page
  const [supplementOpen, setSupplementOpen] = useState(
    pathname.startsWith("/SSS"),
  );
  const [amsOpen, setAmsOpen] = useState(
    pathname.startsWith("/AMS") && !isAthleteProfilePage,
  );
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/admin"));
  const [athleteProfileOpen, setAthleteProfileOpen] =
    useState(isAthleteProfilePage);
  const [athleteName, setAthleteName] = useState<string>("");
  const { isAuthenticated, loading, user, logout } = useAuth();

  // Get current tab from URL parameters
  const currentTab = searchParams.get("tab") || "profile";

  // Update section states when pathname changes
  useEffect(() => {
    setSupplementOpen(pathname.startsWith("/SSS"));
    setAmsOpen(pathname.startsWith("/AMS") && !isAthleteProfilePage);
    setAdminOpen(pathname.startsWith("/admin"));
    setAthleteProfileOpen(isAthleteProfilePage);
  }, [pathname, isAthleteProfilePage]);

  // Fetch athlete name when on athlete profile page
  useEffect(() => {
    if (isAthleteProfilePage && athleteId) {
      fetchAthleteName(athleteId);
    } else {
      setAthleteName("");
    }
  }, [isAthleteProfilePage, athleteId]);

  const fetchAthleteName = async (id: string) => {
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await axios.get(
        `${backendUrl}/api/AMS/athletes/${id}/profile`,
      );
      if (response.data?.athlete?.athlete_name_abbr) {
        setAthleteName(response.data.athlete.athlete_name_abbr);
      }
    } catch (error) {
      console.error("Error fetching athlete name:", error);
      setAthleteName("Athlete");
    }
  };

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

  // NEW: Check if user is admin
  const isAdmin = user?.role === "ADMIN" || user?.role === "IT_ADMIN";

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

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
              <div className="mt-2 space-y-1">
                <Link
                  href="/SSS/inventory"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                    pathname === "/SSS/inventory"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  <span>Inventory</span>
                </Link>
                <Link
                  href="/SSS/web-scraper"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                    pathname === "/SSS/web-scraper"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Web Scraper</span>
                </Link>
                <Link
                  href="/SSS/library"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                    pathname === "/SSS/library"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <BookOpenText className="w-4 h-4" />
                  <span>Library</span>
                </Link>
                <Link
                  href="/SSS/batch-testing"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                    pathname === "/SSS/batch-testing"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <TestTube className="w-4 h-4" />
                  <span>Batch Testing</span>
                </Link>
              </div>
            )}
          </div>

          {/* Athlete Management Section */}
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
                  href="/AMS/athlete-management"
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                    pathname === "/AMS/athlete-management"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Athletes</span>
                </Link>
              </div>
            )}
          </div>

          {/* Athlete Profile Section (Only when viewing athlete profile) */}
          {isAthleteProfilePage && (
            <div>
              <button
                onClick={() => setAthleteProfileOpen(!athleteProfileOpen)}
                className="flex items-center justify-between w-full px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-medium">
                    {athleteName ? `${athleteName} Profile` : "Athlete Profile"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${athleteProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {athleteProfileOpen && (
                <div className="mt-2 space-y-1">
                  <Link
                    href={`/AMS/athlete-management/${athleteId}?tab=profile`}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                      isAthleteProfilePage && currentTab === "profile"
                        ? "bg-blue-100 text-blue-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <UserCog className="w-4 h-4" />
                    <span>Current Profile</span>
                  </Link>
                  <Link
                    href={`/AMS/athlete-management/${athleteId}?tab=consultation`}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                      isAthleteProfilePage && currentTab === "consultation"
                        ? "bg-blue-100 text-blue-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <BookOpenText className="w-4 h-4" />
                    <span>Consultation</span>
                  </Link>
                  <Link
                    href={`/AMS/athlete-management/${athleteId}?tab=history`}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                      isAthleteProfilePage && currentTab === "history"
                        ? "bg-blue-100 text-blue-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                    <span>History</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* NEW: Admin Section (Only for ADMIN and IT_ADMIN) */}
          {isAdmin && (
            <div>
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className="flex items-center justify-between w-full px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Administration</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${adminOpen ? "rotate-180" : ""}`}
                />
              </button>

              {adminOpen && (
                <div className="mt-2 space-y-1">
                  <Link
                    href="/admin/users"
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                      pathname === "/admin/users"
                        ? "bg-indigo-100 text-indigo-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <UserCog className="w-4 h-4" />
                    <span>User Management</span>
                  </Link>
                  <Link
                    href="/admin/sports-coaches"
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${
                      pathname === "/admin/sports-coaches"
                        ? "bg-indigo-100 text-indigo-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <UserCog className="w-4 h-4" />
                    <span>Sports & Coaches</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User info + Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm truncate">
              <p className="font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-gray-500 text-xs truncate">{user?.role}</p>
                {/* NEW: Admin badge */}
                {isAdmin && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    <Shield className="w-2.5 h-2.5 mr-0.5" />
                    Admin
                  </span>
                )}
              </div>
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
