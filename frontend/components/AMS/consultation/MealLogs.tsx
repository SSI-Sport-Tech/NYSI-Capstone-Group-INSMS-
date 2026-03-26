"use client";
import { useState, useEffect, useMemo } from "react";
import { consultationApi, ConsultationApiError } from "@/utils/consultationApi";
import { Plus, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealLogsProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  prevSessionId?: string;
  liveWeight?: number | null;
  onStepStatusChange?: (status: "default" | "dirty" | "saved") => void;
}

type MacroType = "carb" | "fat" | "protein";

interface MacroEntry {
  type: MacroType;
  low: string;
  high: string;
}

interface MacroRow {
  id: string;
  foodTime: string; // "HH:MM" or ""
  food: string;
  macros: MacroEntry[];
}

interface MealLogState {
  rows: MacroRow[];
  mealOtherRemarks: string;
  sleep: {
    sleepDurationH: string;
    sleepQuality: string;
    otherRemarks: string;
  };
}

// API shapes (v9)
interface MealEntryApi {
  foodTime: string | null;
  mealDescription: string;
  lowerCarbG: number | null;
  upperCarbG: number | null;
  lowerProteinG: number | null;
  upperProteinG: number | null;
  lowerFatG: number | null;
  upperFatG: number | null;
}

