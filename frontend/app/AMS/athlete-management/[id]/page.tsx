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
    ethnicity?: string | null;
    target_event?: string | null;
    sport_start_date?: string | null;
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

  // History tab state
  interface ConsultationSummary {
    id: string;
    date_of_consult: string;
    type_of_consult: string | null;
    nutritionist_name: string | null;
    consultation_objective: string | null;
  }
  const [historySessions, setHistorySessions] = useState<ConsultationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string>("");

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

  // Fetch all consultation sessions when history tab is active
  useEffect(() => {
    if (activeTab !== "history" || !athleteId) return;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError("");
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${backendUrl}/api/Consultation/consultation-update/athlete/${athleteId}/all`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();
        setHistorySessions(data.data || []);
      } catch {
        setHistoryError("Failed to load consultation history.");
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [activeTab, athleteId]);

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

  const getYearsInSport = (sportStartDate: string | null | undefined) => {
    if (!sportStartDate) return "-";
    const start = new Date(sportStartDate);
    const now = new Date();
    const years = Math.floor(
      (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    if (years < 1) return "Less than 1 year";
    return years === 1 ? "1 year" : `${years} years`;
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
                          Ethnicity
                        </label>
                        <p className="text-sm text-gray-900">
                          {profile.athlete.ethnicity || "-"}
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

                  {/* Sport Information */}
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
                          {profile.athlete.target_event || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sport Start Date
                        </label>
                        <p className="text-sm text-gray-900">
                          {formatDate(profile.athlete.sport_start_date)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Years in Sport
                        </label>
                        <p className="text-sm text-gray-900">
                          {getYearsInSport(profile.athlete.sport_start_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "consultation" && (
                <ConsultationView
                  athleteId={athleteId}
                  athleteName={profile.athlete.athlete_name_abbr}
                />
              )}

              {activeTab === "history" && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Consultation History</h2>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-gray-600">Loading history...</span>
                    </div>
                  ) : historyError ? (
                    <div className="text-center py-8">
                      <p className="text-red-600">{historyError}</p>
                    </div>
                  ) : historySessions.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No consultation history</h3>
                      <p className="mt-1 text-sm text-gray-500">No past consultations found for this athlete.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Consult Type</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nutritionist</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Objective</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historySessions.map((session) => (
                            <tr
                              key={session.id}
                              onClick={() => router.push(`/AMS/athlete-management/${athleteId}/consultation/${session.id}`)}
                              className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                            >
                              <td className="py-3 px-4 text-sm text-gray-900">
                                {session.date_of_consult
                                  ? new Date(session.date_of_consult).toLocaleDateString()
                                  : "—"}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-900">
                                {session.type_of_consult || "—"}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-900">
                                {session.nutritionist_name || "—"}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-900 max-w-xs truncate">
                                {session.consultation_objective || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
