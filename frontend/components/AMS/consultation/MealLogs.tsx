import { useState, useEffect } from "react";
import { consultationApi, ConsultationApiError } from "@/utils/consultationApi";

interface MealLogsProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  prevSessionId?: string;
}

interface MealSlot {
  food: string | null;
  macro: string | null;
}

interface MealLogData {
  id: string | null;
  sessionId: string;
  amBreakfast: MealSlot;
  amTraining: MealSlot;
  pmLunch: MealSlot;
  pmTraining: MealSlot;
  pmDinner: MealSlot;
  supper: MealSlot;
  totalCarbohydrateIntake: number | null;
  totalProteinIntake: number | null;
  totalFatIntake: number | null;
  otherRemarks: string | null;
}

type MealTimeKey =
  | "amBreakfast"
  | "amTraining"
  | "pmLunch"
  | "pmTraining"
  | "pmDinner"
  | "supper";

interface EditLog {
  amBreakfast: { food: string; macro: string };
  amTraining: { food: string; macro: string };
  pmLunch: { food: string; macro: string };
  pmTraining: { food: string; macro: string };
  pmDinner: { food: string; macro: string };
  supper: { food: string; macro: string };
  totalCarbohydrateIntake: string;
  totalProteinIntake: string;
  totalFatIntake: string;
  otherRemarks: string;
}

const MEAL_ROWS: { key: MealTimeKey; label: string }[] = [
  { key: "amBreakfast", label: "AM Breakfast" },
  { key: "amTraining", label: "AM Training" },
  { key: "pmLunch", label: "PM Lunch" },
  { key: "pmTraining", label: "PM Training" },
  { key: "pmDinner", label: "PM Dinner" },
  { key: "supper", label: "Supper" },
];

function toEditLog(data: MealLogData): EditLog {
  const slot = (s: MealSlot) => ({
    food: s.food ?? "",
    macro: s.macro ?? "",
  });
  return {
    amBreakfast: slot(data.amBreakfast),
    amTraining: slot(data.amTraining),
    pmLunch: slot(data.pmLunch),
    pmTraining: slot(data.pmTraining),
    pmDinner: slot(data.pmDinner),
    supper: slot(data.supper),
    totalCarbohydrateIntake: data.totalCarbohydrateIntake?.toString() ?? "",
    totalProteinIntake: data.totalProteinIntake?.toString() ?? "",
    totalFatIntake: data.totalFatIntake?.toString() ?? "",
    otherRemarks: data.otherRemarks ?? "",
  };
}

const emptyEditLog: EditLog = {
  amBreakfast: { food: "", macro: "" },
  amTraining: { food: "", macro: "" },
  pmLunch: { food: "", macro: "" },
  pmTraining: { food: "", macro: "" },
  pmDinner: { food: "", macro: "" },
  supper: { food: "", macro: "" },
  totalCarbohydrateIntake: "",
  totalProteinIntake: "",
  totalFatIntake: "",
  otherRemarks: "",
};

