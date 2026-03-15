import Image from "next/image";
import { useState, useEffect } from "react";
import { consultationApi, ConsultationApiError } from "@/utils/consultationApi";

interface MedicalHistoryProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  prevSessionId?: string;
  liveWeight?: number | null;
  liveTargetWeight?: number | null;
}

// ---- API response shape ----
interface MedicalHistoryApiData {
  session_id: string;
  athlete_id: string;
  general: {
    id: string | null;
    medical_condition: string | null;
    food_allergy: string | null;
    drug_allergy: string | null;
    past_injury: string | null;
    medical_remarks: string | null;
  };
  puberty: {
    id: string | null;
    period_of_growth_spurt: string | null;
    other_remarks: string | null;
  };
  bowel_movement: {
    id: string | null;
    regular_bowel_movement: boolean | null;
    frequency_of_bowel_movement: string | null;
    stool_visual: string | null;
    other_remarks: string | null;
  };
  hydration: {
    id: string | null;
    water_intake_per_day: number | null;
    urine_colour: string | null;
    hydration_status: string | null;
    other_remarks: string | null;
    hydration_water_intake_for_target_weight: number | null;
    hydration_requirement_for_water_intake: number | null;
  };
  period: {
    id: string | null;
    date_of_first_period: string | null;
    age_of_menarchy: number | null;
    regularity_of_period: number | null;
    length_of_typical_menstrual_cycle: number | null;
    length_of_period: number | null;
    heaviness_of_menstrual_bleeding: number | null;
    any_signs_and_symptoms: string | null;
    other_remarks: string | null;
  };
}

// ---- Component edit state shapes ----
interface GeneralInfo {
  medicalCondition: string;
  foodAllergy: string;
  drugAllergy: string;
  notablePastInjuries: string;
  medicalRemarks: string;
}
interface PubertyInfo {
  periodOfGrowthSpurt: string;
  otherRemarks: string;
}
interface BowelMovement {
  regularBowelMovement: string;
  frequencyOfBowelMovements: string;
  stoolAppearance: string;
  otherRemarks: string;
}
interface HydrationInfo {
  waterIntakeForTargetWeight: string;
  requirementForWaterIntake: string;
  waterIntakePerDay: string;
  urineColour: string;
  hydrationStatus: string;
  otherRemarks: string;
}
interface PeriodInfo {
  firstDayPeriod: string;
  ageOfMenarche: string;
  regularityOfPeriod: string;
  menstrualCycleLength: string;
  periodBleedingLength: string;
  menstrualBleedingHeaviness: string;
  signsAndSymptoms: string;
  otherRemarks: string;
}

// ---- Mapping helpers ----
function apiToState(data: MedicalHistoryApiData) {
  return {
    general: {
      medicalCondition: data.general.medical_condition ?? "",
      foodAllergy: data.general.food_allergy ?? "",
      drugAllergy: data.general.drug_allergy ?? "",
      notablePastInjuries: data.general.past_injury ?? "",
      medicalRemarks: data.general.medical_remarks ?? "",
    },
    puberty: {
      periodOfGrowthSpurt: data.puberty.period_of_growth_spurt ?? "",
      otherRemarks: data.puberty.other_remarks ?? "",
    },
    bowelMovement: {
      regularBowelMovement:
        data.bowel_movement.regular_bowel_movement === true
          ? "Yes"
          : data.bowel_movement.regular_bowel_movement === false
            ? "No"
            : "",
      frequencyOfBowelMovements:
        data.bowel_movement.frequency_of_bowel_movement ?? "",
      stoolAppearance: data.bowel_movement.stool_visual ?? "",
      otherRemarks: data.bowel_movement.other_remarks ?? "",
    },
    hydrationInfo: {
      waterIntakeForTargetWeight:
        data.hydration.hydration_water_intake_for_target_weight?.toString() ??
        "",
      requirementForWaterIntake:
        data.hydration.hydration_requirement_for_water_intake?.toString() ?? "",
      waterIntakePerDay: data.hydration.water_intake_per_day?.toString() ?? "",
      urineColour: data.hydration.urine_colour ?? "",
      hydrationStatus: data.hydration.hydration_status ?? "",
      otherRemarks: data.hydration.other_remarks ?? "",
    },
    periodInfo: {
      firstDayPeriod: data.period.date_of_first_period ?? "",
      ageOfMenarche: data.period.age_of_menarchy?.toString() ?? "",
      regularityOfPeriod: data.period.regularity_of_period?.toString() ?? "",
      menstrualCycleLength:
        data.period.length_of_typical_menstrual_cycle?.toString() ?? "",
      periodBleedingLength: data.period.length_of_period?.toString() ?? "",
      menstrualBleedingHeaviness:
        data.period.heaviness_of_menstrual_bleeding?.toString() ?? "",
      signsAndSymptoms: data.period.any_signs_and_symptoms ?? "",
      otherRemarks: data.period.other_remarks ?? "",
    },
  };
}

