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
}

type MacroType = "carb" | "fat" | "protein";

interface MacroEntry {
  type: MacroType;
  low: string;
  high: string;
}

interface MacroRow {
  id: string;
  label: string;
  food: string;
  macros: MacroEntry[];
  extra: Record<string, string>;
}

interface CustomCol {
  id: string;
  label: string;
}

interface MealLogState {
  rows: MacroRow[];
  customCols: CustomCol[];
  prevRecommendation: string;
  athleteActions: string;
  sleepHours: string;
  sleepComments: string;
}

// Legacy API shape (what the backend stores/returns)
interface LegacyMealSlot {
  food: string | null;
  macro: string | null;
}

interface LegacyMealLogData {
  id: string | null;
  sessionId: string;
  amBreakfast: LegacyMealSlot;
  amTraining: LegacyMealSlot;
  pmLunch: LegacyMealSlot;
  pmTraining: LegacyMealSlot;
  pmDinner: LegacyMealSlot;
  supper: LegacyMealSlot;
  totalCarbohydrateIntake: number | null;
  totalProteinIntake: number | null;
  totalFatIntake: number | null;
  otherRemarks: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

function makeDefaultRows(): MacroRow[] {
  return Array.from({ length: 1 }, (_, i) => ({
    id: `row-default-${i}`,
    label: "",
    food: "",
    macros: [],
    extra: {},
  }));
}

function makeDefaultState(): MealLogState {
  return {
    rows: makeDefaultRows(),
    customCols: [],
    prevRecommendation: "",
    athleteActions: "",
    sleepHours: "",
    sleepComments: "",
  };
}

// ─── Serialization ────────────────────────────────────────────────────────────

function parseOtherRemarks(raw: string | null): MealLogState {
  if (!raw) return makeDefaultState();
  try {
    const parsed = JSON.parse(raw);
    if (parsed.__mlv === 2) {
      return {
        rows: parsed.rows ?? makeDefaultRows(),
        customCols: parsed.customCols ?? [],
        prevRecommendation: parsed.prevRecommendation ?? "",
        athleteActions: parsed.athleteActions ?? "",
        sleepHours: parsed.sleepHours ?? "",
        sleepComments: parsed.sleepComments ?? "",
      };
    }
  } catch {
    // fall through to legacy
  }
  return makeDefaultState();
}

function parseLegacy(_data: LegacyMealLogData): MealLogState {
  // Legacy format can't be meaningfully mapped to the new free-text row format
  return makeDefaultState();
}

function fromApiData(data: LegacyMealLogData): MealLogState {
  const raw = data.otherRemarks ?? null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.__mlv === 2) {
        return parseOtherRemarks(raw);
      }
    } catch {
      // fall through
    }
  }
  // Legacy format
  return parseLegacy(data);
}