export default function MealLogs({
  athleteId: _athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
  prevSessionId,
}: MealLogsProps) {
  const [mealLog, setMealLog] = useState<MealLogData | null>(null);
  const [prevMealLog, setPrevMealLog] = useState<MealLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editLog, setEditLog] = useState<EditLog>(emptyEditLog);
  const [saveError, setSaveError] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);

  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly;

  useEffect(() => {
    setIsSaved(false);
  }, [editLog]);

  const fetchMealLogs = async () => {
    if (!sessionId) {
      setMealLog(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = (await consultationApi.getMealLogs(sessionId)) as {
        data: MealLogData;
      };
      const data = response.data;
      setMealLog(data);
      setEditLog(toEditLog(data));
    } catch (err) {
      if (err instanceof ConsultationApiError && err.status === 404) {
        setMealLog(null);
      } else {
        console.error("Error fetching meal logs:", err);
        setError("Failed to load meal logs");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealLogs();
  }, [sessionId]);

  useEffect(() => {
    if (!prevSessionId) return;
    (async () => {
      try {
        const response = (await consultationApi.getMealLogs(prevSessionId)) as { data: MealLogData };
        setPrevMealLog(response.data);
      } catch {
        // non-critical
      }
    })();
  }, [prevSessionId]);

  const handleSave = async () => {
    try {
      setSaveError("");
      const id = isNewConsultation && ensureSession ? await ensureSession() : sessionId;
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/sessions/${id}/meal-log`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amBreakfast: editLog.amBreakfast,
            amTraining: editLog.amTraining,
            pmLunch: editLog.pmLunch,
            pmTraining: editLog.pmTraining,
            pmDinner: editLog.pmDinner,
            supper: editLog.supper,
            totalCarbohydrateIntake: editLog.totalCarbohydrateIntake
              ? parseFloat(editLog.totalCarbohydrateIntake)
              : null,
            totalProteinIntake: editLog.totalProteinIntake
              ? parseFloat(editLog.totalProteinIntake)
              : null,
            totalFatIntake: editLog.totalFatIntake
              ? parseFloat(editLog.totalFatIntake)
              : null,
            otherRemarks: editLog.otherRemarks || null,
          }),
        },
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const updated = (await response.json()) as { data: MealLogData };
      setMealLog(updated.data);
      if (!isNewConsultation) setEditLog(toEditLog(updated.data));
      setIsEditing(false);
      setIsSaved(true);
    } catch (err) {
      console.error("Error saving meal logs:", err);
      setSaveError("Failed to save. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
    if (mealLog) setEditLog(toEditLog(mealLog));
  };

  const updateMeal = (
    mealKey: MealTimeKey,
    field: "food" | "macro",
    value: string,
  ) => {
    setEditLog((prev) => ({
      ...prev,
      [mealKey]: { ...prev[mealKey], [field]: value },
    }));
  };

  const PrevVal = ({ val }: { val: string | number | null | undefined }) => {
    if (!isNewConsultation || !prevMealLog || val == null || val === "") return null;
    return (
      <p className="text-xs text-gray-400 italic mt-0.5 flex items-center gap-1">
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><polyline points="12 6 12 12 16 14" strokeWidth="2"/></svg>
        Prev: {val}
      </p>
    );
  };

  if (loading) {
    return (
      <section id="meal-logs" className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="meal-logs" className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchMealLogs}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="meal-logs" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Meal Logs</h2>
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
                  setMealLog(null);
                  setEditLog(emptyEditLog);
                  setIsSaved(false);
                  setSaveError("");
                }}
                className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
              >
                Clear All
              </button>
            )}
            <button
              onClick={effectiveEditing ? handleSave : () => setIsEditing(true)}
              className={`px-3 py-1 text-white text-sm rounded ${effectiveEditing && isSaved ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              {effectiveEditing ? (isSaved ? "Saved" : "Save") : "Edit"}
            </button>
          </div>
        )}
      </div>

      {saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}

      <div className="space-y-6">
        {/* Meal Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 w-32">
                  Time
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Food Intake (Usual)
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 w-64">
                  Macronutrient Intake
                </th>
              </tr>
            </thead>
            <tbody>
              {MEAL_ROWS.map(({ key, label }) => (
                <tr key={key}>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                    {label}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    {effectiveEditing ? (
                      <input
                        type="text"
                        value={editLog[key].food}
                        onChange={(e) =>
                          updateMeal(key, "food", e.target.value)
                        }
                        placeholder="Food description..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <div>
                        {mealLog?.[key].food || "—"}
                        <PrevVal val={prevMealLog?.[key].food} />
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 text-center">
                    {effectiveEditing ? (
                      <input
                        type="text"
                        value={editLog[key].macro}
                        onChange={(e) =>
                          updateMeal(key, "macro", e.target.value)
                        }
                        placeholder="e.g. CHO: 55g, P: 20g, F: 10g"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <div>
                        {mealLog?.[key].macro || "—"}
                        <PrevVal val={prevMealLog?.[key].macro} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Assessment Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Total Carbohydrate Intake (g):
              </span>
              {effectiveEditing ? (
                <input
                  type="number"
                  value={editLog.totalCarbohydrateIntake}
                  onChange={(e) =>
                    setEditLog((prev) => ({
                      ...prev,
                      totalCarbohydrateIntake: e.target.value,
                    }))
                  }
                  className={`w-20 px-2 py-1 border border-gray-300 rounded text-center transition-colors ${
                    // Compare the editing value to the original value
                    editLog.totalCarbohydrateIntake !== (mealLog?.totalCarbohydrateIntake?.toString() ?? "")
                      ? "text-black" // Changed: Black
                      : "text-gray-400" // Unchanged: Gray
                  }`}
                />
              ) : (
                <div className="text-right">
                  <span className="font-medium text-black">{mealLog?.totalCarbohydrateIntake ?? "—"}</span>
                  <PrevVal val={prevMealLog?.totalCarbohydrateIntake} />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Protein Intake (g):</span>
              {effectiveEditing ? (
                <input
                  type="number"
                  value={editLog.totalProteinIntake}
                  onChange={(e) =>
                    setEditLog((prev) => ({
                      ...prev,
                      totalProteinIntake: e.target.value,
                    }))
                  }
                  className={`w-20 px-2 py-1 border border-gray-300 rounded text-center transition-colors ${
                    // Compare the editing value to the original value
                    editLog.totalProteinIntake !== (mealLog?.totalProteinIntake?.toString() ?? "")
                      ? "text-black" // Changed: Black
                      : "text-gray-400" // Unchanged: Gray
                  }`}
                />
              ) : (
                <div className="text-right">
                  <span className="font-medium text-black">{mealLog?.totalProteinIntake ?? "—"}</span>
                  <PrevVal val={prevMealLog?.totalProteinIntake} />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Fat Intake (g):</span>
              {effectiveEditing ? (
                <input
                  type="number"
                  value={editLog.totalFatIntake}
                  onChange={(e) =>
                    setEditLog((prev) => ({
                      ...prev,
                      totalFatIntake: e.target.value,
                    }))
                  }
                  className={`w-20 px-2 py-1 border border-gray-300 rounded text-center transition-colors ${
                    // Compare the editing value to the original value
                    editLog.totalFatIntake !== (mealLog?.totalFatIntake?.toString() ?? "")
                      ? "text-black" // Changed: Black
                      : "text-gray-400" // Unchanged: Gray
                  }`}
                />
              ) : (
                <div className="text-right">
                  <span className="font-medium text-black">{mealLog?.totalFatIntake ?? "—"}</span>
                  <PrevVal val={prevMealLog?.totalFatIntake} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-2">
              Other Remarks:
            </label>
            {effectiveEditing ? (
              <textarea
                 className={`w-full px-2 py-1 border border-gray-300 rounded transition-colors ${
                    // Compare the editing value to the original value
                    editLog.otherRemarks !== (mealLog?.otherRemarks?.toString() ?? "")
                      ? "text-black" // Changed: Black
                      : "text-gray-400" // Unchanged: Gray
                  }`}
                placeholder="Input Text Here"
                value={editLog.otherRemarks}
                onChange={(e) =>
                  setEditLog((prev) => ({
                    ...prev,
                    otherRemarks: e.target.value,
                  }))
                }
              />
            ) : (
              <div>
                <p className="text-sm text-gray-900">{mealLog?.otherRemarks || "—"}</p>
                <PrevVal val={prevMealLog?.otherRemarks} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
