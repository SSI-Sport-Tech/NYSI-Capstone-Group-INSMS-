"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { getBackendUrl } from "@/utils/backendUrl";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function AthleteProfileLinks({ athleteId }: { athleteId: string }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "profile";
  return (
    <>
      <Link
        href={`/AMS/athlete-management/${athleteId}?tab=profile`}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${currentTab === "profile" ? "bg-blue-100 text-blue-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
      >
        <span>Current Profile</span>
      </Link>
      <Link
        href={`/AMS/athlete-management/${athleteId}?tab=consultation`}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${currentTab === "consultation" ? "bg-blue-100 text-blue-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
      >
        <span>Consultation</span>
      </Link>
      <Link
        href={`/AMS/athlete-management/${athleteId}?tab=history`}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${currentTab === "history" ? "bg-blue-100 text-blue-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
      >
        <span>History</span>
      </Link>
    </>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const useSssUnifiedHeader =
    pathname.startsWith("/SSS") && pathname !== "/SSS/search";

  // Check if we're on an athlete profile page
  const isAthleteProfilePage =
    pathname.includes("/AMS/athlete-management/") &&
    pathname.split("/").length > 3;
  const athleteId = isAthleteProfilePage ? pathname.split("/")[3] : null;

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
  const router = useRouter();

  const fetchAthleteName = async (id: string) => {
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || getBackendUrl();
      const response = await axios.get(
        `${backendUrl}/api/AMS/athletes/${id}/profile`,
      );
      if (response.data?.athlete?.initials) {
        setAthleteName(response.data.athlete.initials);
      }
    } catch (error) {
      console.error("Error fetching athlete name:", error);
      setAthleteName("Athlete");
    }
  };

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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // router.push("/login");
      window.location.href = `${process.env.NEXT_PUBLIC_ICS_URL}/login`;
    }
  }, [loading, isAuthenticated, router]);

  const isDashboardUser = user?.role === "DASHBOARD";

  // Redirect DASHBOARD users away from any non-dashboard route
  useEffect(() => {
    if (!loading && isDashboardUser && pathname !== "/") {
      router.push("/unauthorized");
    }
  }, [loading, isDashboardUser, pathname]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Check if user is admin
  const isAdmin = user?.role === "ADMIN" || user?.role === "IT_ADMIN";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center justify-center">
            <img
              src="/noms/HPSI_LOGO.png"
              alt="HPSI - High Performance Sport Institute"
              className="w-32 h-32 object-contain mx-auto"
            />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link
            href="/"
            className={`flex items-center space-x-3 px-4 py-2 rounded-lg ${pathname === "/"
              ? "bg-gray-100 text-gray-900"
              : "text-gray-600 hover:bg-gray-50"
              }`}
          >
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Supplement Support Section */}
          {!isDashboardUser && (
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
                    href="/SSS/library"
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${pathname === "/SSS/library"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    <BookOpenText className="w-4 h-4" />
                    <span>Library</span>
                  </Link>
                  <Link
                    href="/SSS/inventory"
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${pathname === "/SSS/inventory"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    <Archive className="w-4 h-4" />
                    <span>Inventory</span>
                  </Link>
                  <Link
                    href="/SSS/web-scraper"
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${pathname === "/SSS/web-scraper"
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Web Scraper</span>
                  </Link>
                  <Link
                    href="/SSS/batch-testing"
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${pathname === "/SSS/batch-testing"
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
          )}

          {/* Athlete Management Section */}
          {!isDashboardUser && (
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
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${pathname === "/AMS/athlete-management"
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
          )}

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
                  <Suspense fallback={null}>
                    <AthleteProfileLinks athleteId={athleteId!} />
                  </Suspense>
                </div>
              )}
            </div>
          )}

          {/* NEW: Admin Section (Only for ADMIN and IT_ADMIN) */}
          {isAdmin && !isDashboardUser && (
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
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${pathname === "/admin/users"
                      ? "bg-indigo-100 text-indigo-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    <UserCog className="w-4 h-4" />
                    <span>User Management</span>
                  </Link>
                  <Link
                    href="/admin/sports-coaches"
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm ${pathname === "/admin/sports-coaches"
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
        <div className="p-4 border-t border-gray-200 space-y-2">
          {/* Switch System button */}
          <button
            onClick={() => {
              window.location.href = '/ics/select-system';
            }}
            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition"
            title="Switch system"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Switch System</span>
          </button>

          <div className="flex items-center justify-between">
            <div className="text-sm truncate">
              <p className="font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-gray-500 text-xs truncate">
                  {user?.role
                    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                    : ""}
                </p>
                {isAdmin && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    <Shield className="w-2.5 h-2.5 mr-0.5" />
                    Admin
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                // Clear NOMS localStorage token
                localStorage.removeItem('token');
                // Clear the ICS/AEMS auth_token cookie
                document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict';
                // Redirect to ICS login
                // window.location.href = '/ics/login';
                window.location.href = `${process.env.NEXT_PUBLIC_ICS_URL}/login`;
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!useSssUnifiedHeader && (
          <header className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold select-none">
                  {(user?.first_name?.[0] ?? "").toUpperCase()}
                  {(user?.last_name?.[0] ?? "").toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
              </div>
              <div className="text-sm leading-tight">
                <p className="font-semibold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-gray-500 text-xs">
                  {user?.role
                    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                    : ""}
                </p>
              </div>
            </div>
          </header>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