interface MealLogApiData {
  entries: MealEntryApi[];
  mealOtherRemarks: string | null;
  sleep: {
    sleepDurationH: number | null;
    sleepQuality: number | null;
    otherRemarks: string | null;
  } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

function makeDefaultRows(): MacroRow[] {
  return [{ id: `row-default-0`, foodTime: "", food: "", macros: [] }];
}

function makeDefaultState(): MealLogState {
  return {
    rows: makeDefaultRows(),
    mealOtherRemarks: "",
    sleep: { sleepDurationH: "", sleepQuality: "", otherRemarks: "" },
  };
}

// ─── Serialization ────────────────────────────────────────────────────────────

function fromApiData(data: MealLogApiData): MealLogState {
  const rows: MacroRow[] = data.entries.length
    ? data.entries.map((e, i) => {
        const macros: MacroEntry[] = [];
        if (e.lowerCarbG !== null || e.upperCarbG !== null)
          macros.push({
            type: "carb",
            low: e.lowerCarbG !== null ? String(e.lowerCarbG) : "",
            high: e.upperCarbG !== null ? String(e.upperCarbG) : "",
          });
        if (e.lowerProteinG !== null || e.upperProteinG !== null)
          macros.push({
            type: "protein",
            low: e.lowerProteinG !== null ? String(e.lowerProteinG) : "",
            high: e.upperProteinG !== null ? String(e.upperProteinG) : "",
          });
        if (e.lowerFatG !== null || e.upperFatG !== null)
          macros.push({
            type: "fat",
            low: e.lowerFatG !== null ? String(e.lowerFatG) : "",
            high: e.upperFatG !== null ? String(e.upperFatG) : "",
          });
        return {
          id: `row-api-${i}`,
          foodTime: e.foodTime ? e.foodTime.substring(0, 5) : "",
          food: e.mealDescription ?? "",
          macros,
        };
      })
    : makeDefaultRows();

  return {
    rows,
    mealOtherRemarks: data.mealOtherRemarks ?? "",
    sleep: {
      sleepDurationH:
        data.sleep?.sleepDurationH != null
          ? String(data.sleep.sleepDurationH)
          : "",
      sleepQuality:
        data.sleep?.sleepQuality != null ? String(data.sleep.sleepQuality) : "",
      otherRemarks: data.sleep?.otherRemarks ?? "",
    },
  };
}

function toApiPayload(state: MealLogState) {
  const entries = state.rows
    .filter((r) => r.food.trim())
    .map((r) => {
      const carb = r.macros.find((m) => m.type === "carb");
      const protein = r.macros.find((m) => m.type === "protein");
      const fat = r.macros.find((m) => m.type === "fat");
      return {
        foodTime: r.foodTime || null,
        mealDescription: r.food.trim(),
        lowerCarbG: carb && carb.low !== "" ? parseFloat(carb.low) : null,
        upperCarbG: carb && carb.high !== "" ? parseFloat(carb.high) : null,
        lowerProteinG: protein && protein.low !== "" ? parseFloat(protein.low) : null,
        upperProteinG: protein && protein.high !== "" ? parseFloat(protein.high) : null,
        lowerFatG: fat && fat.low !== "" ? parseFloat(fat.low) : null,
        upperFatG: fat && fat.high !== "" ? parseFloat(fat.high) : null,
      };
    });

  const { sleep } = state;
  return {
    entries,
    mealOtherRemarks: state.mealOtherRemarks.trim() || null,
    sleep: {
      sleepDurationH:
        sleep.sleepDurationH !== "" ? parseFloat(sleep.sleepDurationH) : null,
      sleepQuality:
        sleep.sleepQuality !== "" ? parseInt(sleep.sleepQuality, 10) : null,
      otherRemarks: sleep.otherRemarks.trim() || null,
    },
  };
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTE_OPTIONS = [
  "00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55",
];

function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [hh, mm] = value ? value.split(":") : ["", ""];

  const update = (newHH: string, newMM: string) => {
    if (newHH && newMM) onChange(`${newHH}:${newMM}`);
    else if (newHH) onChange(`${newHH}:${mm || "00"}`);
    else if (newMM) onChange(`${hh || "00"}:${newMM}`);
    else onChange("");
  };

  return (
    <div className="flex items-center gap-1">
      <select
        value={hh || ""}
        onChange={(e) => update(e.target.value, mm || "00")}
        className="px-1 py-0.5 border border-gray-300 rounded text-sm w-14"
      >
        <option value="">HH</option>
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-gray-500 text-sm">:</span>
      <select
        value={mm || ""}
        onChange={(e) => update(hh || "00", e.target.value)}
        className="px-1 py-0.5 border border-gray-300 rounded text-sm w-14"
      >
        <option value="">MM</option>
        {MINUTE_OPTIONS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Assessment ───────────────────────────────────────────────────────────────

function sumMacro(rows: MacroRow[], type: MacroType, field: "low" | "high"): number {
  return rows.reduce(
    (acc, row) =>
      acc +
      row.macros
        .filter((m) => m.type === type)
        .reduce((s, m) => s + (parseFloat(m[field]) || 0), 0),
    0
  );
}

function AssessmentSection({
  rows,
  liveWeight,
}: {
  rows: MacroRow[];
  liveWeight?: number | null;
}) {
  const totals = useMemo(
    () => ({
      lowCarb: sumMacro(rows, "carb", "low"),
      highCarb: sumMacro(rows, "carb", "high"),
      lowFat: sumMacro(rows, "fat", "low"),
      highFat: sumMacro(rows, "fat", "high"),
      lowProtein: sumMacro(rows, "protein", "low"),
      highProtein: sumMacro(rows, "protein", "high"),
    }),
    [rows]
  );

  const fmt = (low: number, high: number) =>
    low === 0 && high === 0 ? "—" : `${low} – ${high} g`;

  const fmtKg = (low: number, high: number) => {
    if (!liveWeight) return null;
    if (low === 0 && high === 0) return "—";
    return `${(low / liveWeight).toFixed(1)} – ${(high / liveWeight).toFixed(1)} g/kg/bw`;
  };

  const items = [
    { label: "Total Carb Intake (g)", val: fmt(totals.lowCarb, totals.highCarb), kg: fmtKg(totals.lowCarb, totals.highCarb) },
    { label: "Total Fat Intake (g)", val: fmt(totals.lowFat, totals.highFat), kg: fmtKg(totals.lowFat, totals.highFat) },
    { label: "Total Protein Intake (g)", val: fmt(totals.lowProtein, totals.highProtein), kg: fmtKg(totals.lowProtein, totals.highProtein) },
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-base font-semibold text-gray-800 mb-3 underline">
        Assessment (auto-calculated)
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ label, val, kg }) => (
          <div key={label} className="bg-white rounded p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-semibold text-gray-900">{val}</p>
            {kg !== null ? (
              <p className="text-xs text-blue-600 mt-0.5">{kg}</p>
            ) : (
              <p className="text-xs text-gray-400 italic mt-0.5">
                — <span>(weight from Anthropometry step)</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Read-only table ──────────────────────────────────────────────────────────

function ReadOnlyTable({ rows }: { rows: MacroRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Meal</th>
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Food Intake</th>
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Macronutrients</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="even:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                {row.foodTime || "—"}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-gray-700">{row.food || "—"}</td>
              <td className="border border-gray-300 px-3 py-2 text-gray-700">
                <div className="space-y-0.5">
                  {row.macros.length === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    row.macros.map((entry, idx) => (
                      <p key={idx} className={`text-xs ${
                        entry.type === "carb" ? "text-blue-600" :
                        entry.type === "fat" ? "text-orange-500" : "text-green-600"
                      }`}>
                        {entry.type === "carb" ? "Carb" : entry.type === "fat" ? "Fat" : "Protein"}: {entry.low || "—"}–{entry.high || "—"} g
                      </p>
                    ))
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MealLogs({
  athleteId: _athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
  prevSessionId,
  liveWeight,
  onStepStatusChange,
}: MealLogsProps) {
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string>("");

  const [savedData, setSavedData] = useState<MealLogApiData | null>(null);
  const [state, setState] = useState<MealLogState>(makeDefaultState());

  const [prevLoading, setPrevLoading] = useState(false);
  const [prevState, setPrevState] = useState<MealLogState | null>(null);

  const [addingMacroRowId, setAddingMacroRowId] = useState<string | null>(null);

  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly;

  useEffect(() => { setIsSaved(false); }, [state]);
  useEffect(() => {
    onStepStatusChange?.(isSaved ? "saved" : effectiveEditing ? "dirty" : "default");
  }, [effectiveEditing, isSaved, onStepStatusChange]);

  // ── Fetch current session ──────────────────────────────────────────────────
  const fetchData = async () => {
    if (!sessionId) { setState(makeDefaultState()); setLoading(false); return; }
    try {
      setLoading(true);
      setError("");
      const response = (await consultationApi.getMealLogs(sessionId)) as { data: MealLogApiData };
      setSavedData(response.data);
      setState(fromApiData(response.data));
    } catch (err) {
      if (err instanceof ConsultationApiError && err.status === 404) {
        setSavedData(null);
        setState(makeDefaultState());
      } else {
        console.error("Error fetching meal logs:", err);
        setError("Failed to load meal logs");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Fetch previous session ─────────────────────────────────────────────────
  useEffect(() => {
    if (!prevSessionId) { setPrevState(null); return; }
    setPrevLoading(true);
    (async () => {
      try {
        const response = (await consultationApi.getMealLogs(prevSessionId)) as { data: MealLogApiData };
        setPrevState(fromApiData(response.data));
      } catch {
        setPrevState(null);
      } finally {
        setPrevLoading(false);
      }
    })();
  }, [prevSessionId]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaveError("");
      const id = isNewConsultation && ensureSession ? await ensureSession() : sessionId;
      const payload = toApiPayload(state);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/sessions/${id}/meal-log`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const updated = (await response.json()) as { data: MealLogApiData };
      setSavedData(updated.data);
      if (!isNewConsultation) setState(fromApiData(updated.data));
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
    if (savedData) setState(fromApiData(savedData));
    else setState(makeDefaultState());
  };

  // ── Row helpers ────────────────────────────────────────────────────────────
  const updateRow = (id: string, field: "foodTime" | "food", value: string) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id !== id ? r : { ...r, [field]: value })),
    }));
  };

  const addRow = () => {
    setState((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        { id: `row-${Date.now()}`, foodTime: "", food: "", macros: [] },
      ],
    }));
  };

  const deleteRow = (id: string) => {
    setState((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== id) }));
  };

  // ── Macro helpers ──────────────────────────────────────────────────────────
  const addMacroEntry = (rowId: string, type: MacroType) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === rowId ? { ...r, macros: [...r.macros, { type, low: "", high: "" }] } : r
      ),
    }));
    setAddingMacroRowId(null);
  };

  const removeMacroEntry = (rowId: string, index: number) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === rowId ? { ...r, macros: r.macros.filter((_, i) => i !== index) } : r
      ),
    }));
  };

  const updateMacroEntry = (rowId: string, index: number, field: "low" | "high", value: string) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === rowId
          ? { ...r, macros: r.macros.map((m, i) => (i === index ? { ...m, [field]: value } : m)) }
          : r
      ),
    }));
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section id="meal-logs" className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
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
          <button onClick={fetchData} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
            Retry
          </button>
        </div>
      </section>
    );
  }

  // ── Current Session Tab ────────────────────────────────────────────────────
  const currentTabContent = (
    <div className="space-y-6">
      {/* 1. Meal & Macro Table */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3 underline">Meal &amp; Macronutrient Log</h3>
        <div className="overflow-x-auto">
          <table className="border-collapse border border-gray-300 text-sm min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Meal</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Food Intake</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">Macronutrients</th>
                {effectiveEditing && <th className="border border-gray-300 px-3 py-2 w-10" />}
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row) => (
                <tr key={row.id} className="even:bg-gray-50">
                  {/* Meal (time picker) */}
                  <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">
                    {effectiveEditing ? (
                      <TimePicker
                        value={row.foodTime}
                        onChange={(v) => updateRow(row.id, "foodTime", v)}
                      />
                    ) : (
                      <span className="font-medium text-gray-800">{row.foodTime || "—"}</span>
                    )}
                  </td>

                  {/* Food Intake */}
                  <td className="border border-gray-300 px-2 py-1">
                    {effectiveEditing ? (
                      <input
                        type="text"
                        value={row.food}
                        onChange={(e) => updateRow(row.id, "food", e.target.value)}
                        placeholder="e.g. Rice with chicken"
                        className="w-40 px-1 py-0.5 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="text-gray-700">{row.food || "—"}</span>
                    )}
                  </td>

                  {/* Macronutrients */}
                  <td className="border border-gray-300 px-2 py-2 min-w-[200px]">
                    {effectiveEditing ? (
                      <div className="space-y-1.5">
                        {row.macros.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className={`text-xs font-medium w-14 shrink-0 ${
                              entry.type === "carb" ? "text-blue-600" :
                              entry.type === "fat" ? "text-orange-500" : "text-green-600"
                            }`}>
                              {entry.type === "carb" ? "Carb" : entry.type === "fat" ? "Fat" : "Protein"}
                            </span>
                            <input
                              type="number"
                              value={entry.low}
                              onChange={(e) => updateMacroEntry(row.id, idx, "low", e.target.value)}
                              placeholder="low"
                              className="w-14 px-1 py-0.5 border border-gray-300 rounded text-xs"
                            />
                            <span className="text-gray-400 text-xs">–</span>
                            <input
                              type="number"
                              value={entry.high}
                              onChange={(e) => updateMacroEntry(row.id, idx, "high", e.target.value)}
                              placeholder="high"
                              className="w-14 px-1 py-0.5 border border-gray-300 rounded text-xs"
                            />
                            <span className="text-gray-400 text-xs">g</span>
                            <button onClick={() => removeMacroEntry(row.id, idx)} className="text-red-400 hover:text-red-600 ml-0.5">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                        {addingMacroRowId === row.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            {(["carb", "fat", "protein"] as MacroType[])
                              .filter((t) => !row.macros.some((m) => m.type === t))
                              .map((t) => (
                                <button
                                  key={t}
                                  onClick={() => addMacroEntry(row.id, t)}
                                  className={`px-2 py-0.5 text-xs rounded border font-medium ${
                                    t === "carb" ? "border-blue-300 text-blue-600 hover:bg-blue-50" :
                                    t === "fat" ? "border-orange-300 text-orange-500 hover:bg-orange-50" :
                                    "border-green-300 text-green-600 hover:bg-green-50"
                                  }`}
                                >
                                  {t === "carb" ? "Carb" : t === "fat" ? "Fat" : "Protein"}
                                </button>
                              ))}
                            <button onClick={() => setAddingMacroRowId(null)} className="text-gray-400 hover:text-gray-600 text-xs ml-1">✕</button>
                          </div>
                        ) : row.macros.length < 3 ? (
                          <button
                            onClick={() => setAddingMacroRowId(row.id)}
                            className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600 mt-0.5"
                          >
                            <Plus size={11} /> Add
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {row.macros.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          row.macros.map((entry, idx) => (
                            <p key={idx} className={`text-xs ${
                              entry.type === "carb" ? "text-blue-600" :
                              entry.type === "fat" ? "text-orange-500" : "text-green-600"
                            }`}>
                              {entry.type === "carb" ? "Carb" : entry.type === "fat" ? "Fat" : "Protein"}: {entry.low || "—"}–{entry.high || "—"} g
                            </p>
                          ))
                        )}
                      </div>
                    )}
                  </td>

                  {/* Delete row */}
                  {effectiveEditing && (
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {state.rows.length > 1 && (
                        <button onClick={() => deleteRow(row.id)} className="text-red-400 hover:text-red-600" title="Delete row">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {effectiveEditing && (
          <div className="mt-3">
            <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100">
              <Plus size={14} /> Add Row
            </button>
          </div>
        )}
      </div>

      {/* 2. Assessment */}
      <AssessmentSection rows={state.rows} liveWeight={liveWeight} />

      {/* 3. Other Remarks */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 underline">
          Other Remarks
        </label>
        {effectiveEditing ? (
          <textarea
            value={state.mealOtherRemarks}
            onChange={(e) =>
              setState((prev) => ({ ...prev, mealOtherRemarks: e.target.value }))
            }
            rows={3}
            placeholder="Enter any additional remarks..."
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-y"
          />
        ) : (
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {state.mealOtherRemarks || "—"}
          </p>
        )}
      </div>

      {/* 4. Sleep */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3 underline">Sleep</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 underline">Sleep Duration (hrs)</label>
            {effectiveEditing ? (
              <input
                type="number"
                value={state.sleep.sleepDurationH}
                onChange={(e) => setState((prev) => ({ ...prev, sleep: { ...prev.sleep, sleepDurationH: e.target.value } }))}
                placeholder="e.g. 7.5"
                min={0} max={24} step={0.5}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm w-32"
              />
            ) : (
              <p className="text-sm text-gray-800">{state.sleep.sleepDurationH ? `${state.sleep.sleepDurationH} hrs` : "—"}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 underline">Sleep Quality (1–10)</label>
            {effectiveEditing ? (
              <input
                type="number"
                value={state.sleep.sleepQuality}
                onChange={(e) => setState((prev) => ({ ...prev, sleep: { ...prev.sleep, sleepQuality: e.target.value } }))}
                placeholder="1–10"
                min={1} max={10} step={1}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm w-24"
              />
            ) : (
              <p className="text-sm text-gray-800">{state.sleep.sleepQuality ? `${state.sleep.sleepQuality} / 10` : "—"}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 underline">Comments on Sleep</label>
            {effectiveEditing ? (
              <textarea
                value={state.sleep.otherRemarks}
                onChange={(e) => setState((prev) => ({ ...prev, sleep: { ...prev.sleep, otherRemarks: e.target.value } }))}
                rows={3}
                placeholder="Enter comments on sleep..."
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-y"
              />
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{state.sleep.otherRemarks || "—"}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Previous Session Tab ───────────────────────────────────────────────────
  const previousTabContent = (() => {
    if (!prevSessionId) return <p className="text-sm text-gray-500 py-6 text-center">No previous session data available.</p>;
    if (prevLoading) return <div className="animate-pulse space-y-3 py-4"><div className="h-4 bg-gray-200 rounded" /><div className="h-4 bg-gray-200 rounded w-3/4" /></div>;
    if (!prevState) return <p className="text-sm text-gray-500 py-6 text-center">No previous session data available.</p>;

    return (
      <div className="space-y-6">
        <ReadOnlyTable rows={prevState.rows} />
        <AssessmentSection rows={prevState.rows} liveWeight={liveWeight} />
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-3 underline">Sleep</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 underline">Sleep Duration (hrs)</label>
              <p className="text-sm text-gray-800">{prevState.sleep.sleepDurationH ? `${prevState.sleep.sleepDurationH} hrs` : "—"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 underline">Sleep Quality (1–10)</label>
              <p className="text-sm text-gray-800">{prevState.sleep.sleepQuality ? `${prevState.sleep.sleepQuality} / 10` : "—"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 underline">Comments on Sleep</label>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{prevState.sleep.otherRemarks || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section id="meal-logs" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 underline">Meal Log &amp; Sleep</h2>
        {!readOnly && !effectiveEditing && activeTab === "current" && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-white text-sm rounded bg-gray-800 hover:bg-gray-700"
          >
            Edit
          </button>
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {(["current", "previous"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "current" ? "Current Session" : "Previous Session"}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "current" ? currentTabContent : previousTabContent}

      {!readOnly && effectiveEditing && activeTab === "current" && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}
          <div className="flex items-center justify-end gap-2">
            {!isNewConsultation && (
              <button onClick={handleCancel} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
                Cancel
              </button>
            )}
            <button
              onClick={() => { setState(makeDefaultState()); setSavedData(null); setIsSaved(false); setSaveError(""); }}
              className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
            >
              Clear All
            </button>
            <button
              onClick={handleSave}
              className={`px-4 py-2 text-white text-sm rounded ${isSaved ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              {isSaved ? "Draft Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
