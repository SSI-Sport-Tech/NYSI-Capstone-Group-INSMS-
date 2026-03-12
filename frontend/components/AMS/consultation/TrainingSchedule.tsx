import { useState, useEffect } from "react";
import { consultationApi } from "@/utils/consultationApi";

interface TrainingScheduleProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  prevSessionId?: string;
}

interface DayApiData {
  am: string | null;
  pm: string | null;
  trainingHours: number;
  rpe: number;
}

interface TrainingScheduleData {
  id: string | null;
  sessionId: string;
  days: Record<DayKey, DayApiData>;
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

interface SlotEdit {
  text: string;
  trainingHours: string;
  rpe: string;
}

interface DayEdit {
  am: SlotEdit;
  pm: SlotEdit;
}

interface EditForm {
  days: Record<DayKey, DayEdit>;
  upcomingMajorCompetitions: string;
  upcomingLocalCompetitions: string;
  pal: string;
  currentPerformance: string;
  coachPerformanceGoals: string;
  athletePerformanceGoals: string;
  otherText: string;
}

const emptySlot = (): SlotEdit => ({ text: "", trainingHours: "", rpe: "" });
const emptyDayEdit = (): DayEdit => ({ am: emptySlot(), pm: emptySlot() });

const makeEmptyForm = (): EditForm => ({
  days: Object.fromEntries(
    DAY_KEYS.map(({ key }) => [key, emptyDayEdit()])
  ) as Record<DayKey, DayEdit>,
  upcomingMajorCompetitions: "",
  upcomingLocalCompetitions: "",
  pal: "",
  currentPerformance: "",
  coachPerformanceGoals: "",
  athletePerformanceGoals: "",
  otherText: "",
});

function parseFromApi(data: TrainingScheduleData): EditForm {
  const rawOther = data.performanceDetails?.otherRemarks ?? null;
  let richDays: Record<DayKey, DayEdit> | null = null;
  let otherText = "";

  if (rawOther) {
    try {
      const parsed = JSON.parse(rawOther);
      if (parsed.__tsv === 2 && parsed.days) {
        richDays = parsed.days as Record<DayKey, DayEdit>;
        otherText = parsed.otherText || "";
      } else {
        otherText = rawOther;
      }
    } catch {
      otherText = rawOther;
    }
  }

  // Migrate v2 activities[] format → text string
  if (richDays) {
    DAY_KEYS.forEach(({ key }) => {
      const day = richDays![key];
      for (const slot of ["am", "pm"] as const) {
        const s = day[slot] as SlotEdit & { activities?: string[] };
        if (Array.isArray(s.activities)) {
          s.text = s.activities.filter(Boolean).join("\n");
          delete s.activities;
        }
      }
    });
  }

  if (!richDays) {
    richDays = {} as Record<DayKey, DayEdit>;
    DAY_KEYS.forEach(({ key }) => {
      const d = data.days?.[key];
      richDays![key] = {
        am: {
          text: d?.am ?? "",
          trainingHours: d?.trainingHours?.toString() ?? "",
          rpe: d?.rpe?.toString() ?? "",
        },
        pm: {
          text: d?.pm ?? "",
          trainingHours: "",
          rpe: "",
        },
      };
    });
  }

  return {
    days: richDays,
    upcomingMajorCompetitions:
      data.trainingDetails?.upcomingMajorCompetitions ?? "",
    upcomingLocalCompetitions:
      data.trainingDetails?.upcomingLocalCompetitions ?? "",
    pal: data.pal ?? "",
    currentPerformance: data.performanceDetails?.currentPerformance ?? "",
    coachPerformanceGoals: data.performanceDetails?.coachPerformanceGoals ?? "",
    athletePerformanceGoals:
      data.performanceDetails?.athletePerformanceGoals ?? "",
    otherText,
  };
}

export default function TrainingSchedule({
  athleteId: _athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
  prevSessionId,
}: TrainingScheduleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [trainingData, setTrainingData] = useState<TrainingScheduleData | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(makeEmptyForm);
  const [isSaved, setIsSaved] = useState(false);
  const [prevData, setPrevData] = useState<TrainingScheduleData | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");

  useEffect(() => {
    setIsSaved(false);
  }, [editForm]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = (await consultationApi.getTrainingSchedule(
          sessionId
        )) as { data: TrainingScheduleData };
        if (response?.data) {
          setTrainingData(response.data);
          setEditForm(parseFromApi(response.data));
        }
      } catch (err) {
        console.error("Error fetching training schedule:", err);
        setError("Failed to load training schedule data");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  useEffect(() => {
    if (!prevSessionId) return;
    (async () => {
      try {
        const response = (await consultationApi.getTrainingSchedule(
          prevSessionId
        )) as { data: TrainingScheduleData };
        if (response?.data) setPrevData(response.data);
      } catch {
        /* non-critical */
      }
    })();
  }, [prevSessionId]);

  const updateSlotText = (day: DayKey, slot: "am" | "pm", val: string) => {
    setEditForm((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          [slot]: { ...prev.days[day][slot], text: val },
        },
      },
    }));
  };

  const updateSlotField = (
    day: DayKey,
    slot: "am" | "pm",
    field: "trainingHours" | "rpe",
    val: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          [slot]: { ...prev.days[day][slot], [field]: val },
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaveError("");
      const id =
        isNewConsultation && ensureSession ? await ensureSession() : sessionId;
      const token = localStorage.getItem("token");

      const dayPayload = (key: DayKey) => {
        const d = editForm.days[key];
        const amH = parseFloat(d.am.trainingHours) || 0;
        const pmH = parseFloat(d.pm.trainingHours) || 0;
        return {
          am: d.am.text || null,
          pm: d.pm.text || null,
          trainingHours: amH + pmH || null,
          rpe: d.am.rpe
            ? parseFloat(d.am.rpe)
            : d.pm.rpe
            ? parseFloat(d.pm.rpe)
            : null,
        };
      };

      const richOther = JSON.stringify({
        __tsv: 2,
        days: editForm.days,
        otherText: editForm.otherText,
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
            days: Object.fromEntries(
              DAY_KEYS.map(({ key }) => [key, dayPayload(key)])
            ),
            trainingDetails: {
              upcomingMajorCompetitions:
                editForm.upcomingMajorCompetitions || null,
              upcomingLocalCompetitions:
                editForm.upcomingLocalCompetitions || null,
            },
            performanceDetails: {
              currentPerformance: editForm.currentPerformance || null,
              coachPerformanceGoals: editForm.coachPerformanceGoals || null,
              athletePerformanceGoals: editForm.athletePerformanceGoals || null,
              otherRemarks: richOther,
            },
            pal: editForm.pal ? parseFloat(editForm.pal) : null,
          }),
        }
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const updated = (await response.json()) as { data: TrainingScheduleData };
      setTrainingData(updated.data);
      if (!isNewConsultation) setEditForm(parseFromApi(updated.data));
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
    if (trainingData) setEditForm(parseFromApi(trainingData));
  };

  const editTotalHours = DAY_KEYS.reduce((sum, { key }) => {
    const d = editForm.days[key];
    return (
      sum + (parseFloat(d.am.trainingHours) || 0) + (parseFloat(d.pm.trainingHours) || 0)
    );
  }, 0);

  // Current session tab content
  const currentTabContent = (
    <div className="space-y-6">
      {/* Training schedule table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-28">Day</th>
              <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-16">Slot</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">Activities</th>
              <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-32">Training Hours</th>
              <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-28">RPE (1–10)</th>
            </tr>
          </thead>
          <tbody>
            {DAY_KEYS.map(({ key, label }) => {
              const day = editForm.days[key];
              return (
                <>
                  {/* AM row */}
                  <tr key={`${key}-am`} className="align-top">
                    <td
                      rowSpan={2}
                      className="border border-gray-300 px-3 py-3 font-medium text-gray-900 align-middle text-center bg-gray-50"
                    >
                      {label}
                    </td>
                    <td className="border border-gray-300 px-2 py-3 text-center">
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded border text-amber-600 bg-amber-50 border-amber-200">
                        AM
                      </span>
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {effectiveEditing ? (
                        <textarea
                          value={day.am.text}
                          onChange={(e) => updateSlotText(key, "am", e.target.value)}
                          placeholder="Type activities here"
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm resize-y focus:outline-none focus:border-blue-400"
                        />
                      ) : (
                        day.am.text ? (
                          <p className="whitespace-pre-wrap text-sm">{day.am.text}</p>
                        ) : (
                          <span className="text-gray-400 italic text-sm">Rest</span>
                        )
                      )}
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center align-middle">
                      {effectiveEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={day.am.trainingHours}
                          onChange={(e) => updateSlotField(key, "am", "trainingHours", e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      ) : (
                        day.am.trainingHours || "—"
                      )}
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center align-middle">
                      {effectiveEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="1"
                          value={day.am.rpe}
                          onChange={(e) => updateSlotField(key, "am", "rpe", e.target.value)}
                          className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      ) : (
                        day.am.rpe || "—"
                      )}
                    </td>
                  </tr>
                  {/* PM row */}
                  <tr key={`${key}-pm`} className="align-top">
                    <td className="border border-gray-300 px-2 py-3 text-center">
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded border text-indigo-600 bg-indigo-50 border-indigo-200">
                        PM
                      </span>
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {effectiveEditing ? (
                        <textarea
                          value={day.pm.text}
                          onChange={(e) => updateSlotText(key, "pm", e.target.value)}
                          placeholder="Type activities here"
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm resize-y focus:outline-none focus:border-blue-400"
                        />
                      ) : (
                        day.pm.text ? (
                          <p className="whitespace-pre-wrap text-sm">{day.pm.text}</p>
                        ) : (
                          <span className="text-gray-400 italic text-sm">Rest</span>
                        )
                      )}
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center align-middle">
                      {effectiveEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={day.pm.trainingHours}
                          onChange={(e) => updateSlotField(key, "pm", "trainingHours", e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      ) : (
                        day.pm.trainingHours || "—"
                      )}
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center align-middle">
                      {effectiveEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="1"
                          value={day.pm.rpe}
                          onChange={(e) => updateSlotField(key, "pm", "rpe", e.target.value)}
                          className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      ) : (
                        day.pm.rpe || "—"
                      )}
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Training & Performance Details */}
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Training Details
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Training Hours:</span>
              <span className="text-gray-900 font-medium">
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
                  {trainingData?.pal ? parseFloat(trainingData.pal) : "Not set"}
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
                <span className="text-gray-900 text-right">
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
                <span className="text-gray-900 text-right">
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
            {(
              [
                {
                  field: "currentPerformance" as const,
                  label: "Current Performance",
                },
                {
                  field: "coachPerformanceGoals" as const,
                  label: "Coach Performance Goals",
                },
                {
                  field: "athletePerformanceGoals" as const,
                  label: "Athlete Performance Goals",
                },
                { field: "otherText" as const, label: "Other Remarks" },
              ] as const
            ).map(({ field, label }) => (
              <div key={field}>
                <label className="block text-gray-600 mb-1">{label}:</label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={editForm[field]}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">
                    {editForm[field] || "—"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Previous session tab content
  const previousTabContent = (() => {
    if (!prevData) {
      return (
        <div className="py-10 text-center text-gray-400 text-sm">
          No previous session data available.
        </div>
      );
    }
    const prevForm = parseFromApi(prevData);
    const prevTotal = DAY_KEYS.reduce((sum, { key }) => {
      const d = prevForm.days[key];
      return (
        sum +
        (parseFloat(d.am.trainingHours) || 0) +
        (parseFloat(d.pm.trainingHours) || 0)
      );
    }, 0);
    return (
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 w-28">Day</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-16">Slot</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">Activities</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-32">Training Hours</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700 w-28">RPE (1–10)</th>
              </tr>
            </thead>
            <tbody>
              {DAY_KEYS.map(({ key, label }) => {
                const day = prevForm.days[key];
                return (
                  <>
                    <tr key={`${key}-am`} className="align-top">
                      <td
                        rowSpan={2}
                        className="border border-gray-300 px-3 py-3 font-medium text-gray-900 align-middle text-center bg-gray-50"
                      >
                        {label}
                      </td>
                      <td className="border border-gray-300 px-2 py-3 text-center">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded border text-amber-600 bg-amber-50 border-amber-200">AM</span>
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-sm">
                        {day.am.text ? (
                          <p className="whitespace-pre-wrap">{day.am.text}</p>
                        ) : (
                          <span className="text-gray-400 italic">Rest</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-center align-middle">{day.am.trainingHours || "—"}</td>
                      <td className="border border-gray-300 px-3 py-3 text-center align-middle">{day.am.rpe || "—"}</td>
                    </tr>
                    <tr key={`${key}-pm`} className="align-top">
                      <td className="border border-gray-300 px-2 py-3 text-center">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded border text-indigo-600 bg-indigo-50 border-indigo-200">PM</span>
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-sm">
                        {day.pm.text ? (
                          <p className="whitespace-pre-wrap">{day.pm.text}</p>
                        ) : (
                          <span className="text-gray-400 italic">Rest</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-3 text-center align-middle">{day.pm.trainingHours || "—"}</td>
                      <td className="border border-gray-300 px-3 py-3 text-center align-middle">{day.pm.rpe || "—"}</td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid md:grid-cols-2 gap-8 text-sm">
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-3">
              Training Details
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Hours:</span>
                <span>{prevTotal.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">PAL:</span>
                <span>
                  {prevData.pal ? parseFloat(prevData.pal) : "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Major Competitions:</span>
                <span>
                  {prevData.trainingDetails?.upcomingMajorCompetitions ||
                    "Not specified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Local Competitions:</span>
                <span>
                  {prevData.trainingDetails?.upcomingLocalCompetitions ||
                    "Not specified"}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-3">
              Performance Details
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Current Performance",
                  val: prevForm.currentPerformance,
                },
                {
                  label: "Coach Goals",
                  val: prevForm.coachPerformanceGoals,
                },
                {
                  label: "Athlete Goals",
                  val: prevForm.athletePerformanceGoals,
                },
                { label: "Other Remarks", val: prevForm.otherText },
              ].map(({ label, val }) =>
                val ? (
                  <div key={label}>
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="text-gray-800">{val}</p>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
    );
  })();

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Training Schedule
        </h2>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {effectiveEditing && !isNewConsultation && (
              <button
                onClick={handleCancel}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            )}
            {effectiveEditing && (
              <button
                onClick={() => {
                  setTrainingData(null);
                  setEditForm(makeEmptyForm());
                  setIsSaved(false);
                  setSaveError("");
                }}
                className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
              >
                Clear All
              </button>
            )}
            <button
              onClick={
                effectiveEditing ? handleSave : () => setIsEditing(true)
              }
              className={`px-3 py-1 text-white text-sm rounded ${
                effectiveEditing && isSaved
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              {effectiveEditing ? (isSaved ? "Saved" : "Save") : "Edit"}
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <p className="text-red-600 text-sm mb-4">{saveError}</p>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(["current", "previous"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "current" ? "Current Session" : "Previous Session"}
          </button>
        ))}
      </div>

      {activeTab === "current" ? currentTabContent : previousTabContent}
    </section>
  );
}
