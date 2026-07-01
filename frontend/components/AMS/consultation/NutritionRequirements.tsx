import { useState, useEffect } from "react";
import { consultationApi } from "@/utils/consultationApi";
import { getApiErrorMessage } from "@/utils/apiError";
import ConsultationCardLastUpdated from "./ConsultationCardLastUpdated";
import { getBackendUrl } from "@/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

const PAL_UPDATED_EVENT = "consultation-pal-updated";

interface NutritionRequirementsProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  prevSessionId?: string;
  // Live values streamed from the Anthropometry card in real time
  liveWeight?: number | null;
  liveHeight?: number | null;
  liveTargetWeight?: number | null;
  onStepStatusChange?: (status: "default" | "dirty" | "saved") => void;
}

interface NutritionRequirementsData {
  id: string | null;
  sessionId: string;
  lastUpdatedAt?: string | null;
  lastUpdatedBy?: string | null;
  pal: number | null;
  minCarbGkg: number | null;
  maxCarbGkg: number | null;
  minProteinGkg: number | null;
  maxProteinGkg: number | null;
  minFatGkg: number | null;
  maxFatGkg: number | null;
  estimatedCarbG: number | null;
  estimatedProteinG: number | null;
  estimatedFatG: number | null;
  commentsWeekday: string | null;
  commentsWeekend: string | null;
  otherRemarks: string | null;
  // Computed by DB (used in view mode)
  minCarbG: number | null;
  maxCarbG: number | null;
  minProteinG: number | null;
  maxProteinG: number | null;
  minFatG: number | null;
  maxFatG: number | null;
  targetMinCarbG: number | null;
  targetMaxCarbG: number | null;
  targetMinProteinG: number | null;
  targetMaxProteinG: number | null;
  targetMinFatG: number | null;
  targetMaxFatG: number | null;
  pctMinCarb: number | null;
  pctMinProtein: number | null;
  pctMinFat: number | null;
  rmrMale: number | null;
  teeMale: number | null;
  targetRmrMale: number | null;
  targetTeeMale: number | null;
  rmrFemale: number | null;
  teeFemale: number | null;
  targetRmrFemale: number | null;
  targetTeeFemale: number | null;
}


interface EditForm {
  pal: string;
  minCarbGkg: string;
  maxCarbGkg: string;
  minProteinGkg: string;
  maxProteinGkg: string;
  minFatGkg: string;
  maxFatGkg: string;
  estimatedCarbG: string;
  estimatedProteinG: string;
  estimatedFatG: string;
  commentsWeekday: string;
  commentsWeekend: string;
  otherRemarks: string;
  // Independent target g/kg/bw inputs (UI-only, default from current)
  targetMinCarbGkg: string;
  targetMaxCarbGkg: string;
  targetMinProteinGkg: string;
  targetMaxProteinGkg: string;
  targetMinFatGkg: string;
  targetMaxFatGkg: string;
}

const emptyForm: EditForm = {
  pal: "",
  minCarbGkg: "",
  maxCarbGkg: "",
  minProteinGkg: "",
  maxProteinGkg: "",
  minFatGkg: "",
  maxFatGkg: "",
  estimatedCarbG: "",
  estimatedProteinG: "",
  estimatedFatG: "",
  commentsWeekday: "",
  commentsWeekend: "",
  otherRemarks: "",
  targetMinCarbGkg: "",
  targetMaxCarbGkg: "",
  targetMinProteinGkg: "",
  targetMaxProteinGkg: "",
  targetMinFatGkg: "",
  targetMaxFatGkg: "",
};

