import { useState, useEffect, useRef } from "react";
import { consultationApi, apiCall } from "@/utils/consultationApi";

interface PreviousConsultationProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
}

interface ConsultationData {
  id: string;
  athlete_id: string;
  date_of_consult: string;
  nutritionist_name: string;
  intervention_status?: string;
  consult_type?: string;
  details: {
    main_nutrition_diagnosis: string | null;
    carbohydrates_review_diagnosis: string | null;
    protein_review_diagnosis: string | null;
    fat_review_diagnosis: string | null;
    fibre_review_diagnosis: string | null;
    iron_review_diagnosis: string | null;
    calcium_review_diagnosis: string | null;
    micronutrients_review_diagnosis: string | null;
    other_review: string | null;
    intervention_note: string | null;
    follow_up_note: string | null;
    other_remarks: string | null;
  } | null;
  prescriptions: Array<{
    supplement_name: string;
    prescriber: string;
    batch_number: string;
    dosage: number;
    dosage_unit: string;
    dosage_frequency: string;
  }>;
}

const INTERVENTION_STATUSES = [
  "Supplement Intake",
  "Dietary Modification",
  "Referral",
  "No Change",
];

interface ConsultType {
  id: string;
  type_of_consult: string;
}

interface NutritionDiagnosis {
  id: string;
  category: string;
  diagnosis: string;
}

interface CurrentConsultForm {
  consult_type: string;
  intervention_status: string;
  main_nutrition_diagnosis: string;
  carbohydrates_review: string;
  protein_review: string;
  fat_review: string;
  fibre_review: string;
  iron_review: string;
  calcium_review: string;
  micronutrients_review: string;
  other_review: string;
  intervention_note: string;
  follow_up_note: string;
  other_remarks: string;
}

const emptyForm: CurrentConsultForm = {
  consult_type: "",
  intervention_status: "",
  main_nutrition_diagnosis: "",
  carbohydrates_review: "",
  protein_review: "",
  fat_review: "",
  fibre_review: "",
  iron_review: "",
  calcium_review: "",
  micronutrients_review: "",
  other_review: "",
  intervention_note: "",
  follow_up_note: "",
  other_remarks: "",
};

