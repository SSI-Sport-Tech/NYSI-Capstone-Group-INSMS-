import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { consultationApi, ConsultationApiError } from "@/utils/consultationApi";

interface MedicalHistoryProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
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
}: MedicalHistoryProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
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

  useEffect(() => {
    setIsSaved(false);
  }, [generalInfo, pubertyInfo, bowelMovement, hydrationInfo, periodInfo]);

  // Show Period section only for female athletes; show as fallback when gender unknown
  const isFemale = gender === null || gender.toLowerCase().startsWith("f");

  const effectiveEditing = (isEditing || !!isNewConsultation) && !readOnly;

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
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      setIsEditing(false);
      setIsSaved(true);
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

  return (
    <section id="medical-history" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900">Medical History</h2>
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
            {/* General Section */}
            <div>
              <div className="flex items-center text-sm text-gray-600 mb-4">
                <span className="font-medium">General</span>
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
                      <span className="text-gray-900 flex-1">
                        {generalInfo[field] || "—"}
                      </span>
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
                    <span className="text-gray-900 flex-1">
                      {generalInfo.medicalRemarks || "—"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Puberty Section */}
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-4">Puberty</h3>
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
                    <span className="text-gray-900 flex-1">
                      {pubertyInfo.periodOfGrowthSpurt || "—"}
                    </span>
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
                    <span className="text-gray-900 flex-1">
                      {pubertyInfo.otherRemarks || "—"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bowel Movement Section */}
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Bowel Movement
              </h3>
              <div className="flex gap-6 items-start">
                <div className="space-y-4 text-sm flex-1">
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
                      <span className="text-gray-900 flex-1">
                        {bowelMovement.regularBowelMovement || "—"}
                      </span>
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
                      <span className="text-gray-900 flex-1">
                        {bowelMovement.frequencyOfBowelMovements || "—"}
                      </span>
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
                      <span className="text-gray-900 flex-1">
                        {bowelMovement.stoolAppearance || "—"}
                      </span>
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
                      <span className="text-gray-900 flex-1">
                        {bowelMovement.otherRemarks || "—"}
                      </span>
                    )}
                  </div>
                </div>
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
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Hydration / Fluid Intake
              </h3>
              <div className="flex gap-6 items-start">
                <div className="space-y-4 text-sm flex-1">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600 w-48 flex-shrink-0">
                      Water Intake for Target Weight (45 ml/kg):
                    </span>
                    <span className="text-gray-900 flex-1">
                      {hydrationInfo.waterIntakeForTargetWeight
                        ? `${hydrationInfo.waterIntakeForTargetWeight} ml`
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-gray-600 w-48 flex-shrink-0">
                      Requirement for Water Intake (45 ml/kg):
                    </span>
                    <span className="text-gray-900 flex-1">
                      {hydrationInfo.requirementForWaterIntake
                        ? `${hydrationInfo.requirementForWaterIntake} ml`
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-gray-600 w-48 flex-shrink-0">
                      Water Intake per Day (L):
                    </span>
                    {effectiveEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 2.5"
                        className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${hydrationInfo.waterIntakePerDay !== savedState.hydrationInfo.waterIntakePerDay
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
                      <span className="text-gray-900 flex-1">
                        {hydrationInfo.waterIntakePerDay
                          ? `${hydrationInfo.waterIntakePerDay} L`
                          : "—"}
                      </span>
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
                        className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${hydrationInfo.urineColour !== savedState.hydrationInfo.urineColour
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
                      <span className="text-gray-900 flex-1">
                        {hydrationInfo.urineColour || "—"}
                      </span>
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
                        className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${hydrationInfo.hydrationStatus !== savedState.hydrationInfo.hydrationStatus
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
                      <span className="text-gray-900 flex-1">
                        {hydrationInfo.hydrationStatus || "—"}
                      </span>
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
                        className={`flex-1 px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${hydrationInfo.otherRemarks !== savedState.hydrationInfo.otherRemarks
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
                      <span className="text-gray-900 flex-1">
                        {hydrationInfo.otherRemarks || "—"}
                      </span>
                    )}
                  </div>
                </div>
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
                <h3 className="text-base font-medium text-gray-900 mb-4">Period</h3>
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
                        <span className="font-medium">
                          {periodInfo[field] || "—"}
                        </span>
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
                      <span className="text-gray-900 flex-1">
                        {periodInfo.signsAndSymptoms || "—"}
                      </span>
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
                      <span className="text-gray-900 flex-1">
                        {periodInfo.otherRemarks || "—"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
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
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 text-lg font-bold shadow"
            >
              ×
            </button>
            <Image
              src={lightboxSrc}
              alt="Enlarged view"
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
