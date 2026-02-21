"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import ConsultationView from "@/components/AMS/ConsultationView";

interface AthleteProfile {
  athlete: {
    id: string;
    sport_id: string;
    sportsync_id: string;
    athlete_name_abbr: string;
    gender: string;
    date_of_birth: string;
    sport_name: string;
  };
  registry: {
    id: string;
    athlete_id: string;
    carding_status: string;
    athlete_notified_on: string;
    carding_start_date: string;
    carding_end_date: string;
    medical_clearance: boolean;
    approved_start_date: string;
    approved_end_date: string;
  } | null;
  coaches: {
    coach_id: string;
    is_active: boolean;
    coach_name: string;
  }[];
  nutritionists: {
    nutritionist_id: string;
    is_active: boolean;
    nutritionist_name: string;
  }[];
}

type TabType = "profile" | "consultation" | "history";

export default function AthleteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const athleteId = params.id as string;

  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  useEffect(() => {
    if (athleteId) {
      fetchAthleteProfile();
    }
  }, [athleteId]);

  // Sync tab with URL parameters - listen for changes
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabType;
    if (tabParam && ["profile", "consultation", "history"].includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab("profile"); // Default to profile if no valid tab param
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/AMS/athlete-management/${athleteId}?tab=${tab}`, {
      scroll: false,
    });
  };

  const fetchAthleteProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await axios.get<AthleteProfile>(
        `${backendUrl}/api/AMS/athletes/${athleteId}/profile`,
      );
      setProfile(response.data);
    } catch (err) {
      console.error("Error fetching athlete profile:", err);
      setError("Failed to load athlete profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/AMS/athlete-management");
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-6">
              <p className="text-sm font-medium">
                {error || "Athlete not found"}
              </p>
            </div>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Athlete Management
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Athlete Management
            </button>
          </div>

          {/* Page Header */}
          <PageHeader title="Athlete Profile" />

          {/* Athlete Header Info */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {profile.athlete.athlete_name_abbr.toUpperCase()}
                </h1>
                <p className="text-lg text-gray-600 mb-1">
                  {profile.athlete.sportsync_id} [
                  {profile.athlete.sport_name?.toUpperCase()}]
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => handleTabChange("profile")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "profile"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Current Profile
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange("consultation")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "consultation"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Consultation
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange("history")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "history"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    History
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "profile" && (
                <div className="space-y-8">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <p className="text-sm text-gray-900">
                          {formatDate(profile.athlete.date_of_birth)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sex
                        </label>
                        <p className="text-sm text-gray-900">
                          {profile.athlete.gender}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <p className="text-sm text-gray-900">Active</p>
                      </div>
                    </div>
                  </div>

                  {/* Registry Information */}
                  {profile.registry && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Registry Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nutritionist Assigned
                          </label>
                          <p className="text-sm text-gray-900">
                            {profile.nutritionists
                              .filter((n) => n.is_active)
                              .map((n) => n.nutritionist_name)
                              .join(", ") || "Not Assigned"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Reminders
                          </label>
                          <p className="text-sm text-gray-900">-</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Carding Level
                          </label>
                          <p className="text-sm text-gray-900">
                            {profile.registry.carding_status}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Coach Assigned
                          </label>
                          <p className="text-sm text-gray-900">
                            {profile.coaches
                              .filter((c) => c.is_active)
                              .map((c) => c.coach_name)
                              .join(", ") || "Not Assigned"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Medical Clearance
                          </label>
                          <p className="text-sm text-gray-900">
                            {profile.registry.medical_clearance
                              ? "Required"
                              : "Not Required"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Approved Start Date
                          </label>
                          <p className="text-sm text-gray-900">
                            {formatDate(profile.registry.approved_start_date)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Carding Start Date
                          </label>
                          <p className="text-sm text-gray-900">
                            {formatDate(profile.registry.carding_start_date)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Approved End Date
                          </label>
                          <p className="text-sm text-gray-900">
                            {formatDate(profile.registry.approved_end_date)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Carding End Date
                          </label>
                          <p className="text-sm text-gray-900">
                            {formatDate(profile.registry.carding_end_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sport Information
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Sport Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Event
                        </label>
                        <p className="text-sm text-gray-900">
                          Not in DB col
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Started Current Sport
                        </label>
                        <p className="text-sm text-gray-900">5 years old</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Years in Current Sport
                        </label>
                        <p className="text-sm text-gray-900">11</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Other Details
                        </label>
                        <p className="text-sm text-gray-900">N.A.</p>
                      </div>
                    </div>
                  </div> */}
                </div>
              )}

              {activeTab === "consultation" && (
                <ConsultationView
                  athleteId={athleteId}
                  athleteName={profile.athlete.athlete_name_abbr}
                />
              )}

              {activeTab === "history" && (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No history data
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Historical information will be displayed here once
                    available.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