function toEditForm(data: NutritionRequirementsData): EditForm {
  return {
    pal: data.pal?.toString() ?? "",
    minCarbGkg: data.minCarbGkg?.toString() ?? "",
    maxCarbGkg: data.maxCarbGkg?.toString() ?? "",
    minProteinGkg: data.minProteinGkg?.toString() ?? "",
    maxProteinGkg: data.maxProteinGkg?.toString() ?? "",
    minFatGkg: data.minFatGkg?.toString() ?? "",
    maxFatGkg: data.maxFatGkg?.toString() ?? "",
    estimatedCarbG: data.estimatedCarbG?.toString() ?? "",
    estimatedProteinG: data.estimatedProteinG?.toString() ?? "",
    estimatedFatG: data.estimatedFatG?.toString() ?? "",
    commentsWeekday: data.commentsWeekday ?? "",
    commentsWeekend: data.commentsWeekend ?? "",
    otherRemarks: data.otherRemarks ?? "",
    // Default target g/kg/bw to current values
    targetMinCarbGkg: data.minCarbGkg?.toString() ?? "",
    targetMaxCarbGkg: data.maxCarbGkg?.toString() ?? "",
    targetMinProteinGkg: data.minProteinGkg?.toString() ?? "",
    targetMaxProteinGkg: data.maxProteinGkg?.toString() ?? "",
    targetMinFatGkg: data.minFatGkg?.toString() ?? "",
    targetMaxFatGkg: data.maxFatGkg?.toString() ?? "",
  };
}

function n(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const num = typeof v === "number" ? v : parseFloat(v);
  return isNaN(num) ? null : num;
}

function fmt(v: number | string | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || v === "") return "—";
  const num = Number(v);
  if (isNaN(num)) return "—";
  return num.toFixed(decimals);
}

