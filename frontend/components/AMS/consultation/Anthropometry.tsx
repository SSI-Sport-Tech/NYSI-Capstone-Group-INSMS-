import { useState, useEffect } from "react";
import Image from "next/image";
import {
  consultationApi,
  ConsultationApiError,
} from "../../../utils/consultationApi";

interface AnthropometryProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  prevSessionId?: string;
  onAnthroChange?: (
    weight: number | null,
    height: number | null,
    targetWeight: number | null,
  ) => void;
  onStepStatusChange?: (status: "default" | "dirty" | "saved") => void;
}

interface AnthropometryData {
  height: number | null;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  bone_density: number | null;
  water_percentage: number | null;
  basal_metabolic_rate: number | null;
  visceral_fat: number | null;
  bmi: number | null;
  bmi_category: string | null;
  fat_mass: number | null;
  fat_mass_percentage: number | null;
  skeletal_muscle_mass: number | null;
  skeletal_muscle_mass_percentage: number | null;
  sum_of_skinfold: number | null;
  target_weight: number | null;
  target_bmi: number | null;
  mothers_height: number | null;
  fathers_height: number | null;
  athlete_potential_adult_height: number | null;
  measured_by: string | null;
  measurement_notes: string | null;
  date_recorded: string | null;
}

interface EditForm {
  height: string;
  weight: string;
  bmi_category: string;
  fat_mass: string;
  skeletal_muscle_mass: string;
  sum_of_skinfold: string;
  target_weight: string;
  mothers_height: string;
  fathers_height: string;
  athlete_potential_adult_height: string;
  date_recorded: string;
  measured_by: string;
}

function calcBMI(weight: number, height: number): string {
  if (!weight || !height) return "";
  return (weight / Math.pow(height / 100, 2)).toFixed(2);
}


function calcFatMassPercent(fatMass: number, weight: number): string {
  if (!fatMass || !weight) return "";
  return ((fatMass / weight) * 100).toFixed(1);
}

function calcSMMPercent(smm: number, weight: number): string {
  if (!smm || !weight) return "";
  return ((smm / weight) * 100).toFixed(1);
}

function calcTargetBMI(targetWeight: number, height: number): string {
  if (!targetWeight || !height) return "";
  return (targetWeight / Math.pow(height / 100, 2)).toFixed(2);
}


