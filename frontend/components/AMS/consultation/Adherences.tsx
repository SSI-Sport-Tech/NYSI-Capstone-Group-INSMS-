import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { consultationApi } from "@/utils/consultationApi";

interface AdherencesProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  // Live values streamed from the Anthropometry card in real time
  liveWeight?: number | null;
  liveHeight?: number | null;
  liveTargetWeight?: number | null;
}

interface AdherencesData {
  id: string | null;
  sessionId: string;
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

function toEditForm(data: AdherencesData): EditForm {
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

export default function Adherences({
  athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
  liveWeight,
  liveHeight,
  liveTargetWeight,
}: AdherencesProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [adherencesData, setAdherencesData] = useState<AdherencesData | null>(
    null,
  );
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm);
  const [saveError, setSaveError] = useState<string>("");
  const [gender, setGender] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly;

  useEffect(() => {
    setIsSaved(false);
  }, [editForm]);

  const fetchData = async () => {
    if (!sessionId) {
      setAdherencesData(null);
      setEditForm(emptyForm);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const adherencesRes = await (
        consultationApi.getAdherences(sessionId) as Promise<{
          data: AdherencesData;
        }>
      );
      const data = adherencesRes.data;
      setAdherencesData(data);
      setEditForm(toEditForm(data));

      // Derive weight, targetWeight, height from DB-computed values so live
      // calculations work without a separate anthropometry API call.
      // weight      = minCarbG  / minCarbGkg
      // targetWeight = targetMinCarbG / minCarbGkg
      // height       = (rmrMale - 11.1 × weight + 340) / 8.4
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
    } catch (err) {
      console.error("Error fetching adherences:", err);
      setError("Failed to load adherences data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/AMS/athletes/${athleteId}/profile`,
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
        const latestRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-update/athlete/${athleteId}/latest`,
          { headers },
        );
        if (!latestRes.ok) return;
        const latestData = await latestRes.json();
        const prevSessionId = latestData?.data?.id as string | undefined;
        if (!prevSessionId) return;

        const anthroRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/sessions/${prevSessionId}/anthropometry`,
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
  }, [isNewConsultation, athleteId, weight]);

  // ── Live-calculated values ──────────────────────────────────────────────
  // In edit mode: compute from form inputs + anthropometry data
  // In view mode: use DB-computed values returned by the API

  // Prefer live values streamed from the Anthropometry card (updated as user
  // types). Fall back to internally derived values when props are null.
  const effectiveWeight = liveWeight ?? weight;
  const effectiveHeight = liveHeight ?? height;
  const effectiveTargetWeight = liveTargetWeight ?? targetWeight;

  const livePal = effectiveEditing ? n(editForm.pal) : (adherencesData?.pal ?? null);
  const liveMinCarbGkg = effectiveEditing ? n(editForm.minCarbGkg) : (adherencesData?.minCarbGkg ?? null);
  const liveMaxCarbGkg = effectiveEditing ? n(editForm.maxCarbGkg) : (adherencesData?.maxCarbGkg ?? null);
  const liveMinProteinGkg = effectiveEditing ? n(editForm.minProteinGkg) : (adherencesData?.minProteinGkg ?? null);
  const liveMaxProteinGkg = effectiveEditing ? n(editForm.maxProteinGkg) : (adherencesData?.maxProteinGkg ?? null);
  const liveMinFatGkg = effectiveEditing ? n(editForm.minFatGkg) : (adherencesData?.minFatGkg ?? null);
  const liveMaxFatGkg = effectiveEditing ? n(editForm.maxFatGkg) : (adherencesData?.maxFatGkg ?? null);
  const liveEstCarbG = effectiveEditing ? n(editForm.estimatedCarbG) : (adherencesData?.estimatedCarbG ?? null);
  const liveEstProteinG = effectiveEditing ? n(editForm.estimatedProteinG) : (adherencesData?.estimatedProteinG ?? null);
  const liveEstFatG = effectiveEditing ? n(editForm.estimatedFatG) : (adherencesData?.estimatedFatG ?? null);

  // Derived g values — current weight
  const calcG = (gkg: number | null, w: number | null) =>
    gkg !== null && w !== null ? +(gkg * w).toFixed(1) : null;

  const minCarbG = effectiveEditing ? calcG(liveMinCarbGkg, effectiveWeight) : (adherencesData?.minCarbG ?? null);
  const maxCarbG = effectiveEditing ? calcG(liveMaxCarbGkg, effectiveWeight) : (adherencesData?.maxCarbG ?? null);
  const minProteinG = effectiveEditing ? calcG(liveMinProteinGkg, effectiveWeight) : (adherencesData?.minProteinG ?? null);
  const maxProteinG = effectiveEditing ? calcG(liveMaxProteinGkg, effectiveWeight) : (adherencesData?.maxProteinG ?? null);
  const minFatG = effectiveEditing ? calcG(liveMinFatGkg, effectiveWeight) : (adherencesData?.minFatG ?? null);
  const maxFatG = effectiveEditing ? calcG(liveMaxFatGkg, effectiveWeight) : (adherencesData?.maxFatG ?? null);

  // Derived g values — target weight (use independent target g/kg/bw inputs)
  const liveTgtMinCarbGkg = effectiveEditing ? n(editForm.targetMinCarbGkg) : (adherencesData?.minCarbGkg ?? null);
  const liveTgtMaxCarbGkg = effectiveEditing ? n(editForm.targetMaxCarbGkg) : (adherencesData?.maxCarbGkg ?? null);
  const liveTgtMinProteinGkg = effectiveEditing ? n(editForm.targetMinProteinGkg) : (adherencesData?.minProteinGkg ?? null);
  const liveTgtMaxProteinGkg = effectiveEditing ? n(editForm.targetMaxProteinGkg) : (adherencesData?.maxProteinGkg ?? null);
  const liveTgtMinFatGkg = effectiveEditing ? n(editForm.targetMinFatGkg) : (adherencesData?.minFatGkg ?? null);
  const liveTgtMaxFatGkg = effectiveEditing ? n(editForm.targetMaxFatGkg) : (adherencesData?.maxFatGkg ?? null);

  const targetMinCarbG = effectiveEditing ? calcG(liveTgtMinCarbGkg, effectiveTargetWeight) : (adherencesData?.targetMinCarbG ?? null);
  const targetMaxCarbG = effectiveEditing ? calcG(liveTgtMaxCarbGkg, effectiveTargetWeight) : (adherencesData?.targetMaxCarbG ?? null);
  const targetMinProteinG = effectiveEditing ? calcG(liveTgtMinProteinGkg, effectiveTargetWeight) : (adherencesData?.targetMinProteinG ?? null);
  const targetMaxProteinG = effectiveEditing ? calcG(liveTgtMaxProteinGkg, effectiveTargetWeight) : (adherencesData?.targetMaxProteinG ?? null);
  const targetMinFatG = effectiveEditing ? calcG(liveTgtMinFatGkg, effectiveTargetWeight) : (adherencesData?.targetMinFatG ?? null);
  const targetMaxFatG = effectiveEditing ? calcG(liveTgtMaxFatGkg, effectiveTargetWeight) : (adherencesData?.targetMaxFatG ?? null);

  // % of minimum required
  const calcPct = (estimated: number | null, minG: number | null) =>
    estimated !== null && minG !== null && minG > 0
      ? +((estimated / minG) * 100).toFixed(1)
      : null;

  const pctMinCarb = effectiveEditing ? calcPct(liveEstCarbG, minCarbG) : (adherencesData?.pctMinCarb ?? null);
  const pctMinProtein = effectiveEditing ? calcPct(liveEstProteinG, minProteinG) : (adherencesData?.pctMinProtein ?? null);
  const pctMinFat = effectiveEditing ? calcPct(liveEstFatG, minFatG) : (adherencesData?.pctMinFat ?? null);

  // RMR/TEE — Male (formula: 11.1 × weight + 8.4 × height − 340)
  const calcRMR = (w: number | null, h: number | null, offset: number) =>
    w !== null && h !== null ? +(11.1 * w + 8.4 * h - offset).toFixed(0) : null;
  const calcTEE = (rmr: number | null, pal: number | null) =>
    rmr !== null && pal !== null ? +(rmr * pal).toFixed(0) : null;

  const rmrMale = effectiveEditing ? calcRMR(effectiveWeight, effectiveHeight, 340) : (adherencesData?.rmrMale ?? null);
  const teeMale = effectiveEditing ? calcTEE(rmrMale, livePal) : (adherencesData?.teeMale ?? null);
  const targetRmrMale = effectiveEditing ? calcRMR(effectiveTargetWeight, effectiveHeight, 340) : (adherencesData?.targetRmrMale ?? null);
  const targetTeeMale = effectiveEditing ? calcTEE(targetRmrMale, livePal) : (adherencesData?.targetTeeMale ?? null);

  // RMR/TEE — Female (formula: 11.1 × weight + 8.4 × height − 540)
  const rmrFemale = effectiveEditing ? calcRMR(effectiveWeight, effectiveHeight, 540) : (adherencesData?.rmrFemale ?? null);
  const teeFemale = effectiveEditing ? calcTEE(rmrFemale, livePal) : (adherencesData?.teeFemale ?? null);
  const targetRmrFemale = effectiveEditing ? calcRMR(effectiveTargetWeight, effectiveHeight, 540) : (adherencesData?.targetRmrFemale ?? null);
  const targetTeeFemale = effectiveEditing ? calcTEE(targetRmrFemale, livePal) : (adherencesData?.targetTeeFemale ?? null);

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
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/sessions/${id}/adherences`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const updated = (await response.json()) as { data: AdherencesData };
      setAdherencesData(updated.data);
      if (!isNewConsultation) setEditForm(toEditForm(updated.data));
      setIsEditing(false);
      setIsSaved(true);
    } catch (err) {
      console.error("Error saving adherences:", err);
      setSaveError("Failed to save. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
    if (adherencesData) setEditForm(toEditForm(adherencesData));
  };

  if (loading) {
    return (
      <section id="adherences" className="bg-white rounded-xl shadow-lg p-6 text-gray-900">
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
      <section id="adherences" className="bg-white rounded-xl shadow-lg p-6 text-gray-900">
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
    <section id="adherences" className="bg-white rounded-xl shadow-lg p-6 text-gray-900">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900">Adherences</h2>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
        </button>
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
                  setAdherencesData(null);
                  setEditForm(emptyForm);
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

      {!collapsed && (
        <>
      {saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}

      <div className="space-y-6">
        {/* ── Current Intake ─────────────────────────────────────────────── */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Current Intake
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
                <span className="font-medium">
                  {fmt(adherencesData?.minCarbGkg ?? null)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Minimum Carbohydrate Requirement (g):
              </span>
              <span className={calcClass}>{fmt(minCarbG)}</span>
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
                <span className="font-medium">
                  {fmt(adherencesData?.maxCarbGkg ?? null)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Maximum Carbohydrate Requirement (g):
              </span>
              <span className={calcClass}>{fmt(maxCarbG)}</span>
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
                    setEditForm((p) => ({
                      ...p,
                      minProteinGkg: e.target.value,
                    }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              ) : (
                <span className="font-medium">
                  {fmt(adherencesData?.minProteinGkg ?? null)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Minimum Protein Requirement (g):
              </span>
              <span className={calcClass}>{fmt(minProteinG)}</span>
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
                    setEditForm((p) => ({
                      ...p,
                      maxProteinGkg: e.target.value,
                    }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              ) : (
                <span className="font-medium">
                  {fmt(adherencesData?.maxProteinGkg ?? null)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Maximum Protein Requirement (g):
              </span>
              <span className={calcClass}>{fmt(maxProteinG)}</span>
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
                <span className="font-medium">
                  {fmt(adherencesData?.minFatGkg ?? null)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Minimum Fat Requirement (g):
              </span>
              <span className={calcClass}>{fmt(minFatG)}</span>
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
                <span className="font-medium">
                  {fmt(adherencesData?.maxFatGkg ?? null)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-900">
                Maximum Fat Requirement (g):
              </span>
              <span className={calcClass}>{fmt(maxFatG)}</span>
            </div>
          </div>
        </div>

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
                  value={editForm.targetMinCarbGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, targetMinCarbGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              ) : (
                <span className="font-medium">{fmt(adherencesData?.minCarbGkg ?? null)}</span>
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
                  value={editForm.targetMaxCarbGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, targetMaxCarbGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              ) : (
                <span className="font-medium">{fmt(adherencesData?.maxCarbGkg ?? null)}</span>
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
                  value={editForm.targetMinProteinGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, targetMinProteinGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              ) : (
                <span className="font-medium">{fmt(adherencesData?.minProteinGkg ?? null)}</span>
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
                  value={editForm.targetMaxProteinGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, targetMaxProteinGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              ) : (
                <span className="font-medium">{fmt(adherencesData?.maxProteinGkg ?? null)}</span>
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
                  value={editForm.targetMinFatGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, targetMinFatGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              ) : (
                <span className="font-medium">{fmt(adherencesData?.minFatGkg ?? null)}</span>
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
                  value={editForm.targetMaxFatGkg}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, targetMaxFatGkg: e.target.value }))
                  }
                  style={{ color: "#111827" }}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              ) : (
                <span className="font-medium">{fmt(adherencesData?.maxFatGkg ?? null)}</span>
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
                  <span className="font-medium">
                    {fmt(adherencesData?.estimatedCarbG ?? null)}
                  </span>
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
                  <span className="font-medium">
                    {fmt(adherencesData?.estimatedProteinG ?? null)}
                  </span>
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
                  <span className="font-medium">
                    {fmt(adherencesData?.estimatedFatG ?? null)}
                  </span>
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
                  <p className="text-sm text-gray-900">
                    {adherencesData?.commentsWeekday || "—"}
                  </p>
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
                  <p className="text-sm text-gray-900">
                    {adherencesData?.commentsWeekend || "—"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm border-t pt-4">
          <span className="text-gray-900 font-medium">
            Physical Activity Level (PAL):
          </span>
          {effectiveEditing ? (
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
          ) : (
            <span className="font-medium">
              {fmt(adherencesData?.pal ?? null, 2)}
            </span>
          )}
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
            <p className="text-sm text-gray-900">
              {adherencesData?.otherRemarks || "—"}
            </p>
          )}
        </div>
      </div>
        </>
      )}
    </section>
  );
}
