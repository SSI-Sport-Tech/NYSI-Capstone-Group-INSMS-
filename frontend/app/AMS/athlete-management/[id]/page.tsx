"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import ConsultationView from "@/components/AMS/ConsultationView";
import { useAuth } from "@/contexts/AuthContext";

interface AthleteProfile {
  athlete: {
      id: string;
      anonymized_display_name: string;
      sport_name: string;
      gender: string;
      date_of_birth: string;
      carding_status: string | null;
      carding_start_date: string,
      carding_end_date: string,
      is_active: boolean;
      email: string;
      position: string;
      race: string | null;
      ethnicity: string | null;
      nationality: string | null;
      fk_sport_uuid: string;
      team_uuid: string;
      is_pinned: boolean;
  };
  athlete_profile: {
    id: string;
    athlete_id: string;
    target_event?: string | null;
    sport_start_date?: number | null;
    medical_clearance: boolean;
  } | null;
  // registry: {
  //   id: string;
  //   athlete_id: string;
  //   carding_status: string;
  //   athlete_notified_on: string;
  //   carding_start_date: string;
  //   carding_end_date: string;
  //   medical_clearance: boolean;
  //   approved_start_date: string;
  //   approved_end_date: string;
  // } | null;
  medical: {
    id: string;
    athlete_id: string;
    medical_condition: string | null;
    food_allergy: string | null;
    drug_allergy: string | null;
    past_injury: string | null;
    medical_remarks: string | null;
    dietary_restriction: string | null;
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

interface EditForm {
  // Read only
  anonymized_display_name: string;
  gender: string;
  date_of_birth: string;
  ethnicity: string;
  fk_sport_uuid: string;
  sport_name: string;
  carding_status: string;
  carding_start_date: string;
  carding_end_date: string;
  is_active: boolean;

  // Editable
  target_event: string;
  sport_start_date: string;
  medical_clearance: boolean;
  coach_ids: string[];
  nutritionist_ids: string[];
  medical_condition: string;
  food_allergy: string;
  drug_allergy: string;
  past_injury: string;
  medical_remarks: string;
  dietary_restriction: string;
}

// interface SportOption {
//   id: string;
//   sport: string;
// }

interface CoachOption {
  id: string;
  name: string;
}

interface NutritionistOption {
  id: string;
  name: string;
}

type TabType = "profile" | "consultation" | "history";

export default function AthleteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const athleteId = params.id as string;
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "IT_ADMIN";

  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  // Dropdown data for edit mode
  // const [sports, setSports] = useState<SportOption[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [nutritionists, setNutritionists] = useState<NutritionistOption[]>([]);

  // History tab state
  interface ConsultationSummary {
    id: string;
    date_of_consult: string;
    type_of_consult: string | null;
    nutritionist_name: string | null;
    consultation_objective: string | null;
    supplement_name: string | null;
    batch_number: string | null;
    dosage: number | null;
    dosage_unit: string | null;
    dosage_frequency: string | null;
  }
  const [historySessions, setHistorySessions] = useState<ConsultationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string>("");

  useEffect(() => {
    if (athleteId) {
      fetchAthleteProfile();
    }
  }, [athleteId]);

  // Sync tab with URL parameters
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabType;
    if (tabParam && ["profile", "consultation", "history"].includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab("profile");
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
          `${backendUrl}/api/Consultation/consultation-session/athlete/${athleteId}/all`,
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
    if (tab !== "profile" && isEditing) {
      setIsEditing(false);
      setEditForm(null);
      setSaveError(null);
    }
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

      console.log("API response:", response.data);
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

  const toInputDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  const getYearsInSport = (startAge: number | null | undefined, dob: string | null | undefined) => {
    if (startAge == null || !dob) return "-";
    const birthDate = new Date(dob);
    const now = new Date();
    const currentAge = Math.floor(
      (now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    const years = currentAge - startAge;
    if (years < 0) return "-";
    if (years < 1) return "Less than 1 year";
    return years === 1 ? "1 year" : `${years} years`;
  };

  const handleEditStart = async () => {
    if (!profile) return;

    setEditForm({
      anonymized_display_name: profile.athlete.anonymized_display_name || "",
      gender: profile.athlete.gender || "",
      date_of_birth: toInputDate(profile.athlete.date_of_birth),
      ethnicity: profile.athlete.ethnicity || "",
      fk_sport_uuid: profile.athlete.fk_sport_uuid || "",
      sport_name: profile.athlete.sport_name || "",
      carding_status: profile.athlete.carding_status || "",
      carding_start_date: profile.athlete.carding_start_date || "",
      carding_end_date: profile.athlete.carding_end_date || "",
      is_active: profile.athlete.is_active || false,
      target_event: profile.athlete_profile?.target_event || "",
      sport_start_date: profile.athlete_profile?.sport_start_date?.toString() ?? "",
      medical_clearance: profile.athlete_profile?.medical_clearance ?? false,
      coach_ids: profile.coaches.filter((c) => c.is_active).map((c) => c.coach_id),
      nutritionist_ids: profile.nutritionists.filter((n) => n.is_active).map((n) => n.nutritionist_id),
      medical_condition: profile.medical?.medical_condition || "",
      food_allergy: profile.medical?.food_allergy || "",
      drug_allergy: profile.medical?.drug_allergy || "",
      past_injury: profile.medical?.past_injury || "",
      medical_remarks: profile.medical?.medical_remarks || "",
      dietary_restriction: profile.medical?.dietary_restriction || "",
    });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const token = localStorage.getItem("token");
    const headers: HeadersInit = { Authorization: `Bearer ${token}` };

    try {
      const [sportsRes, coachesRes, nutritionistsRes] = await Promise.all([
        fetch(`${backendUrl}/api/AMS/sports`, { headers }),
        fetch(`${backendUrl}/api/AMS/coaches`, { headers }),
        fetch(`${backendUrl}/api/AMS/nutritionists`, { headers }),
      ]);
      const [sportsData, coachesData, nutritionistsData] = await Promise.all([
        sportsRes.json(),
        coachesRes.json(),
        nutritionistsRes.json(),
      ]);
      // setSports(sportsData.data || []);
      setCoaches(coachesData.data || []);
      setNutritionists(nutritionistsData.data || []);
    } catch {
      // Dropdown data failed — text fields still editable
    }

    setIsEditing(true);
    setSaveError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editForm) return;
    setSaving(true);
    setSaveError(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const token = localStorage.getItem("token");

    const payload: Record<string, unknown> = {
      target_event: editForm.target_event || undefined,
      sport_start_date: editForm.sport_start_date ? Number(editForm.sport_start_date) : undefined,
      medical_clearance: editForm.medical_clearance,
      coach_ids: editForm.coach_ids,
      medical_condition: editForm.medical_condition || undefined,
      food_allergy: editForm.food_allergy || undefined,
      drug_allergy: editForm.drug_allergy || undefined,
      past_injury: editForm.past_injury || undefined,
      medical_remarks: editForm.medical_remarks || undefined,
      dietary_restriction: editForm.dietary_restriction || undefined,
    };

    if (isAdmin) {
      payload.nutritionist_ids = editForm.nutritionist_ids;
    }

    const endpoint = isAdmin
      ? `${backendUrl}/api/AMS/athletes/${athleteId}/profile/admin`
      : `${backendUrl}/api/AMS/athletes/${athleteId}/profile`;

    try {
      await axios.patch(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsEditing(false);
      setEditForm(null);
      await fetchAthleteProfile();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setSaveError(e.response?.data?.message || "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCoachId = (id: string) => {
    if (!editForm) return;
    const next = editForm.coach_ids.includes(id)
      ? editForm.coach_ids.filter((c) => c !== id)
      : [...editForm.coach_ids, id];
    setEditForm({ ...editForm, coach_ids: next });
  };

  const toggleNutritionistId = (id: string) => {
    if (!editForm) return;
    const next = editForm.nutritionist_ids.includes(id)
      ? editForm.nutritionist_ids.filter((n) => n !== id)
      : [...editForm.nutritionist_ids, id];
    setEditForm({ ...editForm, nutritionist_ids: next });
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
                {isEditing && editForm ? (
                  <input
                    type="text"
                    value={editForm.anonymized_display_name}
                    className="text-3xl font-bold text-gray-900 mb-2 border-b-2 border-blue-400 bg-transparent focus:outline-none w-full uppercase"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {profile.athlete.anonymized_display_name.toUpperCase()}
                  </h1>
                )}
                <p className="text-lg text-gray-600 mb-1">
                  {profile.athlete.sport_name}
                </p>
              </div>

              {/* Edit / Save / Cancel controls — only on Profile tab */}
              {activeTab === "profile" && isEditing ? (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {saveError && (
                    <p className="text-sm text-red-600 w-full text-right">{saveError}</p>
                  )}
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              ) : activeTab === "profile" ? (
                <button
                  onClick={handleEditStart}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
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
              ) : null}
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => handleTabChange("profile")}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "profile"
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
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "consultation"
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
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "history"
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 underline underline-offset-2">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Date of Birth */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Date of Birth
                        </label>
                        <p className="text-sm text-gray-900">
                          {formatDate(profile.athlete.date_of_birth)}
                        </p>
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Sex
                        </label>
                        <p className="text-sm text-gray-900">
                          {profile.athlete.gender}
                        </p>
                      </div>

                      {/* Ethnicity */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Ethnicity
                        </label>
                        <p className="text-sm text-gray-900">
                          {profile.athlete.ethnicity || "-"}
                        </p>
                      </div>

                      {/* Sport */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Sport
                        </label>
                        <p className="text-sm text-gray-900">
                          {profile.athlete.sport_name || "-"}
                        </p>
                      </div>

                      {/* Carding Level */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Carding Level
                        </label>
                        <p className="text-sm text-gray-900">
                          {profile.athlete.carding_status || "-"}
                        </p>
                      </div>

                      {/* Carding Start Date */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Carding Start Date
                        </label>
                        <p className="text-sm text-gray-900">
                          {formatDate(profile.athlete.carding_start_date)}
                        </p>
                      </div>

                      {/* Carding End Date */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Carding End Date
                        </label>
                        <p className="text-sm text-gray-900">
                          {formatDate(profile.athlete.carding_end_date)}
                        </p>
                      </div>

                      {/* Athlete Status */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Athlete Status
                        </label>
                          {profile.athlete.is_active === undefined || profile.athlete.is_active === null ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                profile.athlete.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {profile.athlete.is_active ? "Active" : "Inactive"}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Registry Information */}
                  {profile.athlete && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 underline underline-offset-2">
                        Registry Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Nutritionist Assigned */}
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                            Nutritionist Assigned
                            {isEditing && !isAdmin && (
                              <span className="ml-2 text-xs text-gray-400 font-normal">(Admin only)</span>
                            )}
                          </label>
                          {isEditing && editForm && isAdmin ? (
                            <div className="border border-gray-300 rounded-lg px-3 py-2 max-h-36 overflow-y-auto space-y-1 bg-white">
                              {nutritionists.length === 0 ? (
                                <p className="text-xs text-gray-400">Loading nutritionists...</p>
                              ) : (
                                nutritionists.map((n) => (
                                  <label key={n.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editForm.nutritionist_ids.includes(n.id)}
                                      onChange={() => toggleNutritionistId(n.id)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-900">{n.name}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-900">
                              {profile.nutritionists
                                .filter((n) => n.is_active)
                                .map((n) => n.nutritionist_name)
                                .join(", ") || "Not Assigned"}
                            </p>
                          )}
                        </div>

                        {/* Coach Assigned */}
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                            Coach Assigned
                          </label>
                          {isEditing && editForm ? (
                            <div className="border border-gray-300 rounded-lg px-3 py-2 max-h-36 overflow-y-auto space-y-1 bg-white">
                              {coaches.length === 0 ? (
                                <p className="text-xs text-gray-400">Loading coaches...</p>
                              ) : (
                                coaches.map((c) => (
                                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editForm.coach_ids.includes(c.id)}
                                      onChange={() => toggleCoachId(c.id)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-900">{c.name}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-900">
                              {profile.coaches
                                .filter((c) => c.is_active)
                                .map((c) => c.coach_name)
                                .join(", ") || "Not Assigned"}
                            </p>
                          )}
                        </div>

                        {/* Medical Clearance */}
                        <div>
                          <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                            Medical Clearance
                          </label>
                          {isEditing && editForm ? (
                            <select
                              value={editForm.medical_clearance ? "true" : "false"}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  medical_clearance: e.target.value === "true",
                                })
                              }
                              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="true">Required</option>
                              <option value="false">Not Required</option>
                            </select>
                          ) : (
                            <p className="text-sm text-gray-900">
                              {profile.athlete_profile?.medical_clearance
                                ? "Required"
                                : "Not Required"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                        

                  {/* Medical Information */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 underline underline-offset-2">
                      Medical Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Medical Condition */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Medical Condition
                        </label>
                        {isEditing && editForm ? (
                          <textarea
                            value={editForm.medical_condition}
                            onChange={(e) => setEditForm({ ...editForm, medical_condition: e.target.value })}
                            rows={2}
                            placeholder="e.g. Asthma"
                            className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{profile.medical?.medical_condition || "-"}</p>
                        )}
                      </div>

                      {/* Food Allergy */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Food Allergy / Intolerances
                        </label>
                        {isEditing && editForm ? (
                          <textarea
                            value={editForm.food_allergy}
                            onChange={(e) => setEditForm({ ...editForm, food_allergy: e.target.value })}
                            rows={2}
                            placeholder="e.g. Peanuts"
                            className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{profile.medical?.food_allergy || "-"}</p>
                        )}
                      </div>

                      {/* Drug Allergy */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Drug Allergy
                        </label>
                        {isEditing && editForm ? (
                          <textarea
                            value={editForm.drug_allergy}
                            onChange={(e) => setEditForm({ ...editForm, drug_allergy: e.target.value })}
                            rows={2}
                            placeholder="e.g. Penicillin"
                            className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{profile.medical?.drug_allergy || "-"}</p>
                        )}
                      </div>

                      {/* Past Injury */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Past Injury
                        </label>
                        {isEditing && editForm ? (
                          <textarea
                            value={editForm.past_injury}
                            onChange={(e) => setEditForm({ ...editForm, past_injury: e.target.value })}
                            rows={2}
                            placeholder="e.g. ACL tear (2022)"
                            className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{profile.medical?.past_injury || "-"}</p>
                        )}
                      </div>

                      {/* Dietary Restriction */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Dietary Restriction
                        </label>
                        {isEditing && editForm ? (
                          <textarea
                            value={editForm.dietary_restriction}
                            onChange={(e) => setEditForm({ ...editForm, dietary_restriction: e.target.value })}
                            rows={2}
                            placeholder="e.g. Vegetarian"
                            className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{profile.medical?.dietary_restriction || "-"}</p>
                        )}
                      </div>

                      {/* Medical Remarks */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Medical Remarks
                        </label>
                        {isEditing && editForm ? (
                          <textarea
                            value={editForm.medical_remarks}
                            onChange={(e) => setEditForm({ ...editForm, medical_remarks: e.target.value })}
                            rows={2}
                            placeholder="Additional notes"
                            className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{profile.medical?.medical_remarks || "-"}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sport Information */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 underline underline-offset-2">
                      Sport Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Target Event */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Target Event
                        </label>
                        {isEditing && editForm ? (
                          <input
                            type="text"
                            value={editForm.target_event}
                            onChange={(e) =>
                              setEditForm({ ...editForm, target_event: e.target.value })
                            }
                            placeholder="e.g. 100m Sprint"
                            className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">
                            {profile.athlete_profile?.target_event || "-"}
                          </p>
                        )}
                      </div>

                      {/* Age Started Sport */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Age Started Sport
                        </label>
                        {isEditing && editForm ? (
                          <input
                            type="number"
                            value={editForm.sport_start_date}
                            onChange={(e) =>
                              setEditForm({ ...editForm, sport_start_date: e.target.value })
                            }
                            placeholder="e.g. 8"
                            min={0}
                            max={99}
                            className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">
                            {profile.athlete_profile?.sport_start_date != null ? `Age ${profile.athlete_profile.sport_start_date}` : "-"}
                          </p>
                        )}
                      </div>

                      {/* Years in Sport (always display-only, computed) */}
                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1 underline underline-offset-2">
                          Years in Sport
                        </label>
                        <p className="text-sm text-gray-900">
                          {getYearsInSport(
                            isEditing && editForm
                              ? (editForm.sport_start_date ? Number(editForm.sport_start_date) : profile.athlete_profile?.sport_start_date)
                              : profile.athlete_profile?.sport_start_date,
                            profile.athlete.date_of_birth,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "consultation" && (
                <ConsultationView
                  athleteId={athleteId}
                  athleteName={profile.athlete.anonymized_display_name}
                  initialSessionId={searchParams.get("sessionId") ?? undefined}
                />
              )}

              {activeTab === "history" && (
                <div className="p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">View Athlete History</h2>
                    <p className="text-sm text-gray-500 mt-1">Select each category to view athlete&apos;s history</p>
                  </div>

                  {/* Consultations sub-tab label */}
                  <div className="mb-4">
                    <span className="inline-block px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md bg-white">
                      Consultations
                    </span>
                  </div>

                  {historyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-gray-600">Loading history...</span>
                    </div>
                  ) : historyError ? (
                    <div className="text-center py-8">
                      <p className="text-red-600">{historyError}</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900">
                          All Consultations ({historySessions.length})
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">View past sessions</p>
                      </div>

                      {historySessions.length === 0 ? (
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
                              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                                <th className="py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">Date</th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">By</th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">Type of Consultation</th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">Supplement</th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">Batch Number</th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">Dosage</th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">Dosage Unit</th>
                                <th className="py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide">Dosage Frequency</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historySessions.map((session) => (
                                <tr
                                  key={session.id}
                                  onClick={() => router.push(`/AMS/athlete-management/${athleteId}/consultation/${session.id}`)}
                                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                                >
                                  <td className="py-3 px-4 text-sm text-gray-900 whitespace-nowrap">
                                    {session.date_of_consult
                                      ? new Date(session.date_of_consult).toLocaleDateString("en-CA")
                                      : "—"}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-900">
                                    {session.nutritionist_name || "—"}
                                  </td>
                                  <td className="py-3 px-4 text-sm">
                                    {session.type_of_consult ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        {session.type_of_consult}
                                      </span>
                                    ) : "—"}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-900">
                                    {session.supplement_name || "—"}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-900">
                                    {session.batch_number || "—"}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-900">
                                    {session.dosage ?? "—"}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-900">
                                    {session.dosage_unit || "—"}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-900">
                                    {session.dosage_frequency || "—"}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