function sumMacro(rows: MacroRow[], type: MacroType, field: "low" | "high"): number {
  return rows.reduce((acc, row) => {
    return acc + row.macros
      .filter((m) => m.type === type)
      .reduce((s, m) => s + (parseFloat(m[field]) || 0), 0);
  }, 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssessmentSection({
  rows,
  liveWeight,
}: {
  rows: MacroRow[];
  liveWeight?: number | null;
}) {
  const totals = useMemo(() => ({
    lowCarb: sumMacro(rows, "carb", "low"),
    highCarb: sumMacro(rows, "carb", "high"),
    lowFat: sumMacro(rows, "fat", "low"),
    highFat: sumMacro(rows, "fat", "high"),
    lowProtein: sumMacro(rows, "protein", "low"),
    highProtein: sumMacro(rows, "protein", "high"),
  }), [rows]);

  const fmt = (low: number, high: number) => {
    if (low === 0 && high === 0) return "—";
    return `${low} – ${high} g`;
  };

  const fmtKg = (low: number, high: number) => {
    if (!liveWeight) return null;
    if (low === 0 && high === 0) return "—";
    return `${(low / liveWeight).toFixed(1)} – ${(high / liveWeight).toFixed(1)} g/kg/bw`;
  };

  const rows2 = [
    {
      label: "Total Carb Intake (g)",
      val: fmt(totals.lowCarb, totals.highCarb),
      kg: fmtKg(totals.lowCarb, totals.highCarb),
    },
    {
      label: "Total Fat Intake (g)",
      val: fmt(totals.lowFat, totals.highFat),
      kg: fmtKg(totals.lowFat, totals.highFat),
    },
    {
      label: "Total Protein Intake (g)",
      val: fmt(totals.lowProtein, totals.highProtein),
      kg: fmtKg(totals.lowProtein, totals.highProtein),
    },
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-base font-semibold text-gray-800 mb-3">
        Assessment (auto-calculated)
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows2.map(({ label, val, kg }) => (
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

function ReadOnlyTable({
  rows,
  customCols,
}: {
  rows: MacroRow[];
  customCols: CustomCol[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
              Meal
            </th>
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
              Food Intake
            </th>
            <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
              Macronutrients
            </th>
            {customCols.map((cc) => (
              <th
                key={cc.id}
                className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap"
              >
                {cc.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="even:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                {row.label || "—"}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-gray-700">
                {row.food || "—"}
              </td>
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
              {customCols.map((cc) => (
                <td key={cc.id} className="border border-gray-300 px-3 py-2 text-gray-700">
                  {row.extra[cc.id] || "—"}
                </td>
              ))}
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
}: MealLogsProps) {
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");

  // Current session state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string>("");

  // The persisted data (what was last saved/loaded)
  const [savedData, setSavedData] = useState<LegacyMealLogData | null>(null);

  // Edit state (the new v2 format)
  const [state, setState] = useState<MealLogState>(makeDefaultState());

  // Previous session
  const [prevLoading, setPrevLoading] = useState(false);
  const [prevState, setPrevState] = useState<MealLogState | null>(null);

  // Add-column UI
  const [addingCol, setAddingCol] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");

  // Add-macro UI
  const [addingMacroRowId, setAddingMacroRowId] = useState<string | null>(null);

  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly;

  // Reset isSaved when state changes
  useEffect(() => {
    setIsSaved(false);
  }, [state]);

  // ── Fetch current session ──────────────────────────────────────────────────
  const fetchMealLogs = async () => {
    if (!sessionId) {
      setState(makeDefaultState());
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = (await consultationApi.getMealLogs(sessionId)) as {
        data: LegacyMealLogData;
      };
      const data = response.data;
      setSavedData(data);
      setState(fromApiData(data));
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
    fetchMealLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Fetch previous session ─────────────────────────────────────────────────
  useEffect(() => {
    if (!prevSessionId) {
      setPrevState(null);
      return;
    }
    setPrevLoading(true);
    (async () => {
      try {
        const response = (await consultationApi.getMealLogs(prevSessionId)) as {
          data: LegacyMealLogData;
        };
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
      const id =
        isNewConsultation && ensureSession ? await ensureSession() : sessionId;

      const { rows, customCols, prevRecommendation, athleteActions, sleepHours, sleepComments } =
        state;

      // Sums for legacy fields
      const highCarbSum = sumMacro(rows, "carb", "high");
      const highProteinSum = sumMacro(rows, "protein", "high");
      const highFatSum = sumMacro(rows, "fat", "high");

      const payload = {
        // Legacy compat fields
        amBreakfast: { food: rows[0]?.food ?? null, macro: null },
        amTraining: { food: rows[2]?.food ?? null, macro: null },
        pmLunch: { food: rows[3]?.food ?? null, macro: null },
        pmTraining: { food: rows[5]?.food ?? null, macro: null },
        pmDinner: { food: rows[6]?.food ?? null, macro: null },
        supper: { food: rows[8]?.food ?? null, macro: null },
        totalCarbohydrateIntake: highCarbSum || null,
        totalProteinIntake: highProteinSum || null,
        totalFatIntake: highFatSum || null,
        // New format stored in otherRemarks
        otherRemarks: JSON.stringify({
          __mlv: 2,
          rows,
          customCols,
          prevRecommendation,
          athleteActions,
          sleepHours,
          sleepComments,
        }),
      };

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/sessions/${id}/meal-log`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const updated = (await response.json()) as { data: LegacyMealLogData };
      setSavedData(updated.data);
      if (!isNewConsultation) {
        setState(fromApiData(updated.data));
      }
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
    if (savedData) {
      setState(fromApiData(savedData));
    } else {
      setState(makeDefaultState());
    }
  };

  // ── Row helpers ────────────────────────────────────────────────────────────
  const updateRow = (id: string, field: keyof MacroRow | string, value: string) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (r.id !== id) return r;
        if (field === "label" || field === "food") return { ...r, [field]: value };
        return r;
      }),
    }));
  };

  const updateRowExtra = (id: string, colId: string, value: string) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === id ? { ...r, extra: { ...r.extra, [colId]: value } } : r
      ),
    }));
  };

  const addRow = () => {
    const newRow: MacroRow = {
      id: `row-${Date.now()}`,
      label: "",
      food: "",
      macros: [],
      extra: {},
    };
    setState((prev) => ({ ...prev, rows: [...prev.rows, newRow] }));
  };

  const deleteRow = (id: string) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.filter((r) => r.id !== id),
    }));
  };

  const addCustomCol = () => {
    const label = newColLabel.trim();
    if (!label) return;
    const colId = `col-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      customCols: [...prev.customCols, { id: colId, label }],
      rows: prev.rows.map((r) => ({ ...r, extra: { ...r.extra, [colId]: "" } })),
    }));
    setNewColLabel("");
    setAddingCol(false);
  };

  const removeCustomCol = (colId: string) => {
    setState((prev) => ({
      ...prev,
      customCols: prev.customCols.filter((c) => c.id !== colId),
      rows: prev.rows.map((r) => {
        const extra = { ...r.extra };
        delete extra[colId];
        return { ...r, extra };
      }),
    }));
  };

  // ── Macro entry helpers ────────────────────────────────────────────────────
  const addMacroEntry = (rowId: string, type: MacroType) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === rowId
          ? { ...r, macros: [...r.macros, { type, low: "", high: "" }] }
          : r
      ),
    }));
    setAddingMacroRowId(null);
  };

  const removeMacroEntry = (rowId: string, index: number) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === rowId
          ? { ...r, macros: r.macros.filter((_, i) => i !== index) }
          : r
      ),
    }));
  };

  const updateMacroEntry = (rowId: string, index: number, field: "low" | "high", value: string) => {
    setState((prev) => ({
      ...prev,
      rows: prev.rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              macros: r.macros.map((m, i) =>
                i === index ? { ...m, [field]: value } : m
              ),
            }
          : r
      ),
    }));
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
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

  // ── Standard table columns ─────────────────────────────────────────────────
  const stdEditCols = [
    { key: "food" as keyof MacroRow, label: "Food Intake", type: "text" as const, wide: true },
  ];

  // ── Current Session Tab content (JSX variable, NOT a component — avoids remount on state change)
  const currentTabContent = (
    <div className="space-y-6">
      {/* 1. Meal + Macro Table */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          Meal &amp; Macronutrient Log
        </h3>
        <div className="overflow-x-auto">
          <table className="border-collapse border border-gray-300 text-sm min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                  Meal
                </th>
                {stdEditCols.map((c) => (
                  <th
                    key={c.key}
                    className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                  Macronutrients
                </th>
                {state.customCols.map((cc) => (
                  <th
                    key={cc.id}
                    className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {cc.label}
                      {effectiveEditing && (
                        <button
                          onClick={() => removeCustomCol(cc.id)}
                          className="text-red-400 hover:text-red-600 ml-1"
                          title="Remove column"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </span>
                  </th>
                ))}
                {effectiveEditing && (
                  <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap w-10">
                    {/* Delete col */}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row) => (
                <tr key={row.id} className="even:bg-gray-50">
                  {/* Meal (free text) */}
                  <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">
                    {effectiveEditing ? (
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => updateRow(row.id, "label", e.target.value)}
                        placeholder="e.g. 8am Breakfast"
                        className="w-36 px-1 py-0.5 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="font-medium text-gray-800">
                        {row.label || "—"}
                      </span>
                    )}
                  </td>

                  {/* Standard columns */}
                  {stdEditCols.map((c) => (
                    <td key={c.key} className="border border-gray-300 px-2 py-1">
                      {effectiveEditing ? (
                        <input
                          type={c.type ?? "text"}
                          value={row[c.key] as string}
                          onChange={(e) => updateRow(row.id, c.key, e.target.value)}
                          className={`px-1 py-0.5 border border-gray-300 rounded text-sm ${
                            c.wide ? "w-40" : "w-20"
                          }`}
                        />
                      ) : (
                        <span className="text-gray-700">
                          {(row[c.key] as string) || "—"}
                        </span>
                      )}
                    </td>
                  ))}

                  {/* Macronutrients cell */}
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
                            <button
                              onClick={() => removeMacroEntry(row.id, idx)}
                              className="text-red-400 hover:text-red-600 ml-0.5"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                        {/* + picker */}
                        {addingMacroRowId === row.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            {(["carb", "fat", "protein"] as MacroType[]).map((t) => (
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
                            <button
                              onClick={() => setAddingMacroRowId(null)}
                              className="text-gray-400 hover:text-gray-600 text-xs ml-1"
                            >✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingMacroRowId(row.id)}
                            className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600 mt-0.5"
                          >
                            <Plus size={11} /> Add
                          </button>
                        )}
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

                  {/* Custom columns */}
                  {state.customCols.map((cc) => (
                    <td key={cc.id} className="border border-gray-300 px-2 py-1">
                      {effectiveEditing ? (
                        <input
                          type="text"
                          value={row.extra[cc.id] ?? ""}
                          onChange={(e) =>
                            updateRowExtra(row.id, cc.id, e.target.value)
                          }
                          className="w-24 px-1 py-0.5 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <span className="text-gray-700">
                          {row.extra[cc.id] || "—"}
                        </span>
                      )}
                    </td>
                  ))}

                  {/* Delete row */}
                  {effectiveEditing && (
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {state.rows.length > 1 && (
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="text-red-400 hover:text-red-600"
                          title="Delete row"
                        >
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

        {/* Add Row / Add Column buttons */}
        {effectiveEditing && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={addRow}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100"
            >
              <Plus size={14} />
              Add Row
            </button>

            {!addingCol ? (
              <button
                onClick={() => setAddingCol(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-700 border border-gray-200 rounded hover:bg-gray-100"
              >
                <Plus size={14} />
                Add Column
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newColLabel}
                  onChange={(e) => setNewColLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustomCol();
                    if (e.key === "Escape") {
                      setAddingCol(false);
                      setNewColLabel("");
                    }
                  }}
                  placeholder="Column name"
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-36"
                  autoFocus
                />
                <button
                  onClick={addCustomCol}
                  className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setAddingCol(false);
                    setNewColLabel("");
                  }}
                  className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Assessment */}
      <AssessmentSection rows={state.rows} liveWeight={liveWeight} />

      {/* 3. Prev Recommendation & Athlete Actions */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          Previous Recommendation &amp; Athlete Actions
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Previous Recommendation
            </label>
            {effectiveEditing ? (
              <textarea
                value={state.prevRecommendation}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    prevRecommendation: e.target.value,
                  }))
                }
                rows={5}
                placeholder="Enter previous recommendation..."
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-y"
              />
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {state.prevRecommendation || "—"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Athlete Actions
            </label>
            {effectiveEditing ? (
              <textarea
                value={state.athleteActions}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, athleteActions: e.target.value }))
                }
                rows={5}
                placeholder="Enter athlete actions..."
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-y"
              />
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {state.athleteActions || "—"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Sleep */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Sleep</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sleep Hours
            </label>
            {effectiveEditing ? (
              <input
                type="number"
                value={state.sleepHours}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, sleepHours: e.target.value }))
                }
                placeholder="e.g. 7.5"
                min={0}
                max={24}
                step={0.5}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm w-32"
              />
            ) : (
              <p className="text-sm text-gray-800">
                {state.sleepHours ? `${state.sleepHours} hrs` : "—"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments on Sleep
            </label>
            {effectiveEditing ? (
              <textarea
                value={state.sleepComments}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    sleepComments: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Enter comments on sleep..."
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm resize-y"
              />
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {state.sleepComments || "—"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Previous Session Tab content (IIFE JSX variable, NOT a component)
  const previousTabContent = (() => {
    if (!prevSessionId) {
      return (
        <p className="text-sm text-gray-500 py-6 text-center">
          No previous session data available.
        </p>
      );
    }
    if (prevLoading) {
      return (
        <div className="animate-pulse space-y-3 py-4">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      );
    }
    if (!prevState) {
      return (
        <p className="text-sm text-gray-500 py-6 text-center">
          No previous session data available.
        </p>
      );
    }

    return (
      <div className="space-y-6">
        <ReadOnlyTable rows={prevState.rows} customCols={prevState.customCols} />
        <AssessmentSection rows={prevState.rows} liveWeight={liveWeight} />

        {/* Prev Rec & Athlete Actions */}
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-3">
            Previous Recommendation &amp; Athlete Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Previous Recommendation
              </label>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {prevState.prevRecommendation || "—"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Athlete Actions
              </label>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {prevState.athleteActions || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Sleep */}
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-3">Sleep</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sleep Hours
              </label>
              <p className="text-sm text-gray-800">
                {prevState.sleepHours ? `${prevState.sleepHours} hrs` : "—"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments on Sleep
              </label>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {prevState.sleepComments || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section id="meal-logs" className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Meal Logs</h2>
        {!readOnly && activeTab === "current" && (
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
                  setState(makeDefaultState());
                  setSavedData(null);
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
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("current")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "current"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Current Session
          </button>
          <button
            onClick={() => setActiveTab("previous")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "previous"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Previous Session
          </button>
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "current" ? currentTabContent : previousTabContent}
    </section>
  );
}
