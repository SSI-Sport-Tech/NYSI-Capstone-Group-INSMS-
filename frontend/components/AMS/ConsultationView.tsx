"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  consultationApi,
  consultationLookupApi,
  ConsultationApiError,
} from "../../utils/consultationApi";
import Actionables from "./consultation/Actionables";
import PreviousConsultation, { type PreviousConsultationHandle } from "./consultation/PreviousConsultation";
import SupplementDispensing from "./consultation/SupplementDispensing";
import TrainingSchedule from "./consultation/TrainingSchedule";
import MealLogs from "./consultation/MealLogs";
import Anthropometry from "./consultation/Anthropometry";
import MedicalHistory from "./consultation/MedicalHistory";
import NutritionRequirements from "./consultation/NutritionRequirements";
import NewSupplementDispensingForm from "./consultation/NewSupplementDispensingForm";
import ScheduledSessionSelectorModal, {
  type ScheduledSession,
} from "./consultation/ScheduledSessionSelectorModal";
import ConsultationStepSidebar from "./consultation/ConsultationStepSidebar";
import ConsultationDetailsStep from "./consultation/ConsultationDetailsStep";
import {
  EMPTY_UPDATE_FORM,
  hasUpdateFormData,
  normalizeUpdateForm,
  STEPS,
  TOTAL_STEPS,
  type ConsultType,
  type LatestConsultation,
  type StepStatus,
  type UpdateForm,
} from "./consultation/consultationViewTypes";

interface ConsultationViewProps {
  athleteId: string;
  athleteName: string;
  /** When provided (e.g. navigating from dashboard), load this session instead of the latest. */
  initialSessionId?: string;
}