const emptyState = () => ({
  general: {
    medicalCondition: "",
    foodAllergy: "",
    drugAllergy: "",
    notablePastInjuries: "",
    medicalRemarks: "",
  },
  puberty: { periodOfGrowthSpurt: "", otherRemarks: "" },
  bowelMovement: {
    regularBowelMovement: "",
    frequencyOfBowelMovements: "",
    stoolAppearance: "",
    otherRemarks: "",
  },
  hydrationInfo: {
    waterIntakeForTargetWeight: "",
    requirementForWaterIntake: "",
    waterIntakePerDay: "",
    urineColour: "",
    hydrationStatus: "",
    otherRemarks: "",
  },
  periodInfo: {
    firstDayPeriod: "",
    ageOfMenarche: "",
    regularityOfPeriod: "",
    menstrualCycleLength: "",
    periodBleedingLength: "",
    menstrualBleedingHeaviness: "",
    signsAndSymptoms: "",
    otherRemarks: "",
  },
});

export default function MedicalHistory({
  athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
  prevSessionId,
  liveWeight,
  liveTargetWeight,
}: MedicalHistoryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");
  const [gender, setGender] = useState<string | null>(null);

  const s = emptyState();
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo>(s.general);
  const [pubertyInfo, setPubertyInfo] = useState<PubertyInfo>(s.puberty);
  const [bowelMovement, setBowelMovement] = useState<BowelMovement>(
    s.bowelMovement,
  );
  const [hydrationInfo, setHydrationInfo] = useState<HydrationInfo>(
    s.hydrationInfo,
  );
  const [periodInfo, setPeriodInfo] = useState<PeriodInfo>(s.periodInfo);

  // Snapshot of last-saved values — used to detect unsaved changes (text color)
  const [savedState, setSavedState] = useState(emptyState());
  const [isSaved, setIsSaved] = useState(false);
  const [prevData, setPrevData] = useState<ReturnType<typeof apiToState> | null>(null);

  useEffect(() => {
    setIsSaved(false);
  }, [generalInfo, pubertyInfo, bowelMovement, hydrationInfo, periodInfo]);

  // Show Period section only for female athletes; show as fallback when gender unknown
  const isFemale = gender === null || gender.toLowerCase().startsWith("f");

  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly && activeTab !== "previous";

  const fetchMedicalHistory = async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = (await consultationApi.getMedicalHistory(
        sessionId,
      )) as { data: MedicalHistoryApiData };
      const mapped = apiToState(response.data);
      setGeneralInfo(mapped.general);
      setPubertyInfo(mapped.puberty);
      setBowelMovement(mapped.bowelMovement);
      setHydrationInfo(mapped.hydrationInfo);
      setPeriodInfo(mapped.periodInfo);
      setSavedState(mapped);
    } catch (err) {
      if (err instanceof ConsultationApiError && err.status === 404) {
        // No data yet — keep empty state
      } else {
        console.error("Error fetching medical history:", err);
        setError("Failed to load medical history");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicalHistory();
  }, [sessionId]);

  useEffect(() => {
    if (!prevSessionId) return;
    (async () => {
      try {
        const response = (await consultationApi.getMedicalHistory(prevSessionId)) as { data: MedicalHistoryApiData };
        setPrevData(apiToState(response.data));
      } catch {
        // non-critical — prev data simply won't show
      }
    })();
  }, [prevSessionId]);

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
        // non-critical — falls back to showing all sections
      }
    })();
  }, [athleteId]);

  const handleSave = async () => {
    try {
      setSaveError("");
      const id = isNewConsultation && ensureSession ? await ensureSession() : sessionId;
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/medical-history/${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // general fields at top level
            medical_condition: generalInfo.medicalCondition,
            food_allergy: generalInfo.foodAllergy,
            drug_allergy: generalInfo.drugAllergy,
            past_injury: generalInfo.notablePastInjuries,
            medical_remarks: generalInfo.medicalRemarks,
            // section objects
            puberty: {
              period_of_growth_spurt: pubertyInfo.periodOfGrowthSpurt,
              other_remarks: pubertyInfo.otherRemarks,
            },
            bowel_movement: {
              regular_bowel_movement:
                bowelMovement.regularBowelMovement === "Yes"
                  ? true
                  : bowelMovement.regularBowelMovement === "No"
                    ? false
                    : null,
              frequency_of_bowel_movement:
                bowelMovement.frequencyOfBowelMovements,
              stool_visual: bowelMovement.stoolAppearance,
              other_remarks: bowelMovement.otherRemarks,
            },
            hydration: {
              water_intake_per_day: hydrationInfo.waterIntakePerDay
                ? parseFloat(hydrationInfo.waterIntakePerDay)
                : null,
              urine_colour: hydrationInfo.urineColour,
              hydration_status: hydrationInfo.hydrationStatus,
              other_remarks: hydrationInfo.otherRemarks,
            },
            period: {
              date_of_first_period: periodInfo.firstDayPeriod || null,
              age_of_menarchy: periodInfo.ageOfMenarche
                ? parseFloat(periodInfo.ageOfMenarche)
                : null,
              regularity_of_period: periodInfo.regularityOfPeriod
                ? parseFloat(periodInfo.regularityOfPeriod)
                : null,
              length_of_typical_menstrual_cycle: periodInfo.menstrualCycleLength
                ? parseFloat(periodInfo.menstrualCycleLength)
                : null,
              length_of_period: periodInfo.periodBleedingLength
                ? parseFloat(periodInfo.periodBleedingLength)
                : null,
              heaviness_of_menstrual_bleeding:
                periodInfo.menstrualBleedingHeaviness
                  ? parseFloat(periodInfo.menstrualBleedingHeaviness)
                  : null,
              any_signs_and_symptoms: periodInfo.signsAndSymptoms,
              other_remarks: periodInfo.otherRemarks,
            },
          }),
        },
      );
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(`HTTP error: ${response.status} — ${errBody.message || errBody.error || "Unknown server error"}`);
      }
      setIsEditing(false);
      setIsSaved(true);
      fetchMedicalHistory();
    } catch (err) {
      console.error("Error saving medical history:", err);
      setSaveError("Failed to save. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveError("");
    fetchMedicalHistory();
  };

  const PrevVal = ({ val }: { val: string | number | null | undefined }) => {
    if (!isNewConsultation || !prevData || val == null || val === "") return null;
    return (
      <p className="text-xs text-gray-400 italic mt-0.5 flex items-center gap-1">
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2" /><polyline points="12 6 12 12 16 14" strokeWidth="2" /></svg>
        Prev: {val}
      </p>
    );
  };

  if (loading) {
    return (
      <section
        id="medical-history"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
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
      <section
        id="medical-history"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchMedicalHistory}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  // Compute display state for tabs (previous tab shows prevData in read-only, current shows live state)
  const showPrev = activeTab === "previous";
  const displayGeneral = showPrev && prevData ? prevData.general : generalInfo;
  const displayPuberty = showPrev && prevData ? prevData.puberty : pubertyInfo;
  const displayBowel = showPrev && prevData ? prevData.bowelMovement : bowelMovement;
  const displayHydration = showPrev && prevData ? prevData.hydrationInfo : hydrationInfo;
  const displayPeriod = showPrev && prevData ? prevData.periodInfo : periodInfo;

  return (
    <section id="medical-history" className="bg-white rounded-xl shadow-lg p-6">
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLightboxSrc(null)}
        >
          <Image
            src={lightboxSrc}
            alt="Chart"
            width={760}
            height={1040}
            className="rounded max-h-[90vh] w-auto object-contain"
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 underline">Medical History</h2>
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

      <div className="space-y-8">
        {/* General Section */}
        <div>
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <span className="font-medium underline">General</span>
          </div>
          <div className="space-y-4 text-sm">
            {(
              [
                {
                  label: "Medical Condition:",
                  field: "medicalCondition" as const,
                },
                { label: "Food Allergy / Intolerances:", field: "foodAllergy" as const },
                { label: "Drug Allergy:", field: "drugAllergy" as const },
                {
                  label: "Notable Past Injuries:",
                  field: "notablePastInjuries" as const,
                },
              ] as { label: string; field: keyof GeneralInfo }[]
            ).map(({ label, field }) => (
              <div key={field} className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  {label}
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    placeholder="Input Text Here"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${generalInfo[field] !== savedState.general[field]
                        ? "text-black"
                        : "text-gray-400"
                      }`}
                    value={generalInfo[field]}
                    onChange={(e) =>
                      setGeneralInfo((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayGeneral[field] || "—"}</span>
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-start gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Medical Remarks:
              </span>
              {effectiveEditing ? (
                <input
                  type="text"
                  placeholder="Input Text Here"
                  className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${generalInfo.medicalRemarks !== savedState.general.medicalRemarks
                      ? "text-black"
                      : "text-gray-400"
                    }`}
                  value={generalInfo.medicalRemarks}
                  onChange={(e) =>
                    setGeneralInfo((prev) => ({
                      ...prev,
                      medicalRemarks: e.target.value,
                    }))
                  }
                />
              ) : (
                <div className="flex-1">
                  <span className="text-gray-900">{displayGeneral.medicalRemarks || "—"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Puberty Section */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4 underline">Puberty</h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Period of Growth Spurt:
              </span>
              {effectiveEditing ? (
                <input
                  type="text"
                  placeholder="Input Text Here"
                  className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${pubertyInfo.periodOfGrowthSpurt !== savedState.puberty.periodOfGrowthSpurt
                      ? "text-black"
                      : "text-gray-400"
                    }`}
                  value={pubertyInfo.periodOfGrowthSpurt}
                  onChange={(e) =>
                    setPubertyInfo((prev) => ({
                      ...prev,
                      periodOfGrowthSpurt: e.target.value,
                    }))
                  }
                />
              ) : (
                <div className="flex-1">
                  <span className="text-gray-900">{displayPuberty.periodOfGrowthSpurt || "—"}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Other Remarks:
              </span>
              {effectiveEditing ? (
                <input
                  type="text"
                  placeholder="Input Text Here"
                  className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${pubertyInfo.otherRemarks !== savedState.puberty.otherRemarks
                      ? "text-black"
                      : "text-gray-400"
                    }`}
                  value={pubertyInfo.otherRemarks}
                  onChange={(e) =>
                    setPubertyInfo((prev) => ({
                      ...prev,
                      otherRemarks: e.target.value,
                    }))
                  }
                />
              ) : (
                <div className="flex-1">
                  <span className="text-gray-900">{displayPuberty.otherRemarks || "—"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bowel Movement Section */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4 underline">
            Bowel Movement
          </h3>
          <div className="flex gap-6 items-start">
            <div className="flex-1 space-y-4 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Regular Bowel Movement:
                </span>
                {effectiveEditing ? (
                  <select
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${bowelMovement.regularBowelMovement !== savedState.bowelMovement.regularBowelMovement
                        ? "text-black"
                        : "text-gray-400"
                      }`}
                    value={bowelMovement.regularBowelMovement}
                    onChange={(e) =>
                      setBowelMovement((prev) => ({
                        ...prev,
                        regularBowelMovement: e.target.value,
                      }))
                    }
                  >
                    <option value="">—</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayBowel.regularBowelMovement || "—"}</span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Frequency of Bowel Movements:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    placeholder="e.g. once a day"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${bowelMovement.frequencyOfBowelMovements !== savedState.bowelMovement.frequencyOfBowelMovements
                        ? "text-black"
                        : "text-gray-400"
                      }`}
                    value={bowelMovement.frequencyOfBowelMovements}
                    onChange={(e) =>
                      setBowelMovement((prev) => ({
                        ...prev,
                        frequencyOfBowelMovements: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayBowel.frequencyOfBowelMovements || "—"}</span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Stool Appearance:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    placeholder="Input Text Here"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${bowelMovement.stoolAppearance !== savedState.bowelMovement.stoolAppearance
                        ? "text-black"
                        : "text-gray-400"
                      }`}
                    value={bowelMovement.stoolAppearance}
                    onChange={(e) =>
                      setBowelMovement((prev) => ({
                        ...prev,
                        stoolAppearance: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayBowel.stoolAppearance || "—"}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Other Remarks:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    placeholder="Input Text Here"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${bowelMovement.otherRemarks !== savedState.bowelMovement.otherRemarks
                        ? "text-black"
                        : "text-gray-400"
                      }`}
                    value={bowelMovement.otherRemarks}
                    onChange={(e) =>
                      setBowelMovement((prev) => ({
                        ...prev,
                        otherRemarks: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayBowel.otherRemarks || "—"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bristol Stool Chart */}
            <div className="flex-shrink-0 self-start">
              <Image
                src="/consultation/bristol-stool-chart.png"
                alt="Bristol Stool Chart"
                width={380}
                height={520}
                className="rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setLightboxSrc("/consultation/bristol-stool-chart.png")}
              />
            </div>
          </div>
        </div>

        {/* Hydration Section */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4 underline">
            Hydration / Fluid Intake
          </h3>
          <div className="flex gap-6 items-start">
            <div className="flex-1 space-y-4 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Water Intake for Target Weight (45 ml/kg):
                </span>
                <div className="flex-1">
                  <span className="text-gray-900">
                    {showPrev
                      ? (displayHydration.waterIntakeForTargetWeight ? `${displayHydration.waterIntakeForTargetWeight} ml` : "—")
                      : liveTargetWeight != null
                        ? `${(45 * liveTargetWeight).toFixed(0)} ml`
                        : hydrationInfo.waterIntakeForTargetWeight
                          ? `${hydrationInfo.waterIntakeForTargetWeight} ml`
                          : "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Requirement for Water Intake (45 ml/kg):
                </span>
                <div className="flex-1">
                  <span className="text-gray-900">
                    {showPrev
                      ? (displayHydration.requirementForWaterIntake ? `${displayHydration.requirementForWaterIntake} ml` : "—")
                      : liveWeight != null
                        ? `${(45 * liveWeight).toFixed(0)} ml`
                        : hydrationInfo.requirementForWaterIntake
                          ? `${hydrationInfo.requirementForWaterIntake} ml`
                          : "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Water Intake per Day (L):
                </span>
                {effectiveEditing ? (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 2.5"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${
                      hydrationInfo.waterIntakePerDay !== savedState.hydrationInfo.waterIntakePerDay
                        ? "text-black"
                        : "text-gray-400"
                    }`}
                    value={hydrationInfo.waterIntakePerDay}
                    onChange={(e) =>
                      setHydrationInfo((prev) => ({
                        ...prev,
                        waterIntakePerDay: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">
                      {displayHydration.waterIntakePerDay ? `${displayHydration.waterIntakePerDay} L` : "—"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Urine Colour:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    placeholder="e.g. Pale yellow"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${
                      hydrationInfo.urineColour !== savedState.hydrationInfo.urineColour
                        ? "text-black"
                        : "text-gray-400"
                    }`}
                    value={hydrationInfo.urineColour}
                    onChange={(e) =>
                      setHydrationInfo((prev) => ({
                        ...prev,
                        urineColour: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayHydration.urineColour || "—"}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Hydration Status:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    placeholder="e.g. Well hydrated"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${
                      hydrationInfo.hydrationStatus !== savedState.hydrationInfo.hydrationStatus
                        ? "text-black"
                        : "text-gray-400"
                    }`}
                    value={hydrationInfo.hydrationStatus}
                    onChange={(e) =>
                      setHydrationInfo((prev) => ({
                        ...prev,
                        hydrationStatus: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayHydration.hydrationStatus || "—"}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Other Remarks:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    placeholder="Input Text Here"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${
                      hydrationInfo.otherRemarks !== savedState.hydrationInfo.otherRemarks
                        ? "text-black"
                        : "text-gray-400"
                    }`}
                    value={hydrationInfo.otherRemarks}
                    onChange={(e) =>
                      setHydrationInfo((prev) => ({
                        ...prev,
                        otherRemarks: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayHydration.otherRemarks || "—"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hydration Chart */}
            <div className="flex-shrink-0 self-start">
              <Image
                src="/consultation/hydration-chart.png"
                alt="Hydration Chart"
                width={380}
                height={520}
                className="rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setLightboxSrc("/consultation/hydration-chart.png")}
              />
            </div>
          </div>
        </div>

        {/* Period Section — female athletes only */}
        {isFemale && (
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-4 underline">Period</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {(
                [
                  {
                    label: "Date of First Day Period:",
                    field: "firstDayPeriod" as const,
                    type: "date",
                  },
                  {
                    label: "Age of Menarche:",
                    field: "ageOfMenarche" as const,
                    type: "number",
                  },
                  {
                    label: "Regularity of Period:",
                    field: "regularityOfPeriod" as const,
                    type: "number",
                  },
                  {
                    label: "Menstrual Cycle Length (days):",
                    field: "menstrualCycleLength" as const,
                    type: "number",
                  },
                  {
                    label: "Period Bleeding Length (days):",
                    field: "periodBleedingLength" as const,
                    type: "number",
                  },
                  {
                    label: "Menstrual Bleeding Heaviness:",
                    field: "menstrualBleedingHeaviness" as const,
                    type: "number",
                  },
                ] as {
                  label: string;
                  field: keyof PeriodInfo;
                  type: string;
                }[]
              ).map(({ label, field, type }) => (
                <div key={field} className="flex justify-between items-center">
                  <span className="text-gray-600">{label}</span>
                  {effectiveEditing ? (
                    <input
                      type={type}
                      className={`w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right transition-colors ${periodInfo[field] !== savedState.periodInfo[field]
                          ? "text-black"
                          : "text-gray-400"
                        }`}
                      value={periodInfo[field]}
                      onChange={(e) =>
                        setPeriodInfo((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    <div className="text-right">
                      <span className="font-medium">{displayPeriod[field] || "—"}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Signs and Symptoms:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    placeholder="Input Text Here"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${periodInfo.signsAndSymptoms !== savedState.periodInfo.signsAndSymptoms
                        ? "text-black"
                        : "text-gray-400"
                      }`}
                    value={periodInfo.signsAndSymptoms}
                    onChange={(e) =>
                      setPeriodInfo((prev) => ({
                        ...prev,
                        signsAndSymptoms: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayPeriod.signsAndSymptoms || "—"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-600 w-48 flex-shrink-0">
                  Other Remarks:
                </span>
                {effectiveEditing ? (
                  <input
                    type="text"
                    placeholder="Input Text Here"
                    className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${periodInfo.otherRemarks !== savedState.periodInfo.otherRemarks
                        ? "text-black"
                        : "text-gray-400"
                      }`}
                    value={periodInfo.otherRemarks}
                    onChange={(e) =>
                      setPeriodInfo((prev) => ({
                        ...prev,
                        otherRemarks: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex-1">
                    <span className="text-gray-900">{displayPeriod.otherRemarks || "—"}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar — Save / Clear All / Cancel */}
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
                const s = emptyState();
                setGeneralInfo(s.general);
                setPubertyInfo(s.puberty);
                setBowelMovement(s.bowelMovement);
                setHydrationInfo(s.hydrationInfo);
                setPeriodInfo(s.periodInfo);
                setSavedState(emptyState());
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
              {isSaved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