function fmtPct(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const num = Number(v);
  if (isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
}

function applyPalToNutritionData(
  data: NutritionRequirementsData,
  pal: number | null,
): NutritionRequirementsData {
  return {
    ...data,
    pal,
  };
}

export default function NutritionRequirements({
  athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
  prevSessionId,
  liveWeight,
  liveHeight,
  liveTargetWeight,
  onStepStatusChange,
}: NutritionRequirementsProps) {
  const [nutritionRequirementsData, setNutritionRequirementsData] = useState<NutritionRequirementsData | null>(
    null,
  );
  const [prevNutritionRequirementsData, setPrevNutritionRequirementsData] = useState<NutritionRequirementsData | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [prevWeight, setPrevWeight] = useState<number | null>(null);
  const [prevHeight, setPrevHeight] = useState<number | null>(null);
  const [prevTargetWeight, setPrevTargetWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm);
  const [saveError, setSaveError] = useState<string>("");
  const [gender, setGender] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly && activeTab !== "previous";

  useEffect(() => {
    setIsSaved(false);
  }, [editForm]);

  useEffect(() => {
    onStepStatusChange?.(isSaved ? "saved" : effectiveEditing ? "dirty" : "default");
  }, [effectiveEditing, isSaved, onStepStatusChange]);

  useEffect(() => {
    const handlePalUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ sessionId: string; pal: number | null }>;
      if (customEvent.detail?.sessionId !== sessionId) return;
      const syncedPal = customEvent.detail.pal;
      setNutritionRequirementsData((prev) => (prev ? applyPalToNutritionData(prev, syncedPal) : prev));
      setEditForm((prev) => ({
        ...prev,
        pal: syncedPal !== null ? String(syncedPal) : "",
      }));
    };

    window.addEventListener(PAL_UPDATED_EVENT, handlePalUpdated as EventListener);
    return () => {
      window.removeEventListener(PAL_UPDATED_EVENT, handlePalUpdated as EventListener);
    };
  }, [sessionId]);

  const fetchData = async () => {
    if (!sessionId) {
      setNutritionRequirementsData(null);
      setEditForm(emptyForm);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const nutritionRequirementsRes = await (
        consultationApi.getNutritionRequirements(sessionId) as Promise<{
          data: NutritionRequirementsData;
        }>
      );
      let data = nutritionRequirementsRes.data;
      if (data.pal == null) {
        const trainingScheduleRes = await (
          consultationApi.getTrainingSchedule(sessionId) as Promise<{
            data?: {
              trainingInfo?: {
                pal?: number | null;
              };
            };
          } | null>
        ).catch(() => null);
        const trainingPal = trainingScheduleRes?.data?.trainingInfo?.pal ?? null;
        if (trainingPal != null) {
          data = applyPalToNutritionData(data, trainingPal);
        }
      }
      setNutritionRequirementsData(data);
      setEditForm(toEditForm(data));

      const anthropometryRes = await (
        consultationApi.getAnthropometry(sessionId) as Promise<{
          data?: {
            weightKg?: number | null;
            heightCm?: number | null;
            targetWeightKg?: number | null;
          };
        } | null>
      ).catch(() => null);
      const anthropometry = anthropometryRes?.data;

      if (anthropometry) {
        setWeight(anthropometry.weightKg ?? null);
        setHeight(anthropometry.heightCm ?? null);
        setTargetWeight(anthropometry.targetWeightKg ?? null);
      } else {
        // Fallback for older records where only nutrition data exists.
        const gkg = Number(data.minCarbGkg);
        const gVal = Number(data.minCarbG);
        const tgVal = Number(data.targetMinCarbG);
        const rmr = Number(data.rmrMale);

        let w: number | null = null;
        let tw: number | null = null;
        let h: number | null = null;

        if (gkg > 0 && data.minCarbG !== null && !isNaN(gVal)) {
          w = +(gVal / gkg).toFixed(2);
        }
        if (gkg > 0 && data.targetMinCarbG !== null && !isNaN(tgVal)) {
          tw = +(tgVal / gkg).toFixed(2);
        }
        if (w !== null && data.rmrMale !== null && !isNaN(rmr)) {
          h = +((rmr - 11.1 * w + 340) / 8.4).toFixed(2);
        }

        setWeight(w);
        setTargetWeight(tw);
        setHeight(h);
      }
    } catch (err) {
      console.error("Error fetching nutrition requirements:", err);
      setError("Failed to load nutrition requirements data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  useEffect(() => {
    if (!prevSessionId) return;
    (async () => {
      try {
        const nutritionRequirementsRes = await (
          consultationApi.getNutritionRequirements(prevSessionId) as Promise<{ data: NutritionRequirementsData }>
        );
        setPrevNutritionRequirementsData(nutritionRequirementsRes.data);
        const anthropometryRes = await (
          consultationApi.getAnthropometry(prevSessionId) as Promise<{
            data?: {
              weightKg?: number | null;
              heightCm?: number | null;
              targetWeightKg?: number | null;
            };
          } | null>
        ).catch(() => null);
        const anthropometry = anthropometryRes?.data;
        setPrevWeight(anthropometry?.weightKg ?? null);
        setPrevHeight(anthropometry?.heightCm ?? null);
        setPrevTargetWeight(anthropometry?.targetWeightKg ?? null);
      } catch {
        // non-critical
      }
    })();
  }, [prevSessionId]);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${BACKEND_URL}/api/AMS/athletes/${athleteId}/profile`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        setGender(data.athlete?.gender ?? null);
      } catch {
        // non-critical — falls back to showing both sections
      }
    })();
  }, [athleteId]);

  // For new consultations: seed weight/height from the athlete's most recent
  // session's anthropometry so right-column calculations work while editing.
  useEffect(() => {
    if (!isNewConsultation || !athleteId || weight !== null) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        let sourceSessionId = prevSessionId;

        if (!sourceSessionId) {
          const latestRes = await fetch(
            `${BACKEND_URL}/api/Consultation/consultation-session/athlete/${athleteId}/latest`,
            { headers },
          );
          if (!latestRes.ok) return;
          const latestData = await latestRes.json();
          sourceSessionId = latestData?.data?.id as string | undefined;
        }

        if (!sourceSessionId) return;

        const anthroRes = await fetch(
          `${BACKEND_URL}/api/Consultation/sessions/${sourceSessionId}/anthropometry`,
          { headers },
        );
        if (!anthroRes.ok) return;
        const anthroData = await anthroRes.json();
        const a = anthroData?.data;
        if (!a) return;

        if (a.weightKg != null) setWeight(Number(a.weightKg));
        if (a.heightCm != null) setHeight(Number(a.heightCm));
        if (a.targetWeightKg != null) setTargetWeight(Number(a.targetWeightKg));
      } catch {
        // non-critical — calculations will show "—" if unavailable
      }
    })();
  }, [isNewConsultation, athleteId, prevSessionId, weight]);

  // ── Live-calculated values ──────────────────────────────────────────────
  // Prefer live values streamed from the Anthropometry card (updated as user
  // types). Fall back to internally derived values when props are null.
  const currentWeight = liveWeight ?? weight;
  const currentHeight = liveHeight ?? height;
  const currentTargetWeight = liveTargetWeight ?? targetWeight;

  // When viewing the "Previous Session" tab, display data from the previous session
  const displayData = activeTab === "previous" ? prevNutritionRequirementsData : nutritionRequirementsData;
  const displayWeight = activeTab === "previous" ? prevWeight : currentWeight;
  const displayHeight = activeTab === "previous" ? prevHeight : currentHeight;
  const displayTargetWeight =
    activeTab === "previous"
      ? (prevTargetWeight ?? prevWeight)
      : (currentTargetWeight ?? currentWeight);
  const priorityWeight = displayTargetWeight ?? displayWeight;

  const livePal = effectiveEditing ? n(editForm.pal) : (displayData?.pal ?? null);
  const liveMinCarbGkg = effectiveEditing ? n(editForm.minCarbGkg) : (displayData?.minCarbGkg ?? null);
  const liveMaxCarbGkg = effectiveEditing ? n(editForm.maxCarbGkg) : (displayData?.maxCarbGkg ?? null);
  const liveMinProteinGkg = effectiveEditing ? n(editForm.minProteinGkg) : (displayData?.minProteinGkg ?? null);
  const liveMaxProteinGkg = effectiveEditing ? n(editForm.maxProteinGkg) : (displayData?.maxProteinGkg ?? null);
  const liveMinFatGkg = effectiveEditing ? n(editForm.minFatGkg) : (displayData?.minFatGkg ?? null);
  const liveMaxFatGkg = effectiveEditing ? n(editForm.maxFatGkg) : (displayData?.maxFatGkg ?? null);
  const liveEstCarbG = effectiveEditing ? n(editForm.estimatedCarbG) : (displayData?.estimatedCarbG ?? null);
  const liveEstProteinG = effectiveEditing ? n(editForm.estimatedProteinG) : (displayData?.estimatedProteinG ?? null);
  const liveEstFatG = effectiveEditing ? n(editForm.estimatedFatG) : (displayData?.estimatedFatG ?? null);

  // Derived g values — current weight
  const calcG = (gkg: number | null, w: number | null) =>
    gkg !== null && w !== null ? +(gkg * w).toFixed(1) : null;

  const minCarbG = calcG(liveMinCarbGkg, priorityWeight);
  const maxCarbG = calcG(liveMaxCarbGkg, priorityWeight);
  const minProteinG = calcG(liveMinProteinGkg, priorityWeight);
  const maxProteinG = calcG(liveMaxProteinGkg, priorityWeight);
  const minFatG = calcG(liveMinFatGkg, priorityWeight);
  const maxFatG = calcG(liveMaxFatGkg, priorityWeight);

  // Derived g values — target weight (same g/kg/bw as current weight)
  const liveTgtMinCarbGkg = liveMinCarbGkg;
  const liveTgtMaxCarbGkg = liveMaxCarbGkg;
  const liveTgtMinProteinGkg = liveMinProteinGkg;
  const liveTgtMaxProteinGkg = liveMaxProteinGkg;
  const liveTgtMinFatGkg = liveMinFatGkg;
  const liveTgtMaxFatGkg = liveMaxFatGkg;

  const targetMinCarbG = calcG(liveTgtMinCarbGkg, priorityWeight);
  const targetMaxCarbG = calcG(liveTgtMaxCarbGkg, priorityWeight);
  const targetMinProteinG = calcG(liveTgtMinProteinGkg, priorityWeight);
  const targetMaxProteinG = calcG(liveTgtMaxProteinGkg, priorityWeight);
  const targetMinFatG = calcG(liveTgtMinFatGkg, priorityWeight);
  const targetMaxFatG = calcG(liveTgtMaxFatGkg, priorityWeight);

  // % of minimum required
  const calcPct = (estimated: number | null, minG: number | null) =>
    estimated !== null && minG !== null && minG > 0
      ? +((estimated / minG) * 100).toFixed(1)
      : null;

  const pctMinCarb = calcPct(liveEstCarbG, minCarbG);
  const pctMinProtein = calcPct(liveEstProteinG, minProteinG);
  const pctMinFat = calcPct(liveEstFatG, minFatG);

  // RMR/TEE — Male (formula: 11.1 × weight + 8.4 × height − 340)
  const calcRMR = (w: number | null, h: number | null, offset: number) =>
    w !== null && h !== null ? +(11.1 * w + 8.4 * h - offset).toFixed(0) : null;
  const calcTEE = (rmr: number | null, pal: number | null) =>
    rmr !== null && pal !== null ? +(rmr * pal).toFixed(0) : null;

  const rmrMale = calcRMR(priorityWeight, displayHeight, 340);
  const teeMale = calcTEE(rmrMale, livePal);
  const targetRmrMale = calcRMR(priorityWeight, displayHeight, 340);
  const targetTeeMale = calcTEE(targetRmrMale, livePal);

  // RMR/TEE — Female (formula: 11.1 × weight + 8.4 × height − 540)
  const rmrFemale = calcRMR(priorityWeight, displayHeight, 540);
  const teeFemale = calcTEE(rmrFemale, livePal);
  const targetRmrFemale = calcRMR(priorityWeight, displayHeight, 540);
  const targetTeeFemale = calcTEE(targetRmrFemale, livePal);

  const handleSave = async () => {
    try {
      setSaveError("");
      const id = isNewConsultation && ensureSession ? await ensureSession() : sessionId;
      const token = localStorage.getItem("token");
      const body: Record<string, number | string | null> = {};
      if (editForm.pal !== "") body.pal = parseFloat(editForm.pal);
      if (editForm.minCarbGkg !== "") body.minCarbGkg = parseFloat(editForm.minCarbGkg);
      if (editForm.maxCarbGkg !== "") body.maxCarbGkg = parseFloat(editForm.maxCarbGkg);
      if (editForm.minProteinGkg !== "") body.minProteinGkg = parseFloat(editForm.minProteinGkg);
      if (editForm.maxProteinGkg !== "") body.maxProteinGkg = parseFloat(editForm.maxProteinGkg);
      if (editForm.minFatGkg !== "") body.minFatGkg = parseFloat(editForm.minFatGkg);
      if (editForm.maxFatGkg !== "") body.maxFatGkg = parseFloat(editForm.maxFatGkg);
      if (editForm.estimatedCarbG !== "") body.estimatedCarbG = parseFloat(editForm.estimatedCarbG);
      if (editForm.estimatedProteinG !== "") body.estimatedProteinG = parseFloat(editForm.estimatedProteinG);
      if (editForm.estimatedFatG !== "") body.estimatedFatG = parseFloat(editForm.estimatedFatG);
      body.commentsWeekday = editForm.commentsWeekday || null;
      body.commentsWeekend = editForm.commentsWeekend || null;
      body.otherRemarks = editForm.otherRemarks || null;

      const response = await fetch(
        `${BACKEND_URL}/api/Consultation/sessions/${id}/nutrition-requirements`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Failed to save nutrition requirements"),
        );
      }
      const updated = (await response.json()) as { data: NutritionRequirementsData };
      setNutritionRequirementsData(updated.data);
      if (!isNewConsultation) setEditForm(toEditForm(updated.data));
      window.dispatchEvent(
        new CustomEvent(PAL_UPDATED_EVENT, {
          detail: { sessionId: id, pal: updated.data.pal ?? null },
        }),
      );
      setIsEditing(false);
      setIsSaved(true);
    } catch (err) {
      console.error("Error saving nutrition requirements:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to save nutrition requirements.",
      );
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
    if (nutritionRequirementsData) setEditForm(toEditForm(nutritionRequirementsData));
  };

  if (loading) {
    return (
      <section id="nutrition-requirements" className="bg-white rounded-xl shadow-lg p-6 text-gray-900">
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
      <section id="nutrition-requirements" className="bg-white rounded-xl shadow-lg p-6 text-gray-900">
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  // Show only the gender-matched PAL section; show both when gender is unknown
  const showMale =
    !gender || gender.toLowerCase().startsWith("m");
  const showFemale =
    !gender || gender.toLowerCase().startsWith("f");

  // Shared class for live-calculated read-only values — styled like a
  // disabled input so it's visually distinct and updates in real-time.
  const calcClass =
    "inline-block min-w-[72px] px-2 py-1 bg-gray-100 border border-gray-200 rounded text-sm text-right font-medium text-gray-900";

  return (
    <section id="nutrition-requirements" className="bg-white rounded-xl shadow-lg p-6 text-gray-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Nutrition Requirements</h2>
          <ConsultationCardLastUpdated
            lastUpdatedAt={nutritionRequirementsData?.lastUpdatedAt}
            lastUpdatedBy={nutritionRequirementsData?.lastUpdatedBy}
          />
        </div>
        {!readOnly && !effectiveEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-white text-sm rounded bg-gray-800 hover:bg-gray-700"
          >
            Edit
          </button>
        )}
      </div>

      {/* Tab bar */}
      {prevSessionId && (
        <div className="flex border-b border-gray-200 mb-6">
          {(["current", "previous"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-gray-800 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "current" ? "Current Session" : "Previous Session"}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {/* ── Target Intake ──────────────────────────────────────────────── */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Target Intake
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {/* Carbohydrate */}
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Minimum Carbohydrate Requirement (g/kg/bw):
              </span>
              {effectiveEditing ? (
                <input
                  type="number"
                  step="0.1"
                  value={editForm.minCarbGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, minCarbGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
                ) : (
                <div className="text-right">
                  <span className="font-medium">{fmt(displayData?.minCarbGkg ?? null)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Minimum Carbohydrate Requirement (g):
              </span>
              <span className={calcClass}>{fmt(targetMinCarbG)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Maximum Carbohydrate Requirement (g/kg/bw):
              </span>
              {effectiveEditing ? (
                <input
                  type="number"
                  step="0.1"
                  value={editForm.maxCarbGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, maxCarbGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
                ) : (
                <div className="text-right">
                  <span className="font-medium">{fmt(displayData?.maxCarbGkg ?? null)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Maximum Carbohydrate Requirement (g):
              </span>
              <span className={calcClass}>{fmt(targetMaxCarbG)}</span>
            </div>

            {/* Protein */}
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Minimum Protein Requirement (g/kg/bw):
              </span>
              {effectiveEditing ? (
                <input
                  type="number"
                  step="0.1"
                  value={editForm.minProteinGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, minProteinGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
                ) : (
                <div className="text-right">
                  <span className="font-medium">{fmt(displayData?.minProteinGkg ?? null)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Minimum Protein Requirement (g):
              </span>
              <span className={calcClass}>{fmt(targetMinProteinG)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Maximum Protein Requirement (g/kg/bw):
              </span>
              {effectiveEditing ? (
                <input
                  type="number"
                  step="0.1"
                  value={editForm.maxProteinGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, maxProteinGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
                ) : (
                <div className="text-right">
                  <span className="font-medium">{fmt(displayData?.maxProteinGkg ?? null)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Maximum Protein Requirement (g):
              </span>
              <span className={calcClass}>{fmt(targetMaxProteinG)}</span>
            </div>

            {/* Fat */}
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Minimum Fat Requirement (g/kg/bw):
              </span>
              {effectiveEditing ? (
                <input
                  type="number"
                  step="0.1"
                  value={editForm.minFatGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, minFatGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
                ) : (
                <div className="text-right">
                  <span className="font-medium">{fmt(displayData?.minFatGkg ?? null)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Minimum Fat Requirement (g):
              </span>
              <span className={calcClass}>{fmt(targetMinFatG)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Maximum Fat Requirement (g/kg/bw):
              </span>
              {effectiveEditing ? (
                <input
                  type="number"
                  step="0.1"
                  value={editForm.maxFatGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, maxFatGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
                ) : (
                <div className="text-right">
                  <span className="font-medium">{fmt(displayData?.maxFatGkg ?? null)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Maximum Fat Requirement (g):
              </span>
              <span className={calcClass}>{fmt(targetMaxFatG)}</span>
            </div>
          </div>

          {/* Estimated Intake */}
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  Estimated Carbohydrate Intake (g):
                </span>
                {effectiveEditing ? (
                  <input
                    type="number"
                    step="1"
                    value={editForm.estimatedCarbG}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        estimatedCarbG: e.target.value,
                      }))
                    }
                    style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                  />
                ) : (
                  <div className="text-right">
                    <span className="font-medium">{fmt(displayData?.estimatedCarbG ?? null)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  % of Min Carbohydrate Requirement:
                </span>
                <span className={calcClass}>{fmtPct(pctMinCarb)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  Estimated Protein Intake (g):
                </span>
                {effectiveEditing ? (
                  <input
                    type="number"
                    step="1"
                    value={editForm.estimatedProteinG}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        estimatedProteinG: e.target.value,
                      }))
                    }
                    style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                  />
                ) : (
                  <div className="text-right">
                    <span className="font-medium">{fmt(displayData?.estimatedProteinG ?? null)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  % of Min Protein Requirement:
                </span>
                <span className={calcClass}>{fmtPct(pctMinProtein)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  Estimated Fat Intake (g):
                </span>
                {effectiveEditing ? (
                  <input
                    type="number"
                    step="1"
                    value={editForm.estimatedFatG}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        estimatedFatG: e.target.value,
                      }))
                    }
                    style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                  />
                ) : (
                  <div className="text-right">
                    <span className="font-medium">{fmt(displayData?.estimatedFatG ?? null)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">% of Min Fat Requirement:</span>
                <span className={calcClass}>{fmtPct(pctMinFat)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-900 mb-2">
                  Comments on Weekday Intake:
                </label>
                {effectiveEditing ? (
                  <textarea
                    style={{ color: "#111827" }}
                  className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={editForm.commentsWeekday}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        commentsWeekday: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div>
                    <p className="text-sm text-gray-900">{displayData?.commentsWeekday || "—"}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-900 mb-2">
                  Comments on Weekend Intake:
                </label>
                {effectiveEditing ? (
                  <textarea
                    style={{ color: "#111827" }}
                  className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={editForm.commentsWeekend}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        commentsWeekend: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div>
                    <p className="text-sm text-gray-900">{displayData?.commentsWeekend || "—"}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm border-t pt-4">
          <span className="text-gray-900 font-medium">
            Physical Activity Level (PAL):
          </span>
          <div className="text-right">
            {effectiveEditing ? (
              <>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.pal}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, pal: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              </>
            ) : (
              <span className="font-medium">{fmt(displayData?.pal ?? null, 2)}</span>
            )}
          </div>
        </div>

        {/* Gender-based RMR/TEE — shows only the relevant section */}
        {showMale && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {showFemale ? "Male" : "Energy Expenditure"}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  Resting Metabolic Rate (RMR):
                </span>
                <div className="flex items-center gap-1">
                  <span className={calcClass}>{fmt(rmrMale, 0)}</span>
                  <span className="text-gray-900">kcal</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  Total Energy Expenditure (TEE):
                </span>
                <div className="flex items-center gap-1">
                  <span className={calcClass}>{fmt(teeMale, 0)}</span>
                  <span className="text-gray-900">kcal</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Target Weight RMR:</span>
                <div className="flex items-center gap-1">
                  <span className={calcClass}>{fmt(targetRmrMale, 0)}</span>
                  <span className="text-gray-900">kcal</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Target Weight TEE:</span>
                <div className="flex items-center gap-1">
                  <span className={calcClass}>{fmt(targetTeeMale, 0)}</span>
                  <span className="text-gray-900">kcal</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showFemale && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {showMale ? "Female" : "Energy Expenditure"}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  Resting Metabolic Rate (RMR):
                </span>
                <div className="flex items-center gap-1">
                  <span className={calcClass}>{fmt(rmrFemale, 0)}</span>
                  <span className="text-gray-900">kcal</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  Total Energy Expenditure (TEE):
                </span>
                <div className="flex items-center gap-1">
                  <span className={calcClass}>{fmt(teeFemale, 0)}</span>
                  <span className="text-gray-900">kcal</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Target Weight RMR:</span>
                <div className="flex items-center gap-1">
                  <span className={calcClass}>{fmt(targetRmrFemale, 0)}</span>
                  <span className="text-gray-900">kcal</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-900">Target Weight TEE:</span>
                <div className="flex items-center gap-1">
                  <span className={calcClass}>{fmt(targetTeeFemale, 0)}</span>
                  <span className="text-gray-900">kcal</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Remarks */}
        <div>
          <label className="block text-sm text-gray-900 mb-2">
            Other Remarks:
          </label>
          {effectiveEditing ? (
            <textarea
              style={{ color: "#111827" }}
                  className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="Input Text Here"
              value={editForm.otherRemarks}
              onChange={(e) =>
                setEditForm((p) => ({
                  ...p,
                  otherRemarks: e.target.value,
                }))
              }
            />
          ) : (
            <div>
              <p className="text-sm text-gray-900">{displayData?.otherRemarks || "—"}</p>
            </div>
          )}
        </div>
      </div>

      {!readOnly && effectiveEditing && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}
          <div className="flex items-center justify-end gap-2">
            {!isNewConsultation && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                setNutritionRequirementsData(null);
                setEditForm(emptyForm);
                setIsSaved(false);
                setSaveError("");
              }}
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