export default function ConsultationView({
  athleteId,
  athleteName,
  initialSessionId,
}: ConsultationViewProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [consultDetailsTab, setConsultDetailsTab] = useState<"current" | "previous">("current");
  const [latestConsultation, setLatestConsultation] =
    useState<LatestConsultation | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Live anthropometry values shared from Anthropometry card to Adherences
  const [liveAnthro, setLiveAnthro] = useState<{
    weight: number | null;
    height: number | null;
    targetWeight: number | null;
  }>({ weight: null, height: null, targetWeight: null });

  const handleAnthroChange = useCallback(
    (weight: number | null, height: number | null, targetWeight: number | null) => {
      setLiveAnthro({ weight, height, targetWeight });
    },
    [],
  );

  // New consultation state
  const [isNewConsultation, setIsNewConsultation] = useState(false);
  const [, setNewSessionId] = useState<string>("");
  const [, setNewConsultation] = useState<LatestConsultation | null>(null);

  // Refs for lazy session creation
  const sessionIdRef = useRef<string>("");
  const sessionCreationRef = useRef<Promise<string> | null>(null);

  // Tracks which steps have been saved (green tick in sidebar)
  const [stepSaved, setStepSaved] = useState<Set<number>>(new Set());
  const markSaved = (stepId: number) =>
    setStepSaved((prev) => new Set(prev).add(stepId));
  const [childStepStatus, setChildStepStatus] = useState<Partial<Record<number, Exclude<StepStatus, "viewing">>>>({});
  const setStepStatus = useCallback((stepId: number, status: Exclude<StepStatus, "viewing">) => {
    setChildStepStatus((prev) => {
      if (prev[stepId] === status) return prev;
      return { ...prev, [stepId]: status };
    });
  }, []);

  // Edit mode state — Step 1 (Consultation Details)
  const [isEditMode, setIsEditMode] = useState(false);
  const [consultTypes, setConsultTypes] = useState<ConsultType[]>([]);
  const [consultObjectives, setConsultObjectives] = useState<{ id: string; consultation_objective: string }[]>([]);
  const [updateForm, setUpdateForm] = useState<UpdateForm>(EMPTY_UPDATE_FORM);
  const [lastSavedUpdateForm, setLastSavedUpdateForm] = useState<UpdateForm>(EMPTY_UPDATE_FORM);
  const [isUpdateCardSaved, setIsUpdateCardSaved] = useState(false);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [updateSaveError, setUpdateSaveError] = useState("");

  // Edit mode state — Step 7 (Main Nutrition Diagnosis)
  const [isDiagnosisEditMode, setIsDiagnosisEditMode] = useState(false);
  const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);
  const [diagnosisSaveError, setDiagnosisSaveError] = useState("");
  const shouldShowSavedIndicators =
    isNewConsultation ||
    isEditMode ||
    isDiagnosisEditMode;
  const updateFormRef = useRef<UpdateForm>(EMPTY_UPDATE_FORM);
  const ensureSessionForUpdateRef = useRef<() => Promise<string>>(async () => "");
  const previousConsultRef = useRef<PreviousConsultationHandle>(null);

  // Previous session ID — fetched when viewing an existing session
  const [fetchedPrevSessionId, setFetchedPrevSessionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!currentSessionId || isNewConsultation) { setFetchedPrevSessionId(undefined); return; }
    const token = localStorage.getItem("token");
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-session/${currentSessionId}/previous`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => setFetchedPrevSessionId(json?.data?.id ?? undefined))
      .catch(() => {});
  }, [currentSessionId, isNewConsultation]);

  // Session selector modal
  const [showSessionSelector, setShowSessionSelector] = useState(false);

  const markSessionCompleted = useCallback(
    async (sessionId: string, status?: LatestConsultation["status"]) => {
      if (!sessionId || status === "completed" || status === "cancelled") {
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-session/${sessionId}/status`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "completed" }),
          },
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData?.message || errData?.error || `Status update failed (${res.status})`,
          );
        }

        setLatestConsultation((prev) =>
          prev && prev.id === sessionId ? { ...prev, status: "completed" } : prev,
        );
      } catch (e) {
        console.error("[ConsultationView] Auto-complete session failed:", e);
      }
    },
    [],
  );

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (sessionCreationRef.current) return sessionCreationRef.current;

    sessionCreationRef.current = (async () => {
      try {
        const token = localStorage.getItem("token");

        const typesResponse = await consultationLookupApi.getConsultationTypes();
        const defaultTypeId = typesResponse.data?.[0]?.id as string | undefined;
        if (!defaultTypeId) throw new Error("No active consult types found");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-session`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              athlete_id: athleteId,
              type_of_consult_id: defaultTypeId,
              date_of_consult: (() => {
                const d = new Date();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              })(),
            }),
          },
        );
        const data = await response.json();
        const id = data?.data?.id as string;
        if (!id) {
          const d = data?.details?.[0];
          throw new Error(
            d ? `${d.field}: ${d.message}` : (data?.message ?? data?.error ?? `Session creation failed (${response.status})`),
          );
        }
        sessionIdRef.current = id;
        setNewSessionId(id);
        setNewConsultation(data.data as LatestConsultation);
        return id;
      } finally {
        sessionCreationRef.current = null;
      }
    })();

    return sessionCreationRef.current;
  }, [athleteId]);

  useEffect(() => {
    ensureSessionForUpdateRef.current = ensureSession;
  }, [ensureSession]);

  useEffect(() => {
    updateFormRef.current = updateForm;
  }, [updateForm]);

  const isUpdateFormDirty =
    (isEditMode || isNewConsultation) &&
    JSON.stringify(normalizeUpdateForm(updateForm)) !==
      JSON.stringify(normalizeUpdateForm(lastSavedUpdateForm));
  const updateCardStatus: StepStatus = isUpdateFormDirty
    ? "dirty"
    : isUpdateCardSaved
      ? "saved"
      : currentStep === 1
        ? "viewing"
        : "default";

  useEffect(() => {
    if (!isEditMode && !isNewConsultation) return;
    consultationLookupApi.getConsultationTypes().then((res) => setConsultTypes(res.data ?? [])).catch(() => {});
    consultationLookupApi.getConsultationObjectives().then((res) => setConsultObjectives(res.data ?? [])).catch(() => {});
  }, [isEditMode, isNewConsultation]);

  const fetchSessionById = async (sessionId: string) => {
    try {
      setLoading(true);
      setError("");
      const response = (await consultationApi.getConsultationById(sessionId)) as {
        data: LatestConsultation;
      } | null;
      const data = response?.data as LatestConsultation | undefined;
      if (!data) throw new Error("Session not found");
      setLatestConsultation(data);
      setCurrentSessionId(data.id);
      const mappedForm = normalizeUpdateForm({
        type_of_consult_id: data.type_of_consult_id || "",
        title_description: data.title_description || "",
        venue: data.venue || "",
        date_of_consult: data.date_of_consult ? data.date_of_consult.split("T")[0] : "",
        time_of_consult: data.time_of_consult ? data.time_of_consult.substring(0, 5) : "",
        date_of_next_follow_up: data.date_of_next_follow_up
          ? data.date_of_next_follow_up.split("T")[0]
          : "",
        time_of_next_follow_up: data.time_of_next_follow_up
          ? data.time_of_next_follow_up.substring(0, 5)
          : "",
        consultation_objective_id: data.consultation_objective_id || "",
      });
      setLastSavedUpdateForm(mappedForm);
      setIsUpdateCardSaved(hasUpdateFormData(mappedForm));
    } catch {
      await fetchLatestConsultation();
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestConsultation = async () => {
    try {
      setLoading(true);
      setError("");

      const response = (await consultationApi.getLatestConsultation(
        athleteId,
      )) as { data: LatestConsultation } | null;
      if (!response) {
        setLatestConsultation(null);
        setCurrentSessionId("");
        setLastSavedUpdateForm(EMPTY_UPDATE_FORM);
        setIsUpdateCardSaved(false);
        return;
      }
      const data = response.data as LatestConsultation;
      setLatestConsultation(data);
      setCurrentSessionId(data.id);
      const mappedForm = normalizeUpdateForm({
        type_of_consult_id: data.type_of_consult_id || "",
        title_description: data.title_description || "",
        venue: data.venue || "",
        date_of_consult: data.date_of_consult ? data.date_of_consult.split("T")[0] : "",
        time_of_consult: data.time_of_consult ? data.time_of_consult.substring(0, 5) : "",
        date_of_next_follow_up: data.date_of_next_follow_up
          ? data.date_of_next_follow_up.split("T")[0]
          : "",
        time_of_next_follow_up: data.time_of_next_follow_up
          ? data.time_of_next_follow_up.substring(0, 5)
          : "",
        consultation_objective_id: data.consultation_objective_id || "",
      });
      setLastSavedUpdateForm(mappedForm);
      setIsUpdateCardSaved(hasUpdateFormData(mappedForm));
    } catch (error) {
      if (error instanceof ConsultationApiError && error.status === 404) {
        setLatestConsultation(null);
        setCurrentSessionId("");
        setLastSavedUpdateForm(EMPTY_UPDATE_FORM);
        setIsUpdateCardSaved(false);
      } else {
        console.error("Error fetching latest consultation:", error);
        setError("Failed to load consultation data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!athleteId) return;
    if (initialSessionId) {
      fetchSessionById(initialSessionId);
    } else {
      fetchLatestConsultation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId, initialSessionId]);

  const handleStartNewConsultation = () => {
    const today = new Date();
    const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setUpdateForm({ ...EMPTY_UPDATE_FORM, date_of_consult: d });
    setLastSavedUpdateForm(EMPTY_UPDATE_FORM);
    setIsUpdateCardSaved(false);
    if (latestConsultation?.is_scheduled_booking) {
      setShowSessionSelector(true);
      return;
    }
    setIsNewConsultation(true);
    setCurrentStep(1);
  };

  const handleSelectScheduledSession = (session: ScheduledSession) => {
    sessionIdRef.current = session.id;
    sessionCreationRef.current = null;
    setNewSessionId(session.id);
    setNewConsultation(session as unknown as LatestConsultation);
    setUpdateForm({
      type_of_consult_id: session.type_of_consult_id ?? "",
      title_description: session.title_description ?? "",
      venue: session.venue ?? "",
      date_of_consult: session.date_of_consult ?? "",
      time_of_consult: session.time_of_consult ?? "",
      date_of_next_follow_up: session.date_of_next_follow_up ?? "",
      time_of_next_follow_up: session.time_of_next_follow_up ?? "",
      consultation_objective_id: session.consultation_objective_id ?? "",
    });
    setLastSavedUpdateForm(EMPTY_UPDATE_FORM);
    setIsUpdateCardSaved(false);
    setShowSessionSelector(false);
    setIsNewConsultation(true);
    setCurrentStep(1);
  };

  const handleStartNewFromModal = () => {
    sessionIdRef.current = "";
    sessionCreationRef.current = null;
    setNewSessionId("");
    setNewConsultation(null);
    setShowSessionSelector(false);
    setIsNewConsultation(true);
    setCurrentStep(1);
  };

  const handleCancelNewConsultation = () => {
    setIsNewConsultation(false);
    setNewSessionId("");
    setNewConsultation(null);
    setUpdateForm(EMPTY_UPDATE_FORM);
    setLastSavedUpdateForm(EMPTY_UPDATE_FORM);
    setIsUpdateCardSaved(false);
    setUpdateSaveError("");
    sessionIdRef.current = "";
    sessionCreationRef.current = null;
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    try {
      await handleSaveUpdateCard();
      await previousConsultRef.current?.save();
      const sessionIdToComplete = sessionIdRef.current || currentSessionId;
      const sessionStatusToComplete =
        isNewConsultation ? undefined : latestConsultation?.status;
      if (sessionIdToComplete) {
        await markSessionCompleted(sessionIdToComplete, sessionStatusToComplete);
      }
      setIsNewConsultation(false);
      setNewSessionId("");
      setNewConsultation(null);
      markSaved(1);
      await fetchLatestConsultation();
    } finally {
      setIsSavingAll(false);
    }
  };

  const prevIsNewForUpdateRef = useRef(false);
  useEffect(() => {
    const wasNew = prevIsNewForUpdateRef.current;
    prevIsNewForUpdateRef.current = !!isNewConsultation;
    if (!wasNew || isNewConsultation) return;

    const form = updateFormRef.current;
    const hasData = Object.values(form).some((v) => v !== "");
    if (!hasData) return;

    (async () => {
      try {
        const id = sessionIdRef.current || (await ensureSessionForUpdateRef.current());
        if (!id) return;
        const token = localStorage.getItem("token");
        const body: Record<string, string> = {};
        if (form.type_of_consult_id) body.type_of_consult_id = form.type_of_consult_id;
        if (form.title_description) body.title_description = form.title_description;
        if (form.venue) body.venue = form.venue;
        if (form.date_of_consult) body.date_of_consult = form.date_of_consult;
        if (form.time_of_consult) body.time_of_consult = form.time_of_consult;
        if (form.date_of_next_follow_up) body.date_of_next_follow_up = form.date_of_next_follow_up;
        if (form.time_of_next_follow_up) body.time_of_next_follow_up = form.time_of_next_follow_up;
        if (form.consultation_objective_id) body.consultation_objective_id = form.consultation_objective_id;
        if (Object.keys(body).length === 0) return;
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-session/${id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        );
        setLastSavedUpdateForm(normalizeUpdateForm(form));
        setIsUpdateCardSaved(true);
      } catch (e) {
        console.error("[ConsultationView] Auto-save update form failed:", e);
      }
    })();
  }, [isNewConsultation]);

  const handleEditClick = () => {
    if (!latestConsultation) return;
    const d = latestConsultation;
    setUpdateForm({
      type_of_consult_id: d.type_of_consult_id || "",
      title_description: d.title_description || "",
      venue: d.venue || "",
      date_of_consult: d.date_of_consult ? d.date_of_consult.split("T")[0] : "",
      time_of_consult: d.time_of_consult ? d.time_of_consult.substring(0, 5) : "",
      date_of_next_follow_up: d.date_of_next_follow_up
        ? d.date_of_next_follow_up.split("T")[0]
        : "",
      time_of_next_follow_up: d.time_of_next_follow_up ? d.time_of_next_follow_up.substring(0, 5) : "",
      consultation_objective_id: d.consultation_objective_id || "",
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setUpdateSaveError("");
  };

  const handleClearConsultationDetails = () => {
    setUpdateForm(EMPTY_UPDATE_FORM);
    setIsUpdateCardSaved(false);
    setUpdateSaveError("");
  };

  const handleSaveDiagnosis = async () => {
    setIsSavingDiagnosis(true);
    setDiagnosisSaveError("");
    try {
      await previousConsultRef.current?.save();
      setIsDiagnosisEditMode(false);
      markSaved(7);
    } catch (e) {
      setDiagnosisSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSavingDiagnosis(false);
    }
  };

  const handleSaveUpdate = async () => {
    if (!currentSessionId) return;
    setIsSavingUpdate(true);
    setUpdateSaveError("");
    try {
      const token = localStorage.getItem("token");
      const body: Record<string, string> = {};
      if (updateForm.type_of_consult_id) body.type_of_consult_id = updateForm.type_of_consult_id;
      if (updateForm.title_description) body.title_description = updateForm.title_description;
      if (updateForm.venue) body.venue = updateForm.venue;
      if (updateForm.date_of_consult) body.date_of_consult = updateForm.date_of_consult;
      if (updateForm.time_of_consult) body.time_of_consult = updateForm.time_of_consult;
      if (updateForm.date_of_next_follow_up) body.date_of_next_follow_up = updateForm.date_of_next_follow_up;
      if (updateForm.time_of_next_follow_up) body.time_of_next_follow_up = updateForm.time_of_next_follow_up;
      if (updateForm.consultation_objective_id) body.consultation_objective_id = updateForm.consultation_objective_id;
      if (Object.keys(body).length === 0) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-session/${currentSessionId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.message || errData?.error || `Save failed (${res.status})`,
        );
      }
      setIsEditMode(false);
      setLastSavedUpdateForm(normalizeUpdateForm(updateForm));
      setIsUpdateCardSaved(true);
      markSaved(1);
      await markSessionCompleted(currentSessionId, latestConsultation?.status);
      await fetchLatestConsultation();
    } catch (e) {
      setUpdateSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSavingUpdate(false);
    }
  };

  const handleSaveUpdateCard = async () => {
    setIsSavingUpdate(true);
    setUpdateSaveError("");
    try {
      const id = await ensureSession();
      const token = localStorage.getItem("token");
      const body: Record<string, string> = {};
      if (updateForm.type_of_consult_id) body.type_of_consult_id = updateForm.type_of_consult_id;
      if (updateForm.title_description) body.title_description = updateForm.title_description;
      if (updateForm.venue) body.venue = updateForm.venue;
      if (updateForm.date_of_consult) body.date_of_consult = updateForm.date_of_consult;
      if (updateForm.time_of_consult) body.time_of_consult = updateForm.time_of_consult;
      if (updateForm.date_of_next_follow_up) body.date_of_next_follow_up = updateForm.date_of_next_follow_up;
      if (updateForm.time_of_next_follow_up) body.time_of_next_follow_up = updateForm.time_of_next_follow_up;
      if (updateForm.consultation_objective_id) body.consultation_objective_id = updateForm.consultation_objective_id;
      if (Object.keys(body).length === 0) {
        setIsSavingUpdate(false);
        return;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-session/${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.message || errData?.error || `Save failed (${res.status})`,
        );
      }
      setLastSavedUpdateForm(normalizeUpdateForm(updateForm));
      setIsUpdateCardSaved(true);
      markSaved(1);
      await markSessionCompleted(id, isNewConsultation ? undefined : latestConsultation?.status);
    } catch (e) {
      setUpdateSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSavingUpdate(false);
    }
  };

  // ─── Loading / Error / Empty states ───────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Loading consultation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-900 mb-4">{error}</p>
          <button
            onClick={fetchLatestConsultation}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!latestConsultation && !isNewConsultation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Consultation Records</h3>
          <p className="text-gray-900 mb-6">
            This athlete hasn&apos;t had any consultation sessions yet. Start by creating a new consultation.
          </p>
          <button
            onClick={handleStartNewConsultation}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Start New Consultation
          </button>
        </div>
      </div>
    );
  }

  // Renders all step content cards — all steps stay mounted, inactive ones are hidden.
  // This preserves each card's fetched data and form state when navigating between steps.
  const renderStepContent = (prevSessionId: string | undefined) => (
    <>
      {/* Step 1: Consultation Details */}
      <div className={currentStep === 1 ? "" : "hidden"}>
        <ConsultationDetailsStep
          isNewConsultation={isNewConsultation}
          latestConsultation={latestConsultation}
          consultDetailsTab={consultDetailsTab}
          setConsultDetailsTab={setConsultDetailsTab}
          isEditMode={isEditMode}
          isSavingUpdate={isSavingUpdate}
          updateSaveError={updateSaveError}
          updateForm={updateForm}
          consultTypes={consultTypes}
          consultObjectives={consultObjectives}
          isUpdateCardSaved={isUpdateCardSaved}
          isUpdateFormDirty={isUpdateFormDirty}
          onEditClick={handleEditClick}
          onCancelEdit={handleCancelEdit}
          onClearConsultationDetails={handleClearConsultationDetails}
          onSaveUpdate={handleSaveUpdate}
          onSaveUpdateCard={handleSaveUpdateCard}
          onUpdateFormChange={(patch) => setUpdateForm((form) => ({ ...form, ...patch }))}
        />
      </div>

      {/* Step 2: Anthropometry */}
      <div className={currentStep === 2 ? "" : "hidden"}>
        <Anthropometry
          athleteId={athleteId}
          sessionId={isNewConsultation ? "" : currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
          onAnthroChange={handleAnthroChange}
          prevSessionId={prevSessionId}
          onStepStatusChange={(status) => setStepStatus(2, status)}
        />
      </div>

      {/* Step 3: Medical History */}
      <div className={currentStep === 3 ? "" : "hidden"}>
        <MedicalHistory
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
          prevSessionId={prevSessionId}
          liveWeight={liveAnthro.weight}
          liveTargetWeight={liveAnthro.targetWeight}
          onStepStatusChange={(status) => setStepStatus(3, status)}
        />
      </div>

      {/* Step 4: Training Schedule */}
      <div className={currentStep === 4 ? "" : "hidden"}>
        <TrainingSchedule
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
          prevSessionId={prevSessionId}
          onStepStatusChange={(status) => setStepStatus(4, status)}
        />
      </div>

      {/* Step 5: Meal Logs */}
      <div className={currentStep === 5 ? "" : "hidden"}>
        <MealLogs
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
          prevSessionId={prevSessionId}
          liveWeight={liveAnthro.weight}
          onStepStatusChange={(status) => setStepStatus(5, status)}
        />
      </div>

      {/* Step 6: Nutrition Requirements */}
      <div className={currentStep === 6 ? "" : "hidden"}>
        <NutritionRequirements
          athleteId={athleteId}
          sessionId={isNewConsultation ? "" : currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
          liveWeight={liveAnthro.weight}
          liveHeight={liveAnthro.height}
          liveTargetWeight={liveAnthro.targetWeight}
          prevSessionId={prevSessionId}
          onStepStatusChange={(status) => setStepStatus(6, status)}
        />
      </div>

      {/* Step 7: Nutrition Diagnosis Summary */}
      <div className={currentStep === 7 ? "" : "hidden"}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Nutrition Diagnosis Summary</h2>
            {!isNewConsultation && (
              <div className="flex items-center gap-2">
                {isDiagnosisEditMode ? (
                  <>
                    <button onClick={() => previousConsultRef.current?.clearAll()} className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100">Clear All</button>
                    <button onClick={() => setIsDiagnosisEditMode(false)} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200">Cancel</button>
                    <button onClick={handleSaveDiagnosis} disabled={isSavingDiagnosis} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
                      {isSavingDiagnosis ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsDiagnosisEditMode(true)} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
          {diagnosisSaveError && <p className="text-red-600 text-sm mb-3">{diagnosisSaveError}</p>}
          <PreviousConsultation
            ref={previousConsultRef}
            athleteId={athleteId}
            sessionId={currentSessionId}
            isNewConsultation={isNewConsultation}
            ensureSession={ensureSession}
            embedded={true}
            isEditMode={isDiagnosisEditMode}
            prevSessionId={prevSessionId}
            onStepStatusChange={(status) => setStepStatus(7, status)}
          />
        </div>
      </div>

      {/* Step 8: Actionables */}
      <div className={currentStep === 8 ? "" : "hidden"}>
        <Actionables
          athleteId={athleteId}
          sessionId={isNewConsultation ? "" : currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
          prevSessionId={prevSessionId}
        />
      </div>

      {/* Step 9: Supplement Dispensing */}
      <div className={currentStep === 9 ? "" : "hidden"}>
        {isNewConsultation ? (
          <NewSupplementDispensingForm ensureSession={ensureSession} prevSessionId={prevSessionId} onStepStatusChange={(status) => setStepStatus(9, status)} />
        ) : (
          <SupplementDispensing athleteId={athleteId} sessionId={currentSessionId} prevSessionId={prevSessionId} />
        )}
      </div>
    </>
  );

  const prevSessionId = isNewConsultation ? (latestConsultation?.id ?? undefined) : fetchedPrevSessionId;
  const stepStatuses = Object.fromEntries(
    STEPS.map((step) => {
      const isActive = step.id === currentStep;
      const isDirtyStep =
        (step.id === 1 && updateCardStatus === "dirty") ||
        (step.id === 7 && isDiagnosisEditMode) ||
        childStepStatus[step.id] === "dirty";
      const isSavedStep =
        shouldShowSavedIndicators &&
        (
          (step.id === 1 && updateCardStatus === "saved") ||
          childStepStatus[step.id] === "saved" ||
          stepSaved.has(step.id)
        );
      const status: StepStatus = isActive
        ? isDirtyStep
          ? "dirty"
          : isSavedStep
            ? "saved"
            : "viewing"
        : isSavedStep
          ? "saved"
          : "default";
      return [step.id, status];
    }),
  ) as Record<number, StepStatus>;

  return (
    <>
      <ScheduledSessionSelectorModal
        isOpen={showSessionSelector}
        athleteId={athleteId}
        onSelectSession={handleSelectScheduledSession}
        onStartNew={handleStartNewFromModal}
        onClose={() => setShowSessionSelector(false)}
      />

      <div className="flex flex-col h-full">

        {/* ── Session header strip ─────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
          {isNewConsultation ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              New Consultation
            </span>
          ) : (
            <p className="text-sm font-medium text-gray-700">
              Last Consultation:{" "}
              <span className="text-gray-500">
                {latestConsultation?.date_of_consult
                  ? new Date(latestConsultation.date_of_consult).toLocaleDateString()
                  : "—"}
              </span>
            </p>
          )}
          {isNewConsultation ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelNewConsultation}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg border hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSavingAll}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingAll ? "Saving..." : "Save and Finish Consultation"}
              </button>
            </div>
          ) : !isEditMode ? (
            <button
              onClick={handleStartNewConsultation}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              + Start New Consultation
            </button>
          ) : null}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <ConsultationStepSidebar
            currentStep={currentStep}
            sidebarCollapsed={sidebarCollapsed}
            onStepChange={setCurrentStep}
            onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
            statuses={stepStatuses}
          />

          {/* ── Right Content Area ────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar: step label */}
            <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-3">
              <p className="text-xs text-gray-400 font-medium">Step {currentStep} of {TOTAL_STEPS}</p>
              <h2 className="text-base font-semibold text-gray-900">{STEPS[currentStep - 1].label}</h2>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderStepContent(prevSessionId)}
            </div>

            {/* Bottom navigation */}
            <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                disabled={currentStep === 1}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous step
              </button>

              <span className="text-xs text-gray-400">{currentStep} / {TOTAL_STEPS}</span>

              <button
                onClick={() => setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1))}
                disabled={currentStep === TOTAL_STEPS}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next step
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
