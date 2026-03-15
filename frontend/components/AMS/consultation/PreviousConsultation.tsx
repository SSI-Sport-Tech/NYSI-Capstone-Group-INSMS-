import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { consultationApi, apiCall } from "@/utils/consultationApi";

export interface PreviousConsultationHandle {
  save: () => Promise<void>;
  clearAll: () => void;
}

interface PreviousConsultationProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  ensureSession?: () => Promise<string>;
  readOnly?: boolean;
  /** When true: renders without card wrapper/header and skips the type-of-consult field */
  embedded?: boolean;
  /** When true (parent edit mode): shows editable form pre-populated with current data */
  isEditMode?: boolean;
  /** Previous session ID for the Previous Session tab */
  prevSessionId?: string;
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
    carbohydrates_review: string | null;
    protein_review: string | null;
    fat_review: string | null;
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

interface CurrentConsultForm {
  consult_type: string;
  intervention_status: string;
  main_nutrition_diagnosis: string;
  carbohydrates_review: string;
  protein_review: string;
  fat_review: string;
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
  other_review: "",
  intervention_note: "",
  follow_up_note: "",
  other_remarks: "",
};

const PreviousConsultation = forwardRef<
  PreviousConsultationHandle,
  PreviousConsultationProps
>(function PreviousConsultation(
  { athleteId, sessionId, isNewConsultation, ensureSession, readOnly, embedded, isEditMode, prevSessionId },
  ref,
) {
  const [consultationData, setConsultationData] =
    useState<ConsultationData | null>(null);
  const [prevConsultData, setPrevConsultData] = useState<ConsultationData | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CurrentConsultForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(false);
  }, [form]);

  // Refs so closures always see current values
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const ensureSessionRef = useRef(ensureSession);
  useEffect(() => { ensureSessionRef.current = ensureSession; }, [ensureSession]);

  const isSavedRef = useRef(isSaved);
  useEffect(() => { isSavedRef.current = isSaved; }, [isSaved]);

  const consultTypesRef = useRef<ConsultType[]>([]);

  const [consultTypes, setConsultTypes] = useState<ConsultType[]>([]);

  // Pre-populate / reset form when isEditMode changes
  const prevIsEditModeRef = useRef(false);
  useEffect(() => {
    const wasEdit = prevIsEditModeRef.current;
    prevIsEditModeRef.current = !!isEditMode;
    if (!wasEdit && isEditMode && consultationData?.details) {
      const d = consultationData.details;
      setForm({
        consult_type: "",
        intervention_status: consultationData.intervention_status || "",
        main_nutrition_diagnosis: d.main_nutrition_diagnosis || "",
        carbohydrates_review: d.carbohydrates_review || "",
        protein_review: d.protein_review || "",
        fat_review: d.fat_review || "",
        other_review: d.other_review || "",
        intervention_note: d.intervention_note || "",
        follow_up_note: d.follow_up_note || "",
        other_remarks: d.other_remarks || "",
      });
    }
    if (wasEdit && !isEditMode) {
      setForm(emptyForm);
      setSaveError("");
    }
  }, [isEditMode]);

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
        // Only patch type_of_consult_id when NOT embedded (A section handles it when embedded)
        if (!embedded && currentForm.consult_type) {
          const typeMatch = consultTypesRef.current.find(
            (t) => t.type_of_consult === currentForm.consult_type,
          );
          if (typeMatch) {
            await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-session/${id}`,
              { method: "PATCH", headers, body: JSON.stringify({ type_of_consult_id: typeMatch.id }) },
            );
          }
        }
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/nutrition-diagnosis-summary`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              sessions_id: id,
              main_nutrition_diagnosis: currentForm.main_nutrition_diagnosis || undefined,
              carbohydrates_review: currentForm.carbohydrates_review || undefined,
              protein_review: currentForm.protein_review || undefined,
              fat_review: currentForm.fat_review || undefined,
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
          const sessionRes = (await apiCall(
            `/api/Consultation/consultation-session/${sessionId}`,
          )) as { data: { id: string; athlete_id: string; date_of_consult: string; nutritionist_name: string } };
          targetId = sessionRes.data.id;
          dateOfConsult = sessionRes.data.date_of_consult;
          nutritionistName = sessionRes.data.nutritionist_name;
          athleteId_ = sessionRes.data.athlete_id;
        } else {
          const latestSession = (await consultationApi.getLatestConsultation(athleteId)) as {
            data: { id: string; athlete_id: string; date_of_consult: string; nutritionist_name: string };
          };
          if (!latestSession?.data) { setLoading(false); return; }
          targetId = latestSession.data.id;
          dateOfConsult = latestSession.data.date_of_consult;
          nutritionistName = latestSession.data.nutritionist_name;
          athleteId_ = latestSession.data.athlete_id;
        }

        const [detailsResponse, prescriptionsResponse] = await Promise.allSettled([
          apiCall(`/api/Consultation/nutrition-diagnosis-summary/${targetId}`),
          consultationApi.getSupplementDispensing(targetId),
        ]);

        const data: ConsultationData = {
          id: targetId,
          athlete_id: athleteId_,
          date_of_consult: dateOfConsult,
          nutritionist_name: nutritionistName,
          intervention_status: "Supplement Intake",
          details:
            detailsResponse.status === "fulfilled" && detailsResponse.value
              ? (detailsResponse.value as { data: ConsultationData["details"] }).data
              : null,
          prescriptions:
            prescriptionsResponse.status === "fulfilled" && prescriptionsResponse.value
              ? ((prescriptionsResponse.value as { data: ConsultationData["prescriptions"] }).data || [])
              : [],
        };

        setConsultationData(data);
      } catch (err) {
        console.error("Error fetching consultation data:", err);
        setError("Failed to load consultation data");
      } finally {
        setLoading(false);
      }
    };

    if (readOnly ? sessionId : athleteId) {
      fetchPreviousConsultation();
    }
  }, [athleteId, sessionId, readOnly, fetchKey]);

  // Fetch previous session's nutrition diagnosis data for the "Previous Session" tab
  useEffect(() => {
    if (!prevSessionId) return;
    (async () => {
      try {
        const [sessionRes, detailsRes, prescRes] = await Promise.allSettled([
          apiCall(`/api/Consultation/consultation-session/${prevSessionId}`),
          apiCall(`/api/Consultation/nutrition-diagnosis-summary/${prevSessionId}`),
          consultationApi.getSupplementDispensing(prevSessionId),
        ]);
        const sessionData = sessionRes.status === "fulfilled"
          ? (sessionRes.value as { data: { id: string; athlete_id: string; date_of_consult: string; nutritionist_name: string } }).data
          : null;
        if (!sessionData) return;
        setPrevConsultData({
          id: sessionData.id,
          athlete_id: sessionData.athlete_id,
          date_of_consult: sessionData.date_of_consult,
          nutritionist_name: sessionData.nutritionist_name,
          details: detailsRes.status === "fulfilled" && detailsRes.value
            ? (detailsRes.value as { data: ConsultationData["details"] }).data
            : null,
          prescriptions: prescRes.status === "fulfilled"
            ? ((prescRes.value as { data: ConsultationData["prescriptions"] }).data || [])
            : [],
        });
      } catch {
        // non-critical
      }
    })();
  }, [prevSessionId]);

  // Fetch lookup tables for new-consultation or edit-mode forms
  useEffect(() => {
    if (!isNewConsultation && !isEditMode) return;
    if (readOnly) return;
    const fetchLookups = async () => {
      try {
        const { consultationLookupApi } = await import("../../../utils/consultationApi");
        const typesResponse = await consultationLookupApi.getConsultationTypes();
        setConsultTypes(typesResponse.data ?? []);
        consultTypesRef.current = typesResponse.data ?? [];
      } catch (err) {
        console.error("Failed to fetch consultation lookups:", err);
      }
    };
    fetchLookups();
  }, [isNewConsultation, isEditMode, readOnly]);

  const updateForm = (field: keyof CurrentConsultForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Save for new consultation mode
  const handleSave = async () => {
    if (!isNewConsultation || !ensureSession) return;
    setSaving(true);
    setSaveError("");
    try {
      const id = await ensureSession();
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      if (!embedded && form.consult_type) {
        const typeMatch = consultTypes.find((t) => t.type_of_consult === form.consult_type);
        if (typeMatch) {
          await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-session/${id}`,
            { method: "PATCH", headers, body: JSON.stringify({ type_of_consult_id: typeMatch.id }) },
          );
        }
      }

      const detailsRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/nutrition-diagnosis-summary`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            sessions_id: id,
            main_nutrition_diagnosis: form.main_nutrition_diagnosis || undefined,
            carbohydrates_review: form.carbohydrates_review || undefined,
            protein_review: form.protein_review || undefined,
            fat_review: form.fat_review || undefined,
            other_review: form.other_review || undefined,
            intervention_note: form.intervention_note || undefined,
            follow_up_note: form.follow_up_note || undefined,
            other_remarks: form.other_remarks || undefined,
          }),
        },
      );
      if (!detailsRes.ok) {
        const errData = await detailsRes.json().catch(() => ({}));
        throw new Error(errData?.details?.[0]?.message || errData?.error || errData?.message || `Save failed (${detailsRes.status})`);
      }
      setIsSaved(true);
      setFetchKey((k) => k + 1);
    } catch (err) {
      console.error("Error saving current consultation:", err);
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Save for parent edit mode
  const handleSaveEdit = async () => {
    if (!sessionId) return;
    setSaving(true);
    setSaveError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/nutrition-diagnosis-summary/${sessionId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            main_nutrition_diagnosis: formRef.current.main_nutrition_diagnosis || undefined,
            carbohydrates_review: formRef.current.carbohydrates_review || undefined,
            protein_review: formRef.current.protein_review || undefined,
            fat_review: formRef.current.fat_review || undefined,
            other_review: formRef.current.other_review || undefined,
            intervention_note: formRef.current.intervention_note || undefined,
            follow_up_note: formRef.current.follow_up_note || undefined,
            other_remarks: formRef.current.other_remarks || undefined,
          }),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || errData?.error || `Save failed (${res.status})`);
      }
      // Update details in place so read-only view reflects saved values immediately
      const saved = formRef.current;
      setConsultationData((prev) =>
        prev
          ? {
              ...prev,
              details: {
                main_nutrition_diagnosis: saved.main_nutrition_diagnosis || null,
                carbohydrates_review: saved.carbohydrates_review || null,
                protein_review: saved.protein_review || null,
                fat_review: saved.fat_review || null,
                other_review: saved.other_review || null,
                intervention_note: saved.intervention_note || null,
                follow_up_note: saved.follow_up_note || null,
                other_remarks: saved.other_remarks || null,
              },
            }
          : prev,
      );
      setIsSaved(true);
      setFetchKey((k) => k + 1);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
      throw err; // re-throw so parent can catch
    } finally {
      setSaving(false);
    }
  };

  // Refs so useImperativeHandle dep array stays constant (never changes size)
  const isNewConsultationRef = useRef(isNewConsultation);
  useEffect(() => { isNewConsultationRef.current = isNewConsultation; }, [isNewConsultation]);
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);
  const handleSaveEditRef = useRef(handleSaveEdit);
  useEffect(() => { handleSaveEditRef.current = handleSaveEdit; }, [handleSaveEdit]);

  // Expose save() and clearAll() to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      if (isNewConsultationRef.current) {
        await handleSaveRef.current();
      } else {
        await handleSaveEditRef.current();
      }
    },
    clearAll: () => {
      setForm(emptyForm);
      setConsultationData(null);
      setSaveError("");
    },
  }), []);

  // ─── Shared display data + tab bar (used in both form and read-only paths) ──
  const displayData = activeTab === "previous" && prevConsultData ? prevConsultData : consultationData;

  const tabBar = prevSessionId ? (
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
  ) : null;

  const prevReadOnlyContent = (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">Main Nutrition Diagnosis</h3>
        <p className="text-base font-bold text-gray-900 leading-relaxed">
          {prevConsultData?.details?.main_nutrition_diagnosis || "No diagnosis available"}
        </p>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Carbohydrate", value: prevConsultData?.details?.carbohydrates_review },
            { label: "Protein", value: prevConsultData?.details?.protein_review },
            { label: "Fat", value: prevConsultData?.details?.fat_review },
            { label: "Other", value: prevConsultData?.details?.other_review },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-900">{value || "N/A"}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">Notes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-xs text-gray-500 mb-2">Intervention Plan</h4>
            <p className="text-sm text-gray-900">{prevConsultData?.details?.intervention_note || "No intervention notes available"}</p>
          </div>
          <div>
            <h4 className="text-xs text-gray-500 mb-2">Follow-Up Notes</h4>
            <p className="text-sm text-gray-900">{prevConsultData?.details?.follow_up_note || "No follow-up notes available"}</p>
          </div>
          <div>
            <h4 className="text-xs text-gray-500 mb-2">Other Remarks</h4>
            <p className="text-sm text-gray-900">{prevConsultData?.details?.other_remarks || "No remarks"}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Editable form (new consultation or parent edit mode) ───────────────────
  const showForm = (isNewConsultation && !readOnly) || (isEditMode && !readOnly);

  if (showForm) {
    const today = new Date().toLocaleDateString();
    const content = (
      <>
        {saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}
        <div className="space-y-6">
          <div className={`grid gap-6 text-sm ${embedded ? "grid-cols-1" : "grid-cols-2"}`}>
            {/* Type of Consultation — only shown when NOT embedded (A section has it when embedded) */}
            {!embedded && (
              <div>
                <label className="block text-gray-600 mb-1">Type of Consultation:</label>
                <select
                  value={form.consult_type}
                  onChange={(e) => updateForm("consult_type", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                >
                  <option className="text-gray-500" value="">Select type...</option>
                  {consultTypes.map((t) => (
                    <option key={t.id} value={t.type_of_consult}>{t.type_of_consult}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-600 text-sm mb-1">Main Nutrition Diagnosis:</label>
            <textarea
              value={form.main_nutrition_diagnosis}
              onChange={(e) => updateForm("main_nutrition_diagnosis", e.target.value)}
              placeholder="Enter main nutrition diagnosis..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Review</h3>
            <div className="grid grid-cols-4 gap-3 text-sm">
              {(
                [
                  { label: "Carbohydrate", field: "carbohydrates_review" as const },
                  { label: "Protein", field: "protein_review" as const },
                  { label: "Fat", field: "fat_review" as const },
                  { label: "Other", field: "other_review" as const },
                ] as { label: string; field: keyof CurrentConsultForm }[]
              ).map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[field]}
                    onChange={(e) => updateForm(field, e.target.value)}
                    placeholder={`${label}...`}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Notes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Intervention Plan:</label>
                <textarea
                  value={form.intervention_note}
                  onChange={(e) => updateForm("intervention_note", e.target.value)}
                  placeholder="Input Text Here"
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Follow-Up Notes:</label>
                <textarea
                  value={form.follow_up_note}
                  onChange={(e) => updateForm("follow_up_note", e.target.value)}
                  placeholder="Input Text Here"
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Other Remarks:</label>
                <textarea
                  value={form.other_remarks}
                  onChange={(e) => updateForm("other_remarks", e.target.value)}
                  placeholder="Input Text Here"
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Bottom action buttons */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setForm(emptyForm); setSaveError(""); setIsSaved(false); }}
                className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
              >
                Clear All
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 text-white text-sm rounded disabled:opacity-50 ${isSaved ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"}`}
              >
                {saving ? "Saving..." : isSaved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </>
    );

    if (embedded) {
      return (
        <div className="pt-2">
          {tabBar}
          {activeTab === "previous" ? prevReadOnlyContent : content}
        </div>
      );
    }

    return (
      <section id="previous-consultation" className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Current Consultation</h2>
            <span className="text-sm text-gray-500">{today}</span>
          </div>
        </div>
        {tabBar}
        {activeTab === "previous" ? prevReadOnlyContent : content}
      </section>
    );
  }

  // ─── Loading / error / empty states ────────────────────────────────────────
  if (loading) {
    const inner = (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading consultation data...</span>
      </div>
    );
    if (embedded) return <div className="pt-2">{inner}</div>;
    return (
      <section id="previous-consultation" className="bg-white rounded-xl shadow-lg p-6">{inner}</section>
    );
  }

  if (error) {
    const inner = (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">⚠️ Error</div>
        <p className="text-gray-600">{error}</p>
      </div>
    );
    if (embedded) return <div className="pt-2">{inner}</div>;
    return (
      <section id="previous-consultation" className="bg-white rounded-xl shadow-lg p-6">{inner}</section>
    );
  }

  if (!consultationData) {
    const inner = (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">📋</div>
        <p className="text-gray-600">No consultation data available</p>
      </div>
    );
    if (embedded) return <div className="pt-2">{inner}</div>;
    return (
      <section id="previous-consultation" className="bg-white rounded-xl shadow-lg p-6">{inner}</section>
    );
  }

  // ─── Read-only view ─────────────────────────────────────────────────────────
  const readOnlyContent = (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">Main Nutrition Diagnosis</h3>
        <p className="text-base font-bold text-gray-900 leading-relaxed">
          {displayData?.details?.main_nutrition_diagnosis || "No diagnosis available"}
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Carbohydrate", value: displayData?.details?.carbohydrates_review },
            { label: "Protein", value: displayData?.details?.protein_review },
            { label: "Fat", value: displayData?.details?.fat_review },
            { label: "Other", value: displayData?.details?.other_review },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-900">{value || "N/A"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-medium text-gray-900">Notes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-xs text-gray-500 mb-2">Intervention Plan</h4>
            <p className="text-sm text-gray-900">
              {displayData?.details?.intervention_note || "No intervention notes available"}
            </p>
          </div>
          <div>
            <h4 className="text-xs text-gray-500 mb-2">Follow-Up Notes</h4>
            <p className="text-sm text-gray-900">
              {displayData?.details?.follow_up_note || "No follow-up notes available"}
            </p>
          </div>
          <div>
            <h4 className="text-xs text-gray-500 mb-2">Other Remarks</h4>
            <p className="text-sm text-gray-900">
              {displayData?.details?.other_remarks || "No remarks"}
            </p>
          </div>
        </div>
      </div>

      {!embedded && displayData && (
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">Prescription</h3>
          {displayData.prescriptions.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
              No prescriptions available
            </div>
          ) : (
            <div className="space-y-4">
              {displayData.prescriptions.map((prescription, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Supplement Name</p>
                      <p className="font-medium text-gray-900">{prescription.supplement_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Prescriber</p>
                      <p className="font-medium text-gray-900">{prescription.prescriber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Batch Number</p>
                      <p className="font-medium text-gray-900">{prescription.batch_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Dosage</p>
                      <p className="font-medium text-gray-900">{prescription.dosage}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Dosage Unit</p>
                      <p className="font-medium text-gray-900">{prescription.dosage_unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Dosage Frequency</p>
                      <p className="font-medium text-gray-900">{prescription.dosage_frequency}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return <div className="pt-2">{tabBar}{readOnlyContent}</div>;
  }

  return (
    <section id="previous-consultation" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {readOnly ? "Consultation Notes" : "Previous Consultation"}
        </h2>
        <span className="text-sm text-gray-500">
          {displayData ? new Date(displayData.date_of_consult).toLocaleDateString() : ""}
        </span>
      </div>
      {tabBar}
      {readOnlyContent}
    </section>
  );
});

export default PreviousConsultation;
