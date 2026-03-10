import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { consultationApi } from "@/utils/consultationApi";

interface TrainingScheduleProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
}

interface TrainingScheduleData {
  id: string | null;
  sessionId: string;
  days: {
    monday: { am: string | null; pm: string | null; trainingHours: number; rpe: number };
    tuesday: { am: string | null; pm: string | null; trainingHours: number; rpe: number };
    wednesday: { am: string | null; pm: string | null; trainingHours: number; rpe: number };
    thursday: { am: string | null; pm: string | null; trainingHours: number; rpe: number };
    friday: { am: string | null; pm: string | null; trainingHours: number; rpe: number };
    saturday: { am: string | null; pm: string | null; trainingHours: number; rpe: number };
    sunday: { am: string | null; pm: string | null; trainingHours: number; rpe: number };
  };
  totalTrainingHours: number;
  pal: string;
  trainingDetails: {
    upcomingMajorCompetitions: string | null;
    upcomingLocalCompetitions: string | null;
  };
  performanceDetails: {
    currentPerformance: string | null;
    coachPerformanceGoals: string | null;
    athletePerformanceGoals: string | null;
    otherRemarks: string | null;
  };
}

type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const DAY_KEYS: { key: DayKey; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

interface DayEdit {
  am: string;
  pm: string;
  trainingHours: string;
  rpe: string;
}

interface EditForm {
  days: Record<DayKey, DayEdit>;
  upcomingMajorCompetitions: string;
  upcomingLocalCompetitions: string;
  pal: string;
  currentPerformance: string;
  coachPerformanceGoals: string;
  athletePerformanceGoals: string;
  otherRemarks: string;
}

const emptyDay: DayEdit = { am: "", pm: "", trainingHours: "", rpe: "" };

const emptyEditForm: EditForm = {
  days: {
    monday: { ...emptyDay },
    tuesday: { ...emptyDay },
    wednesday: { ...emptyDay },
    thursday: { ...emptyDay },
    friday: { ...emptyDay },
    saturday: { ...emptyDay },
    sunday: { ...emptyDay },
  },
  upcomingMajorCompetitions: "",
  upcomingLocalCompetitions: "",
  pal: "",
  currentPerformance: "",
  coachPerformanceGoals: "",
  athletePerformanceGoals: "",
  otherRemarks: "",
};

function toEditForm(data: TrainingScheduleData): EditForm {
  const toDay = (d: {
    am: string | null;
    pm: string | null;
    trainingHours: number;
    rpe: number;
  }): DayEdit => ({
    am: d.am ?? "",
    pm: d.pm ?? "",
    trainingHours: d.trainingHours?.toString() ?? "",
    rpe: d.rpe?.toString() ?? "",
  });
  return {
    days: {
      monday: toDay(data.days.monday),
      tuesday: toDay(data.days.tuesday),
      wednesday: toDay(data.days.wednesday),
      thursday: toDay(data.days.thursday),
      friday: toDay(data.days.friday),
      saturday: toDay(data.days.saturday),
      sunday: toDay(data.days.sunday),
    },
    upcomingMajorCompetitions:
      data.trainingDetails?.upcomingMajorCompetitions ?? "",
    upcomingLocalCompetitions:
      data.trainingDetails?.upcomingLocalCompetitions ?? "",
    pal: data.pal ?? "",
    currentPerformance: data.performanceDetails?.currentPerformance ?? "",
    coachPerformanceGoals:
      data.performanceDetails?.coachPerformanceGoals ?? "",
    athletePerformanceGoals:
      data.performanceDetails?.athletePerformanceGoals ?? "",
    otherRemarks: data.performanceDetails?.otherRemarks ?? "",
  };
}

export default function TrainingSchedule({
  athleteId: _athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
}: TrainingScheduleProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [trainingData, setTrainingData] =
    useState<TrainingScheduleData | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(false);
  }, [editForm]);

  const updateDay = (key: DayKey, field: keyof DayEdit, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [key]: { ...prev.days[key], [field]: value },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaveError("");
      const id = isNewConsultation && ensureSession ? await ensureSession() : sessionId;
      const token = localStorage.getItem("token");
      const dayPayload = (key: DayKey) => ({
        am: editForm.days[key].am || null,
        pm: editForm.days[key].pm || null,
        trainingHours: editForm.days[key].trainingHours
          ? parseFloat(editForm.days[key].trainingHours)
          : null,
        rpe: editForm.days[key].rpe
          ? parseFloat(editForm.days[key].rpe)
          : null,
      });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/sessions/${id}/training-schedule`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            days: {
              monday: dayPayload("monday"),
              tuesday: dayPayload("tuesday"),
              wednesday: dayPayload("wednesday"),
              thursday: dayPayload("thursday"),
              friday: dayPayload("friday"),
              saturday: dayPayload("saturday"),
              sunday: dayPayload("sunday"),
            },
            trainingDetails: {
              upcomingMajorCompetitions:
                editForm.upcomingMajorCompetitions || null,
              upcomingLocalCompetitions:
                editForm.upcomingLocalCompetitions || null,
            },
            performanceDetails: {
              currentPerformance: editForm.currentPerformance || null,
              coachPerformanceGoals: editForm.coachPerformanceGoals || null,
              athletePerformanceGoals:
                editForm.athletePerformanceGoals || null,
              otherRemarks: editForm.otherRemarks || null,
            },
            pal: editForm.pal ? parseFloat(editForm.pal) : null,
          }),
        },
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const updated = (await response.json()) as { data: TrainingScheduleData };
      setTrainingData(updated.data);
      if (!isNewConsultation) setEditForm(toEditForm(updated.data));
      setIsEditing(false);
      setIsSaved(true);
    } catch (err) {
      console.error("Error saving training schedule:", err);
      setSaveError("Failed to save. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
    if (trainingData) setEditForm(toEditForm(trainingData));
  };

  useEffect(() => {
    const fetchTrainingSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = (await consultationApi.getTrainingSchedule(
          sessionId,
        )) as { data: TrainingScheduleData };
        if (response?.data) {
          setTrainingData(response.data);
          setEditForm(toEditForm(response.data));
        }
      } catch (err) {
        console.error("Error fetching training schedule:", err);
        setError("Failed to load training schedule data");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchTrainingSchedule();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  // Total hours derived from editForm in edit mode
  const editTotalHours = DAY_KEYS.reduce((sum, { key }) => {
    const h = parseFloat(editForm.days[key].trainingHours);
    return sum + (isNaN(h) ? 0 : h);
  }, 0);

  if (loading) {
    return (
      <section
        id="training-schedule"
        className="bg-white rounded-xl shadow-lg p-6 text-gray-900"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            Loading training schedule...
          </span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        id="training-schedule"
        className="bg-white rounded-xl shadow-lg p-6 text-gray-900"
      >
        <div className="text-center py-12">
          <div className="text-red-600 mb-2">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="training-schedule"
      className="bg-white rounded-xl shadow-lg p-6 text-gray-900"
    >
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900">
            Training Schedule
          </h2>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        {!readOnly && !effectiveEditing && !collapsed && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
          >
            Edit
          </button>
        )}
      </div>

      {!collapsed && (
        <>
      {saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}

      <div className="space-y-8">
        {/* Training Schedule Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 w-24">
                  Day
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Activities (AM / PM)
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 w-32">
                  Training Hours
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 w-24">
                  RPE (1-10)
                </th>
              </tr>
            </thead>
            <tbody>
              {DAY_KEYS.map(({ key, label }) => (
                <tr key={key}>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                    {label}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                    {effectiveEditing ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={editForm.days[key].am}
                          onChange={(e) =>
                            updateDay(key, "am", e.target.value)
                          }
                          placeholder="AM activity..."
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          value={editForm.days[key].pm}
                          onChange={(e) =>
                            updateDay(key, "pm", e.target.value)
                          }
                          placeholder="PM activity..."
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    ) : (
                      <div>
                        {trainingData?.days[key].am && (
                          <div>{trainingData.days[key].am}</div>
                        )}
                        {trainingData?.days[key].pm && (
                          <div>{trainingData.days[key].pm}</div>
                        )}
                        {!trainingData?.days[key].am &&
                          !trainingData?.days[key].pm &&
                          "—"}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                    {effectiveEditing ? (
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={editForm.days[key].trainingHours}
                        onChange={(e) =>
                          updateDay(key, "trainingHours", e.target.value)
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                      />
                    ) : (
                      trainingData?.days[key].trainingHours ?? "—"
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                    {effectiveEditing ? (
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="1"
                        value={editForm.days[key].rpe}
                        onChange={(e) =>
                          updateDay(key, "rpe", e.target.value)
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                      />
                    ) : (
                      trainingData?.days[key].rpe ?? "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Training Details */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-4">
              Training Details
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Training Hours:</span>
                <span className="text-gray-900">
                  {effectiveEditing
                    ? editTotalHours.toFixed(1)
                    : (trainingData?.totalTrainingHours ?? 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Physical Activity Level (PAL):
                </span>
                {effectiveEditing ? (
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.01"
                    value={editForm.pal}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, pal: e.target.value }))
                    }
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                  />
                ) : (
                  <span className="text-gray-900">
                    {trainingData?.pal
                      ? parseFloat(trainingData.pal)
                      : "Not set"}
                  </span>
                )}
              </div>

              <div className="flex justify-between items-start gap-4">
                <span className="text-gray-600 shrink-0">
                  Upcoming Major Competitions:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    value={editForm.upcomingMajorCompetitions}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        upcomingMajorCompetitions: e.target.value,
                      }))
                    }
                    placeholder="e.g. SEA Games 2026"
                    className="w-48 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                ) : (
                  <span className="text-gray-900">
                    {trainingData?.trainingDetails?.upcomingMajorCompetitions ||
                      "Not specified"}
                  </span>
                )}
              </div>

              <div className="flex justify-between items-start gap-4">
                <span className="text-gray-600 shrink-0">
                  Upcoming Local Competitions:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    value={editForm.upcomingLocalCompetitions}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        upcomingLocalCompetitions: e.target.value,
                      }))
                    }
                    placeholder="e.g. National Championships"
                    className="w-48 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                ) : (
                  <span className="text-gray-900">
                    {trainingData?.trainingDetails?.upcomingLocalCompetitions ||
                      "Not specified"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-medium text-gray-900 mb-4">
              Performance Details
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-600 mb-2">
                  Current Performance:
                </label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={editForm.currentPerformance}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        currentPerformance: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {editForm.currentPerformance || "—"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Coach Performance Goals:
                </label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={editForm.coachPerformanceGoals}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        coachPerformanceGoals: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {editForm.coachPerformanceGoals || "—"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Athlete Performance Goals:
                </label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={editForm.athletePerformanceGoals}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        athletePerformanceGoals: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {editForm.athletePerformanceGoals || "—"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Other Remarks:
                </label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={editForm.otherRemarks}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        otherRemarks: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {editForm.otherRemarks || "—"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

          {!readOnly && effectiveEditing && (
            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
              {!isNewConsultation && (
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  setTrainingData(null);
                  setEditForm(emptyEditForm);
                  setIsSaved(false);
                  setSaveError("");
                }}
                className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
              >
                Clear All
              </button>
              <button
                onClick={handleSave}
                className={`px-3 py-1 text-white text-sm rounded ${isSaved ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"}`}
              >
                {isSaved ? "Saved" : "Save"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