export default function PreviousConsultation({
  athleteId,
  sessionId,
  isNewConsultation,
  ensureSession,
  readOnly,
}: PreviousConsultationProps) {
  const [consultationData, setConsultationData] =
    useState<ConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CurrentConsultForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(false);
  }, [form]);

  // Refs so the auto-save closure always sees current values
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  const ensureSessionRef = useRef(ensureSession);
  useEffect(() => {
    ensureSessionRef.current = ensureSession;
  }, [ensureSession]);
  const isSavedRef = useRef(isSaved);
  useEffect(() => {
    isSavedRef.current = isSaved;
  }, [isSaved]);
  const consultTypesRef = useRef<ConsultType[]>([]);

  // Auto-save when "Save and Finish" transitions isNewConsultation true → false
  const prevIsNewRef = useRef(!!isNewConsultation);
  useEffect(() => {
    const wasNew = prevIsNewRef.current;
    prevIsNewRef.current = !!isNewConsultation;
    if (!wasNew || isNewConsultation || readOnly) return;

    const currentForm = formRef.current;
    const currentEnsureSession = ensureSessionRef.current;
    if (isSavedRef.current || !currentEnsureSession) return;
    if (!Object.values(currentForm).some((v) => v !== "")) return;

    (async () => {
      try {
        const id = await currentEnsureSession();
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        if (currentForm.consult_type) {
          const typeMatch = consultTypesRef.current.find(
            (t) => t.type_of_consult === currentForm.consult_type,
          );
          if (typeMatch) {
            await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-update/${id}`,
              {
                method: "PATCH",
                headers,
                body: JSON.stringify({ type_of_consult_id: typeMatch.id }),
              },
            );
          }
        }
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-details`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              sessions_id: id,
              main_nutrition_diagnosis:
                currentForm.main_nutrition_diagnosis || undefined,
              carbohydrates_review_id: currentForm.carbohydrates_review || null,
              protein_review_id: currentForm.protein_review || null,
              fat_review_id: currentForm.fat_review || null,
              fibre_review_id: currentForm.fibre_review || null,
              iron_review_id: currentForm.iron_review || null,
              calcium_review_id: currentForm.calcium_review || null,
              micronutrients_review_id:
                currentForm.micronutrients_review || null,
              other_review: currentForm.other_review || undefined,
              intervention_note: currentForm.intervention_note || undefined,
              follow_up_note: currentForm.follow_up_note || undefined,
              other_remarks: currentForm.other_remarks || undefined,
            }),
          },
        );
      } catch (e) {
        console.error("[PreviousConsultation] Auto-save on finish failed:", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewConsultation]);

  const [consultTypes, setConsultTypes] = useState<ConsultType[]>([]);
  const [nutritionDiagnoses, setNutritionDiagnoses] = useState<
    NutritionDiagnosis[]
  >([]);

  useEffect(() => {
    const fetchPreviousConsultation = async () => {
      try {
        setLoading(true);
        setError(null);

        let targetId: string;
        let dateOfConsult: string;
        let nutritionistName: string;
        let athleteId_: string;

        if (readOnly && sessionId) {
          // In readOnly (history view), fetch the specific session by sessionId
          const sessionRes = (await apiCall(
            `/api/Consultation/consultation-update/${sessionId}`,
          )) as {
            data: {
              id: string;
              athlete_id: string;
              date_of_consult: string;
              nutritionist_name: string;
            };
          };
          targetId = sessionRes.data.id;
          dateOfConsult = sessionRes.data.date_of_consult;
          nutritionistName = sessionRes.data.nutritionist_name;
          athleteId_ = sessionRes.data.athlete_id;
        } else {
          // Default: fetch latest consultation for athlete
          const latestSession = (await consultationApi.getLatestConsultation(
            athleteId,
          )) as {
            data: {
              id: string;
              athlete_id: string;
              date_of_consult: string;
              nutritionist_name: string;
            };
          };
          if (!latestSession?.data) {
            setLoading(false);
            return;
          }
          targetId = latestSession.data.id;
          dateOfConsult = latestSession.data.date_of_consult;
          nutritionistName = latestSession.data.nutritionist_name;
          athleteId_ = latestSession.data.athlete_id;
        }

        const [detailsResponse, prescriptionsResponse] =
          await Promise.allSettled([
            apiCall(`/api/Consultation/consultation-details/${targetId}`),
            consultationApi.getPrescriptions(targetId),
          ]);

        const consultationData: ConsultationData = {
          id: targetId,
          athlete_id: athleteId_,
          date_of_consult: dateOfConsult,
          nutritionist_name: nutritionistName,
          intervention_status: "Supplement Intake",
          details:
            detailsResponse.status === "fulfilled"
              ? (
                  detailsResponse.value as {
                    data: ConsultationData["details"];
                  }
                ).data
              : null,
          prescriptions:
            prescriptionsResponse.status === "fulfilled"
              ? (
                  prescriptionsResponse.value as {
                    data: ConsultationData["prescriptions"];
                  }
                ).data || []
              : [],
        };

        setConsultationData(consultationData);
      } catch (err) {
        console.error("Error fetching previous consultation:", err);
        setError("Failed to load previous consultation data");
      } finally {
        setLoading(false);
      }
    };

    if (readOnly ? sessionId : athleteId) {
      fetchPreviousConsultation();
    }
  }, [athleteId, sessionId, readOnly]);

  // Fetch lookup tables needed for saving new consultation data
  useEffect(() => {
    if (!isNewConsultation || readOnly) return;
    const fetchLookups = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const { consultationLookupApi } =
          await import("../../../utils/consultationApi");
        const [typesResponse, diagResponse] = await Promise.all([
          consultationLookupApi.getConsultationTypes(),
          consultationLookupApi.getNutritionDiagnoses(),
        ]);

        setConsultTypes(typesResponse.data ?? []);
        consultTypesRef.current = typesResponse.data ?? [];
        setNutritionDiagnoses(diagResponse.data ?? []);
      } catch (err) {
        console.error("Failed to fetch consultation lookups:", err);
      }
    };
    fetchLookups();
  }, [isNewConsultation, readOnly]);

  const updateForm = (field: keyof CurrentConsultForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!isNewConsultation || !ensureSession) return;
    setSaving(true);
    setSaveError("");
    try {
      const id = await ensureSession();
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // PATCH type_of_consult_id if a consult type was selected
      if (form.consult_type) {
        const typeMatch = consultTypes.find(
          (t) => t.type_of_consult === form.consult_type,
        );
        if (typeMatch) {
          await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-update/${id}`,
            {
              method: "PATCH",
              headers,
              body: JSON.stringify({ type_of_consult_id: typeMatch.id }),
            },
          );
        }
      }

      // POST consultation details
      const detailsRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-details`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            sessions_id: id,
            main_nutrition_diagnosis:
              form.main_nutrition_diagnosis || undefined,
            carbohydrates_review_id: form.carbohydrates_review || null,
            protein_review_id: form.protein_review || null,
            fat_review_id: form.fat_review || null,
            fibre_review_id: form.fibre_review || null,
            iron_review_id: form.iron_review || null,
            calcium_review_id: form.calcium_review || null,
            micronutrients_review_id: form.micronutrients_review || null,
            other_review: form.other_review || undefined,
            intervention_note: form.intervention_note || undefined,
            follow_up_note: form.follow_up_note || undefined,
            other_remarks: form.other_remarks || undefined,
          }),
        },
      );
      if (!detailsRes.ok) {
        const errData = await detailsRes.json().catch(() => ({}));
        const msg =
          errData?.details?.[0]?.message ||
          errData?.error ||
          errData?.message ||
          `Save failed (${detailsRes.status})`;
        throw new Error(msg);
      }
      setIsSaved(true);
    } catch (err) {
      console.error("Error saving current consultation:", err);
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Render "Current Consultation" form when isNewConsultation=true (and not in readOnly mode)
  if (isNewConsultation && !readOnly) {
    const today = new Date().toLocaleDateString();

    return (
      <section
        id="previous-consultation"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Current Consultation
            </h2>
            <span className="text-sm text-gray-500">{today}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-3 py-1 text-white text-sm rounded disabled:opacity-50 ${isSaved ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"}`}
          >
            {saving ? "Saving..." : isSaved ? "Saved" : "Save"}
          </button>
        </div>

        {saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}

        <div className="space-y-6">
          {/* Type of Consultation + Intervention Status */}
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <label className="block text-gray-600 mb-1">
                Type of Consultation:
              </label>
              <select
                value={form.consult_type}
                onChange={(e) => updateForm("consult_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
              >
                <option className="text-gray-500" value="">
                  Select type...
                </option>
                {consultTypes.map((t) => (
                  <option key={t.id} value={t.type_of_consult}>
                    {t.type_of_consult}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">
                Intervention Status:
              </label>
              <select
                value={form.intervention_status}
                onChange={(e) =>
                  updateForm("intervention_status", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
              >
                <option value="">Select status...</option>
                {INTERVENTION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Nutrition Diagnosis */}
          <div>
            <label className="block text-gray-600 text-sm mb-1">
              Main Nutrition Diagnosis:
            </label>
            <textarea
              value={form.main_nutrition_diagnosis}
              onChange={(e) =>
                updateForm("main_nutrition_diagnosis", e.target.value)
              }
              placeholder="Enter main nutrition diagnosis..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
            />
          </div>

          {/* Review Dropdowns */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Review</h3>
            <div className="grid grid-cols-4 gap-3 text-sm">
              {(
                [
                  {
                    label: "Carbohydrate",
                    field: "carbohydrates_review" as const,
                    category: "CARB",
                  },
                  {
                    label: "Protein",
                    field: "protein_review" as const,
                    category: "PROTEIN",
                  },
                  {
                    label: "Fat",
                    field: "fat_review" as const,
                    category: "FAT",
                  },
                  {
                    label: "Fibre",
                    field: "fibre_review" as const,
                    category: "FIBRE",
                  },
                  {
                    label: "Iron",
                    field: "iron_review" as const,
                    category: "IRON",
                  },
                  {
                    label: "Calcium",
                    field: "calcium_review" as const,
                    category: "CALCIUM",
                  },
                  {
                    label: "Micronutrients",
                    field: "micronutrients_review" as const,
                    category: "MICRO",
                  },
                ] as {
                  label: string;
                  field: keyof CurrentConsultForm;
                  category: string;
                }[]
              ).map(({ label, field, category }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {label}
                  </label>
                  <select
                    value={form[field]}
                    onChange={(e) => updateForm(field, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                  >
                    <option value="">—</option>
                    {nutritionDiagnoses
                      .filter((d) => d.category === category)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.diagnosis}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Other
                </label>
                <input
                  type="text"
                  value={form.other_review}
                  onChange={(e) => updateForm("other_review", e.target.value)}
                  placeholder="Other..."
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Notes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Intervention Notes:
                </label>
                <textarea
                  value={form.intervention_note}
                  onChange={(e) =>
                    updateForm("intervention_note", e.target.value)
                  }
                  placeholder="Input Text Here"
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Follow-Up Notes:
                </label>
                <textarea
                  value={form.follow_up_note}
                  onChange={(e) => updateForm("follow_up_note", e.target.value)}
                  placeholder="Input Text Here"
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Other Remarks:
                </label>
                <textarea
                  value={form.other_remarks}
                  onChange={(e) => updateForm("other_remarks", e.target.value)}
                  placeholder="Input Text Here"
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Read-only previous consultation view
  if (loading) {
    return (
      <section
        id="previous-consultation"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            Loading previous consultation...
          </span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        id="previous-consultation"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="text-center py-12">
          <div className="text-red-600 mb-2">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </section>
    );
  }

  if (!consultationData) {
    return (
      <section
        id="previous-consultation"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">📋</div>
          <p className="text-gray-600">
            No previous consultation data available
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="previous-consultation"
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {readOnly ? "Consultation Notes" : "Previous Consultation"}
        </h2>
        <span className="text-sm text-gray-500">
          {new Date(consultationData.date_of_consult).toLocaleDateString()}
        </span>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">
            Intervention Status
          </h3>
          <p className="text-lg font-semibold text-gray-900">
            {consultationData.intervention_status || "Not specified"}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">
            Main Nutrition Diagnosis
          </h3>
          <p className="text-sm text-gray-900 leading-relaxed">
            {consultationData.details?.main_nutrition_diagnosis ||
              "No diagnosis available"}
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Carbohydrate</p>
              <p className="text-sm font-medium text-gray-900">
                {consultationData.details?.carbohydrates_review_diagnosis ||
                  "N/A"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Protein</p>
              <p className="text-sm font-medium text-gray-900">
                {consultationData.details?.protein_review_diagnosis || "N/A"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Fat</p>
              <p className="text-sm font-medium text-gray-900">
                {consultationData.details?.fat_review_diagnosis || "N/A"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Fibre</p>
              <p className="text-sm font-medium text-gray-900">
                {consultationData.details?.fibre_review_diagnosis || "N/A"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Iron</p>
              <p className="text-sm font-medium text-gray-900">
                {consultationData.details?.iron_review_diagnosis || "N/A"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Calcium</p>
              <p className="text-sm font-medium text-gray-900">
                {consultationData.details?.calcium_review_diagnosis || "N/A"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Micronutrients</p>
              <p className="text-sm font-medium text-gray-900">
                {consultationData.details?.micronutrients_review_diagnosis ||
                  "N/A"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Other</p>
              <p className="text-sm font-medium text-gray-900">
                {consultationData.details?.other_review || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xs text-gray-500 mb-2">Intervention Notes</h4>
              <p className="text-sm text-gray-900">
                {consultationData.details?.intervention_note ||
                  "No intervention notes available"}
              </p>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-2">Follow-Up Notes</h4>
              <p className="text-sm text-gray-900">
                {consultationData.details?.follow_up_note ||
                  "No follow-up notes available"}
              </p>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-2">Other Remarks</h4>
              <p className="text-sm text-gray-900">
                {consultationData.details?.other_remarks || "No remarks"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">Prescription</h3>
          {consultationData.prescriptions.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
              No prescriptions available
            </div>
          ) : (
            <div className="space-y-4">
              {consultationData.prescriptions.map((prescription, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Supplement Name
                      </p>
                      <p className="font-medium text-gray-900">
                        {prescription.supplement_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Prescriber</p>
                      <p className="font-medium text-gray-900">
                        {prescription.prescriber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Batch Number</p>
                      <p className="font-medium text-gray-900">
                        {prescription.batch_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Dosage</p>
                      <p className="font-medium text-gray-900">
                        {prescription.dosage}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Dosage Unit</p>
                      <p className="font-medium text-gray-900">
                        {prescription.dosage_unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Dosage Frequency
                      </p>
                      <p className="font-medium text-gray-900">
                        {prescription.dosage_frequency}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