export default function Anthropometry({
  athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
  prevSessionId,
  onAnthroChange,
  onStepStatusChange,
}: AnthropometryProps) {
  const [bmiLightbox, setBmiLightbox] = useState<string | null>(null);
  const [anthropometryData, setAnthropometryData] =
    useState<AnthropometryData | null>(null);
  const [prevData, setPrevData] = useState<AnthropometryData | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);

  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly;

  const emptyForm: EditForm = {
    height: "",
    weight: "",
    bmi_category: "",
    fat_mass: "",
    skeletal_muscle_mass: "",
    sum_of_skinfold: "",
    target_weight: "",
    mothers_height: "",
    fathers_height: "",
    athlete_potential_adult_height: "",
    date_recorded: "",
    measured_by: "",
  };

  const [editForm, setEditForm] = useState<EditForm>(emptyForm);

  useEffect(() => {
    setIsSaved(false);
  }, [editForm]);

  useEffect(() => {
    onStepStatusChange?.(isSaved ? "saved" : effectiveEditing ? "dirty" : "default");
  }, [effectiveEditing, isSaved, onStepStatusChange]);

  // Notify parent of live weight/height/targetWeight as user types
  useEffect(() => {
    if (!onAnthroChange) return;
    const w = editForm.weight !== "" ? parseFloat(editForm.weight) : null;
    const h = editForm.height !== "" ? parseFloat(editForm.height) : null;
    const tw =
      editForm.target_weight !== "" ? parseFloat(editForm.target_weight) : null;
    onAnthroChange(
      w !== null && !isNaN(w) ? w : null,
      h !== null && !isNaN(h) ? h : null,
      tw !== null && !isNaN(tw) ? tw : null,
    );
  }, [editForm.weight, editForm.height, editForm.target_weight]);

  // Derived calculated fields from editForm
  const w = parseFloat(editForm.weight);
  const h = parseFloat(editForm.height);
  const fm = parseFloat(editForm.fat_mass);
  const smm = parseFloat(editForm.skeletal_muscle_mass);
  const tw = parseFloat(editForm.target_weight);

  const calcedBMI = !isNaN(w) && !isNaN(h) ? calcBMI(w, h) : "";
  const calcedFatMassPercent =
    !isNaN(fm) && !isNaN(w) ? calcFatMassPercent(fm, w) : "";
  const calcedSMMPercent =
    !isNaN(smm) && !isNaN(w) ? calcSMMPercent(smm, w) : "";
  const calcedTargetBMI = !isNaN(tw) && !isNaN(h) ? calcTargetBMI(tw, h) : "";

  const fetchAnthropometry = async () => {
    if (!sessionId) {
      setAnthropometryData(null);
      setEditForm(emptyForm);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = (await consultationApi.getAnthropometry(sessionId)) as {
        data: unknown;
      };
      const apiData: {
        heightCm?: string;
        weightKg?: string;
        bmi?: string;
        bmiCategory?: string;
        fatMassKg?: string;
        fatMassPct?: string;
        skeletalMuscleMassKg?: string;
        skeletalMuscleMassPct?: string;
        sumOf8Skinfold?: string;
        targetWeightKg?: string;
        targetBmi?: string;
        motherHeightCm?: string;
        fatherHeightCm?: string;
        athletePotentialAdultHeightCm?: string;
        otherRemarks?: string;
        dateRecorded?: string | null;
        measuredBy?: string | null;
      } = response.data;

      console.log("🔍 Anthropometry API Response:", apiData);

      // Map API response to our interface
      const data: AnthropometryData = {
        height: apiData.heightCm ? parseFloat(apiData.heightCm) : null,
        weight: apiData.weightKg ? parseFloat(apiData.weightKg) : null,
        bmi: apiData.bmi ? parseFloat(apiData.bmi) : null,
        bmi_category: apiData.bmiCategory || null,
        fat_mass: apiData.fatMassKg ? parseFloat(apiData.fatMassKg) : null,
        fat_mass_percentage: apiData.fatMassPct
          ? parseFloat(apiData.fatMassPct)
          : null,
        skeletal_muscle_mass: apiData.skeletalMuscleMassKg
          ? parseFloat(apiData.skeletalMuscleMassKg)
          : null,
        skeletal_muscle_mass_percentage: apiData.skeletalMuscleMassPct
          ? parseFloat(apiData.skeletalMuscleMassPct)
          : null,
        sum_of_skinfold: apiData.sumOf8Skinfold
          ? parseFloat(apiData.sumOf8Skinfold)
          : null,
        target_weight: apiData.targetWeightKg
          ? parseFloat(apiData.targetWeightKg)
          : null,
        target_bmi: apiData.targetBmi ? parseFloat(apiData.targetBmi) : null,
        mothers_height: apiData.motherHeightCm
          ? parseFloat(apiData.motherHeightCm)
          : null,
        fathers_height: apiData.fatherHeightCm
          ? parseFloat(apiData.fatherHeightCm)
          : null,
        athlete_potential_adult_height: apiData.athletePotentialAdultHeightCm != null
          ? Number(apiData.athletePotentialAdultHeightCm)
          : null,
        measured_by: apiData.measuredBy ?? null,
        measurement_notes: apiData.otherRemarks || null,
        date_recorded: apiData.dateRecorded ?? null,
        // Fields not in API:
        body_fat_percentage: null,
        muscle_mass: null,
        bone_density: null,
        water_percentage: null,
        basal_metabolic_rate: null,
        visceral_fat: null,
      };

      console.log("🎯 Mapped Anthropometry Data:", data);

      setAnthropometryData(data);

      // Pre-populate edit form from fetched data
      setEditForm({
        height: data.height?.toString() ?? "",
        weight: data.weight?.toString() ?? "",
        bmi_category: data.bmi_category ?? "",
        fat_mass: data.fat_mass?.toString() ?? "",
        skeletal_muscle_mass: data.skeletal_muscle_mass?.toString() ?? "",
        sum_of_skinfold: data.sum_of_skinfold?.toString() ?? "",
        target_weight: data.target_weight?.toString() ?? "",
        mothers_height: data.mothers_height?.toString() ?? "",
        fathers_height: data.fathers_height?.toString() ?? "",
        athlete_potential_adult_height: data.athlete_potential_adult_height?.toString() ?? "",
        date_recorded: data.date_recorded
          ? new Date(data.date_recorded).toISOString().split("T")[0]
          : "",
        measured_by: data.measured_by ?? "",
      });
    } catch (error) {
      console.error("Error fetching anthropometry:", error);
      if (error instanceof ConsultationApiError && error.status === 404) {
        setAnthropometryData(null);
      } else {
        setError("Failed to load anthropometry data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnthropometry();
  }, [sessionId]);

  // Fetch previous session data for "Prev:" reference display
  useEffect(() => {
    if (!prevSessionId) { setPrevData(null); return; }
    consultationApi.getAnthropometry(prevSessionId)
      .then((res) => {
        const apiData = (res as { data: Record<string, string | null> }).data;
        if (!apiData) { setPrevData(null); return; }
        setPrevData({
          height: apiData.heightCm ? parseFloat(apiData.heightCm as string) : null,
          weight: apiData.weightKg ? parseFloat(apiData.weightKg as string) : null,
          bmi: apiData.bmi ? parseFloat(apiData.bmi as string) : null,
          bmi_category: (apiData.bmiCategory as string) || null,
          fat_mass: apiData.fatMassKg ? parseFloat(apiData.fatMassKg as string) : null,
          fat_mass_percentage: apiData.fatMassPct ? parseFloat(apiData.fatMassPct as string) : null,
          skeletal_muscle_mass: apiData.skeletalMuscleMassKg ? parseFloat(apiData.skeletalMuscleMassKg as string) : null,
          skeletal_muscle_mass_percentage: apiData.skeletalMuscleMassPct ? parseFloat(apiData.skeletalMuscleMassPct as string) : null,
          sum_of_skinfold: apiData.sumOf8Skinfold ? parseFloat(apiData.sumOf8Skinfold as string) : null,
          target_weight: apiData.targetWeightKg ? parseFloat(apiData.targetWeightKg as string) : null,
          target_bmi: apiData.targetBmi ? parseFloat(apiData.targetBmi as string) : null,
          mothers_height: apiData.motherHeightCm ? parseFloat(apiData.motherHeightCm as string) : null,
          fathers_height: apiData.fatherHeightCm ? parseFloat(apiData.fatherHeightCm as string) : null,
          athlete_potential_adult_height: apiData.athletePotentialAdultHeightCm ? parseFloat(apiData.athletePotentialAdultHeightCm as string) : null,
          measured_by: (apiData.measuredBy as string) || null,
          measurement_notes: null,
          date_recorded: (apiData.dateRecorded as string) || null,
          body_fat_percentage: null,
          muscle_mass: null,
          bone_density: null,
          water_percentage: null,
          basal_metabolic_rate: null,
          visceral_fat: null,
        });
      })
      .catch(() => setPrevData(null));
  }, [prevSessionId]);

  const handleSave = async () => {
    try {
      setSaveError("");
      const targetId =
        isNewConsultation && ensureSession ? await ensureSession() : sessionId;
      const token = localStorage.getItem("token");

      // Use the camelCase field names that the backend service expects.
      // Omit null values so empty fields don't overwrite existing measurements.
      const payload: Record<string, number | string> = {};
      if (editForm.height) payload.heightCm = parseFloat(editForm.height);
      if (editForm.weight) payload.weightKg = parseFloat(editForm.weight);
      if (editForm.fat_mass) payload.fatMassKg = parseFloat(editForm.fat_mass);
      if (editForm.skeletal_muscle_mass)
        payload.skeletalMuscleMassKg = parseFloat(
          editForm.skeletal_muscle_mass,
        );
      if (editForm.sum_of_skinfold)
        payload.sumOf8Skinfold = parseFloat(editForm.sum_of_skinfold);
      if (editForm.target_weight)
        payload.targetWeightKg = parseFloat(editForm.target_weight);
      if (editForm.mothers_height)
        payload.motherHeightCm = parseFloat(editForm.mothers_height);
      if (editForm.fathers_height)
        payload.fatherHeightCm = parseFloat(editForm.fathers_height);
      if (editForm.bmi_category) payload.bmiCategory = editForm.bmi_category;
      if (editForm.athlete_potential_adult_height)
        payload.athletePotentialAdultHeightCm = parseInt(editForm.athlete_potential_adult_height, 10);
      if (editForm.date_recorded) payload.dateRecorded = editForm.date_recorded;
      if (editForm.measured_by) payload.measuredBy = editForm.measured_by;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/sessions/${targetId}/anthropometry`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message ?? errorBody.error ?? errorMessage;
          if (errorBody.details?.length) {
            errorMessage += `: ${errorBody.details.map((d: { field?: string; message: string }) => d.field ? `${d.field} – ${d.message}` : d.message).join(", ")}`;
          }
        } catch {
          // ignore JSON parse error, keep generic message
        }
        throw new Error(errorMessage);
      }

      setIsEditing(false);
      setIsSaved(true);
      if (!isNewConsultation) {
        fetchAnthropometry();
      }
    } catch (err) {
      console.error("Error saving anthropometry:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
    // Reset form to fetched data
    if (anthropometryData) {
      setEditForm({
        height: anthropometryData.height?.toString() ?? "",
        weight: anthropometryData.weight?.toString() ?? "",
        bmi_category: anthropometryData.bmi_category ?? "",
        fat_mass: anthropometryData.fat_mass?.toString() ?? "",
        skeletal_muscle_mass:
          anthropometryData.skeletal_muscle_mass?.toString() ?? "",
        sum_of_skinfold: anthropometryData.sum_of_skinfold?.toString() ?? "",
        target_weight: anthropometryData.target_weight?.toString() ?? "",
        mothers_height: anthropometryData.mothers_height?.toString() ?? "",
        fathers_height: anthropometryData.fathers_height?.toString() ?? "",
        athlete_potential_adult_height: anthropometryData.athlete_potential_adult_height?.toString() ?? "",
        date_recorded: anthropometryData.date_recorded
          ? new Date(anthropometryData.date_recorded)
              .toISOString()
              .split("T")[0]
          : "",
        measured_by: anthropometryData.measured_by ?? "",
      });
    }
  };

  const updateField = (field: keyof EditForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
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
      <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchAnthropometry}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  // Edit mode layout
  if (effectiveEditing && activeTab !== "previous") {
    return (
      <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Anthropometry</h2>
        </div>

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

        {saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}

        <div className="space-y-3 text-sm">
          {/* Editable inputs */}
          {(
            [
              {
                label: "Height (cm)",
                field: "height" as const,
                type: "number",
              },
              {
                label: "Weight (kg)",
                field: "weight" as const,
                type: "number",
              },
            ] as { label: string; field: keyof EditForm; type: string }[]
          ).map(({ label, field, type }) => (
            <div
              key={field}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-gray-600 w-56 flex-shrink-0">{label}:</span>
              <input
                type={type}
                value={editForm[field] ?? ""}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder="—"
                style={{ color: editForm[field] ? "#111827" : undefined }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-right placeholder-gray-300"
              />
            </div>
          ))}

          {/* BMI Category dropdown */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600 w-56 flex-shrink-0">BMI Category:</span>
            <select
              value={editForm.bmi_category}
              onChange={(e) => updateField("bmi_category", e.target.value)}
              style={{ color: editForm.bmi_category ? "#111827" : "#9CA3AF" }}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">— Select —</option>
              <option value="Normal">Normal</option>
              <option value="Underweight">Underweight</option>
              <option value="Overweight">Overweight</option>
            </select>
          </div>

          {([
              {
                label: "Fat Mass (kg)",
                field: "fat_mass" as const,
                type: "number",
              },
              {
                label: "Skeletal Muscle Mass (kg)",
                field: "skeletal_muscle_mass" as const,
                type: "number",
              },
              {
                label: "Sum of 8 Skinfold (mm)",
                field: "sum_of_skinfold" as const,
                type: "number",
              },
              {
                label: "Target Weight (kg)",
                field: "target_weight" as const,
                type: "number",
              },
              {
                label: "Mother's Height (cm)",
                field: "mothers_height" as const,
                type: "number",
              },
              {
                label: "Father's Height (cm)",
                field: "fathers_height" as const,
                type: "number",
              },
              {
                label: "Athlete's Potential Adult Height (cm)",
                field: "athlete_potential_adult_height" as const,
                type: "number",
              },
            ] as { label: string; field: keyof EditForm; type: string }[]
          ).map(({ label, field, type }) => (
            <div
              key={field}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-gray-600 w-56 flex-shrink-0">{label}:</span>
              <input
                type={type}
                value={editForm[field] ?? ""}
                onChange={(e) => updateField(field, e.target.value)}
                placeholder="—"
                style={{ color: editForm[field] ? "#111827" : undefined }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-right placeholder-gray-300"
              />
            </div>
          ))}

          {/* Calculated (greyed) fields */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <p className="text-xs text-gray-400 mb-2">
              Auto-calculated (read-only)
            </p>
            {[
              { label: "BMI", value: calcedBMI },
              {
                label: "Fat Mass (%)",
                value: calcedFatMassPercent ? `${calcedFatMassPercent}%` : "",
              },
              {
                label: "Skeletal Muscle Mass (%)",
                value: calcedSMMPercent ? `${calcedSMMPercent}%` : "",
              },
              { label: "Target BMI", value: calcedTargetBMI },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-gray-500 w-56 flex-shrink-0">
                  {label}:
                </span>
                <div className="flex-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-sm text-right text-gray-500">
                  {value || "—"}
                </div>
              </div>
            ))}
          </div>

          {/* BMI Chart buttons */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">BMI Reference Charts</p>
            <div className="flex gap-2">
              <button
                onClick={() => setBmiLightbox("/consultation/bmi-chart-male.png")}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
              >
                Male BMI Chart
              </button>
              <button
                onClick={() => setBmiLightbox("/consultation/bmi-chart-female.png")}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
              >
                Female BMI Chart
              </button>
            </div>
          </div>

          {/* Measurement details */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 w-56 flex-shrink-0">
                Date Recorded:
              </span>
              <input
                type="date"
                value={editForm.date_recorded}
                onChange={(e) => updateField("date_recorded", e.target.value)}
                style={{
                  color: editForm.date_recorded ? "#111827" : undefined,
                }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600 w-56 flex-shrink-0">
                Measured By:
              </span>
              <input
                type="text"
                value={editForm.measured_by}
                onChange={(e) => updateField("measured_by", e.target.value)}
                placeholder="Name"
                style={{ color: editForm.measured_by ? "#111827" : undefined }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

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
              setAnthropometryData(null);
              setEditForm(emptyForm);
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
            {isSaved ? "Draft Saved" : "Save"}
          </button>
        </div>

        {bmiLightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setBmiLightbox(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setBmiLightbox(null)}
                className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 text-lg font-bold shadow"
              >
                ×
              </button>
              <Image
                src={bmiLightbox}
                alt="BMI Chart"
                width={900}
                height={1200}
                className="rounded-lg max-h-[85vh] w-auto object-contain"
              />
            </div>
          </div>
        )}
      </section>
    );
  }

  // Read-only view
  const displayData = activeTab === "previous" ? prevData : anthropometryData;

  const AnthroField = ({ label, value, suffix, span2 }: { label: string; value: string | number | null | undefined; suffix?: string; span2?: boolean }) => {
    return (
      <div className={`flex justify-between items-start${span2 ? " col-span-2" : ""}`}>
        <span className="text-gray-600 text-sm">{label}:</span>
        <div className="text-right">
          <span className="font-medium text-gray-900 text-sm">
            {value != null ? `${value}${suffix ? ` ${suffix}` : ""}` : "N/A"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Anthropometry</h2>
        {!readOnly && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
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
        {!displayData && !isNewConsultation ? (
          <div className="text-center py-8">
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {activeTab === "previous" ? "No previous session data" : "No anthropometry data"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === "previous"
                ? "No measurements were recorded for the previous session."
                : "No measurements have been recorded for this consultation session."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <AnthroField label="Height" value={displayData?.height} suffix="cm" />
              <AnthroField label="Weight" value={displayData?.weight} suffix="kg" />
              <AnthroField label="BMI" value={displayData?.bmi} />
              <AnthroField label="BMI Category" value={displayData?.bmi_category} />
              <div className="col-span-2 flex gap-2">
                <button
                  onClick={() => setBmiLightbox("/consultation/bmi-chart-male.png")}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                >
                  Male BMI Chart
                </button>
                <button
                  onClick={() => setBmiLightbox("/consultation/bmi-chart-female.png")}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                >
                  Female BMI Chart
                </button>
              </div>
              <AnthroField label="Fat Mass" value={displayData?.fat_mass} suffix="kg" />
              <AnthroField label="Fat Mass (%)" value={displayData?.fat_mass_percentage} suffix="%" />
              <AnthroField label="Skeletal Muscle Mass" value={displayData?.skeletal_muscle_mass} suffix="kg" />
              <AnthroField label="Skeletal Muscle Mass (%)" value={displayData?.skeletal_muscle_mass_percentage} suffix="%" />
              <AnthroField label="Sum of 8 Skinfold" value={displayData?.sum_of_skinfold} suffix="mm" />
              <AnthroField label="Target Weight" value={displayData?.target_weight} suffix="kg" />
              <AnthroField label="Target BMI" value={displayData?.target_bmi} />
              <AnthroField label="Mother's Height" value={displayData?.mothers_height} suffix="cm" />
              <AnthroField label="Father's Height" value={displayData?.fathers_height} suffix="cm" />
              <AnthroField label="Athlete's Potential Adult Height" value={displayData?.athlete_potential_adult_height} suffix="cm" span2 />
            </div>

            {/* Measurement Details */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <AnthroField label="Date Recorded" value={displayData?.date_recorded ? new Date(displayData.date_recorded).toLocaleDateString() : null} />
                <AnthroField label="Measured By" value={displayData?.measured_by} />
              </div>
              {displayData?.measurement_notes && (
                <div className="mt-3">
                  <span className="text-gray-600 text-sm">Notes:</span>
                  <p className="text-gray-900 text-sm mt-1">{displayData.measurement_notes}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {bmiLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setBmiLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setBmiLightbox(null)}
              className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 text-lg font-bold shadow"
            >
              ×
            </button>
            <Image
              src={bmiLightbox}
              alt="BMI Chart"
              width={900}
              height={1200}
              className="rounded-lg max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
