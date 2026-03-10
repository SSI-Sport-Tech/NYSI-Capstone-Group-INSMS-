"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import {
  consultationApi,
  consultationLookupApi,
  ConsultationApiError,
} from "../../utils/consultationApi";
import OpenItems from "./consultation/OpenItems";
import PreviousConsultation, { type PreviousConsultationHandle } from "./consultation/PreviousConsultation";
import Prescription from "./consultation/Prescription";
import TrainingSchedule from "./consultation/TrainingSchedule";
import MealLogs from "./consultation/MealLogs";
import Anthropometry from "./consultation/Anthropometry";
import MedicalHistory from "./consultation/MedicalHistory";
import Adherences from "./consultation/Adherences";
import NewPrescriptionForm from "./consultation/NewPrescriptionForm";
import ScheduledSessionSelectorModal, {
  type ScheduledSession,
} from "./consultation/ScheduledSessionSelectorModal";

interface LatestConsultation {
  id: string;
  athlete_id: string;
  athlete_name_abbr: string;
  date_of_consult: string;
  date_of_next_follow_up: string;
  time_of_next_follow_up: string;
  nutritionist_name: string;
  consultation_objective: string;
  type_of_consult: string;
  type_of_consult_id: string;
  venue: string;
  time_of_consult: string;
  title_description: string;
  is_scheduled_booking?: boolean;
}

interface ConsultationViewProps {
  athleteId: string;
  athleteName: string;
    /** When provided (e.g. navigating from dashboard), load this session instead of the latest. */
  initialSessionId?: string;
}

interface ConsultType {
  id: string;
  type_of_consult: string;
}

const EMPTY_UPDATE_FORM = {
  type_of_consult_id: "",
  title_description: "",
  venue: "",
  date_of_consult: "",
  time_of_consult: "",
  date_of_next_follow_up: "",
  time_of_next_follow_up: "",
  consultation_objective: "",
};
type UpdateForm = typeof EMPTY_UPDATE_FORM;

export default function ConsultationView({
  athleteId,
  athleteName,
  initialSessionId,
}: ConsultationViewProps) {
  const [activeSection, setActiveSection] = useState<string>("open-items");
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

  // Collapse state
  const [detailsCollapsed, setDetailsCollapsed] = useState(true);
  const [diagnosisCollapsed, setDiagnosisCollapsed] = useState(true);

  // Edit mode state — Card 1 (Consultation Details)
  const [isEditMode, setIsEditMode] = useState(false);
  const [consultTypes, setConsultTypes] = useState<ConsultType[]>([]);
  const [updateForm, setUpdateForm] = useState<UpdateForm>(EMPTY_UPDATE_FORM);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [updateSaveError, setUpdateSaveError] = useState("");

  // Edit mode state — Card 2 (Main Nutrition Diagnosis)
  const [isDiagnosisEditMode, setIsDiagnosisEditMode] = useState(false);
  const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);
  const [diagnosisSaveError, setDiagnosisSaveError] = useState("");
  const updateFormRef = useRef<UpdateForm>(EMPTY_UPDATE_FORM);
  const ensureSessionForUpdateRef = useRef<() => Promise<string>>(async () => "");
  const previousConsultRef = useRef<PreviousConsultationHandle>(null);

  // Session selector modal (shown when current session has is_scheduled_booking = true
  // and nutritionist clicks "Start New Consultation")
  const [showSessionSelector, setShowSessionSelector] = useState(false);

  // Creates the consultation session on first card save (lazy).
  // Concurrent callers all wait for the same in-flight promise.
  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (sessionCreationRef.current) return sessionCreationRef.current;

    sessionCreationRef.current = (async () => {
      try {
        const token = localStorage.getItem("token");

        // Fetch a default consult type (required by DB — NOT NULL)
        const typesResponse = await consultationLookupApi.getConsultationTypes();
        const defaultTypeId = typesResponse.data?.[0]?.id as string | undefined;
        if (!defaultTypeId) throw new Error("No active consult types found");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-update`,
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

  // Keep ensureSessionForUpdateRef in sync
  useEffect(() => {
    ensureSessionForUpdateRef.current = ensureSession;
  }, [ensureSession]);

  // Keep updateFormRef in sync
  useEffect(() => {
    updateFormRef.current = updateForm;
  }, [updateForm]);

  // Fetch consult types when edit mode or new consultation is active
  useEffect(() => {
    if (!isEditMode && !isNewConsultation) return;
    consultationLookupApi
      .getConsultationTypes()
      .then((res) => setConsultTypes(res.data ?? []))
      .catch(() => {});
  }, [isEditMode, isNewConsultation]);

  // Fetch a specific session by ID (used when navigating from the dashboard)
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
    } catch {
      // Fall back to latest if the specific session cannot be found
      await fetchLatestConsultation();
    } finally {
      setLoading(false);
    }
  };

  // Fetch latest consultation data for the athlete
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
        return;
      }
      const data = response.data as LatestConsultation;
      setLatestConsultation(data);
      setCurrentSessionId(data.id);
    } catch (error) {
      if (error instanceof ConsultationApiError && error.status === 404) {
        setLatestConsultation(null);
        setCurrentSessionId("");
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
    // If the current session was booked from the dashboard, show the session
    // selector so the nutritionist picks which session to conduct.
    if (latestConsultation?.is_scheduled_booking) {
      setShowSessionSelector(true);
      return;
    }
    setIsNewConsultation(true);
  };

  // Nutritionist picked a scheduled session from the modal.
  // Pre-seed sessionIdRef so ensureSession() returns it without creating a new one.
  // Populate the update form with whatever was filled in when the booking was created.
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
      consultation_objective: session.consultation_objective ?? "",
    });
    setShowSessionSelector(false);
    setIsNewConsultation(true);
  };

  // Nutritionist wants a brand-new session despite scheduled ones existing.
  const handleStartNewFromModal = () => {
    sessionIdRef.current = "";
    sessionCreationRef.current = null;
    setNewSessionId("");
    setNewConsultation(null);
    setShowSessionSelector(false);
    setIsNewConsultation(true);
  };

  const handleCancelNewConsultation = () => {
    setIsNewConsultation(false);
    setNewSessionId("");
    setNewConsultation(null);
    setUpdateForm(EMPTY_UPDATE_FORM);
    setUpdateSaveError("");
    sessionIdRef.current = "";
    sessionCreationRef.current = null;
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    try {
      // Explicitly save A fields BEFORE transitioning state, to avoid a race condition
      // where fetchLatestConsultation resolves before the auto-save effects complete.
      await handleSaveUpdateCard();
      // Explicitly save B fields before isNewConsultation transitions (uses handleSave() since isNewConsultation=true)
      await previousConsultRef.current?.save();
      setIsNewConsultation(false);
      setNewSessionId("");
      setNewConsultation(null);
      await fetchLatestConsultation();
    } finally {
      setIsSavingAll(false);
    }
  };

  // Auto-save update form fields when "Save and Finish" is clicked
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
        if (form.consultation_objective) body.consultation_objective = form.consultation_objective;
        if (Object.keys(body).length === 0) return;
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-update/${id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        );
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
      consultation_objective: d.consultation_objective || "",
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setUpdateSaveError("");
  };

  const handleClearConsultationDetails = () => {
    setUpdateForm(EMPTY_UPDATE_FORM);
    setUpdateSaveError("");
  };

  const handleSaveDiagnosis = async () => {
    setIsSavingDiagnosis(true);
    setDiagnosisSaveError("");
    try {
      await previousConsultRef.current?.save();
      setIsDiagnosisEditMode(false);
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
      if (updateForm.consultation_objective) body.consultation_objective = updateForm.consultation_objective;
      if (Object.keys(body).length === 0) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-update/${currentSessionId}`,
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
      if (updateForm.consultation_objective) body.consultation_objective = updateForm.consultation_objective;
      if (Object.keys(body).length === 0) {
        setIsSavingUpdate(false);
        return;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-update/${id}`,
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
    } catch (e) {
      setUpdateSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSavingUpdate(false);
    }
  };

  // Used to suppress TS unused variable warning
  void activeSection;
  void setActiveSection;

  // Handle loading state
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

  // Handle error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error Loading Data
          </h3>
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

  // Handle case where no consultation exists and not in new consultation mode
  if (!latestConsultation && !isNewConsultation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Consultation Records
          </h3>
          <p className="text-gray-900 mb-6">
            This athlete hasn&apos;t had any consultation sessions yet. Start by
            creating a new consultation.
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

  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const MINUTE_OPTIONS = ["00","05","10","15","20","25","30","35","40","45","50","55"];

  const renderTimePicker = (
    value: string,
    onChange: (val: string) => void,
  ) => {
    const [curH = "", curM = ""] = value ? value.split(":") : [];
    const setH = (h: string) => {
      if (!h) { onChange(""); return; }
      onChange(`${h}:${curM || "00"}`);
    };
    const setM = (m: string) => {
      if (!m) { onChange(""); return; }
      onChange(`${curH || "00"}:${m}`);
    };
    return (
      <div className="flex items-center gap-1">
        <select
          value={curH}
          onChange={(e) => setH(e.target.value)}
          className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm text-gray-900"
        >
          <option value="">HH</option>
          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-gray-500 font-medium">:</span>
        <select
          value={curM}
          onChange={(e) => setM(e.target.value)}
          className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm text-gray-900"
        >
          <option value="">MM</option>
          {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    );
  };

  const renderUpdateForm = () => (
    <div>
      {updateSaveError && (
        <p className="text-red-600 text-sm mb-3">{updateSaveError}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Type of Consultation
          </label>
          <select
            value={updateForm.type_of_consult_id}
            onChange={(e) =>
              setUpdateForm((f) => ({ ...f, type_of_consult_id: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
          >
            <option value="">Select type...</option>
            {consultTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.type_of_consult}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Title / Description
          </label>
          <input
            type="text"
            value={updateForm.title_description}
            onChange={(e) =>
              setUpdateForm((f) => ({ ...f, title_description: e.target.value }))
            }
            placeholder="Session title..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Venue
          </label>
          <input
            type="text"
            value={updateForm.venue}
            onChange={(e) =>
              setUpdateForm((f) => ({ ...f, venue: e.target.value }))
            }
            placeholder="Venue..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Date of Consultation
          </label>
          <input
            type="date"
            value={updateForm.date_of_consult}
            onChange={(e) =>
              setUpdateForm((f) => ({ ...f, date_of_consult: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Time of Consultation
          </label>
          {renderTimePicker(
            updateForm.time_of_consult,
            (val) => setUpdateForm((f) => ({ ...f, time_of_consult: val })),
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Date of Next Follow-Up
          </label>
          <input
            type="date"
            value={updateForm.date_of_next_follow_up}
            onChange={(e) =>
              setUpdateForm((f) => ({
                ...f,
                date_of_next_follow_up: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Time of Next Follow-Up
          </label>
          {renderTimePicker(
            updateForm.time_of_next_follow_up,
            (val) => setUpdateForm((f) => ({ ...f, time_of_next_follow_up: val })),
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Consultation Objective
          </label>
          <textarea
            value={updateForm.consultation_objective}
            onChange={(e) =>
              setUpdateForm((f) => ({
                ...f,
                consultation_objective: e.target.value,
              }))
            }
            placeholder="Describe consultation objective..."
            className="w-full h-20 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
          />
        </div>
      </div>
      {isNewConsultation && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveUpdateCard}
            disabled={isSavingUpdate}
            className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {isSavingUpdate ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );

  const renderReadOnly = () => {
    const d = latestConsultation;
    if (!d) return null;
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
          <div>
            <span className="text-gray-900">Last Consult Date:</span>
            <span className="ml-2 font-medium">
              {(d.date_of_consult
                ? new Date(d.date_of_consult)
                : new Date()
              ).toLocaleDateString()}
              {d.time_of_consult && (
                <span className="ml-1 text-gray-600">
                  {d.time_of_consult.substring(0, 5)}
                </span>
              )}
            </span>
          </div>
          <div>
            <span className="text-gray-900">Follow Up Date:</span>
            <span className="ml-2 font-medium">
              {d.date_of_next_follow_up
                ? new Date(d.date_of_next_follow_up).toLocaleDateString()
                : "Not set"}
              {d.date_of_next_follow_up && d.time_of_next_follow_up && (
                <span className="ml-1 text-gray-600">
                  {d.time_of_next_follow_up.substring(0, 5)}
                </span>
              )}
            </span>
          </div>
          <div>
            <span className="text-gray-900">Consulted By:</span>
            <span className="ml-2 font-medium">
              {d.nutritionist_name || "—"}
            </span>
          </div>
          <div>
            <span className="text-gray-900">Consult Type:</span>
            <span className="ml-2 font-medium">
              {d.type_of_consult || "—"}
            </span>
          </div>
          {d.venue && (
            <div>
              <span className="text-gray-900">Venue:</span>
              <span className="ml-2 font-medium">{d.venue}</span>
            </div>
          )}
          {d.title_description && (
            <div>
              <span className="text-gray-900">Title:</span>
              <span className="ml-2 font-medium">{d.title_description}</span>
            </div>
          )}
          <div className="md:col-span-2">
            <span className="text-gray-900">Objective:</span>
            <span className="ml-2 font-medium">
              {d.consultation_objective || "No objective specified"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Scheduled session selector modal */}
      <ScheduledSessionSelectorModal
        isOpen={showSessionSelector}
        athleteId={athleteId}
        onSelectSession={handleSelectScheduledSession}
        onStartNew={handleStartNewFromModal}
        onClose={() => setShowSessionSelector(false)}
      />

    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Start New Consultation button — top of content area */}
        {!isNewConsultation && !isEditMode && (
          <div className="flex justify-end">
            <button
              onClick={handleStartNewConsultation}
              className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
            >
              Start New Consultation
            </button>
          </div>
        )}

        {/* Card 1 — Consultation Details */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setDetailsCollapsed(!detailsCollapsed)}
              className="flex items-center gap-2 text-left"
            >
              <h1 className="text-xl font-semibold text-gray-900">Consultation Details</h1>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${detailsCollapsed ? "-rotate-90" : ""}`} />
            </button>
            {!detailsCollapsed && !isEditMode && !isNewConsultation && (
              <button
                onClick={handleEditClick}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
            )}
          </div>
          {!detailsCollapsed && (
            <>
              {isNewConsultation || isEditMode ? renderUpdateForm() : renderReadOnly()}
              {isNewConsultation && (
                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleCancelNewConsultation}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={isSavingAll}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSavingAll ? "Saving..." : "Save and Finish Consultation"}
                  </button>
                </div>
              )}
              {isEditMode && (
                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearConsultationDetails}
                    className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleSaveUpdate}
                    disabled={isSavingUpdate}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSavingUpdate ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Card 2 — Main Nutrition Diagnosis */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setDiagnosisCollapsed(!diagnosisCollapsed)}
              className="flex items-center gap-2 text-left"
            >
              <h2 className="text-xl font-semibold text-gray-900">Main Nutrition Diagnosis</h2>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${diagnosisCollapsed ? "-rotate-90" : ""}`} />
            </button>
            {!isNewConsultation && !diagnosisCollapsed && !isDiagnosisEditMode && (
              <button
                onClick={() => setIsDiagnosisEditMode(true)}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
            )}
          </div>
          {diagnosisSaveError && (
            <p className="text-red-600 text-sm mb-3">{diagnosisSaveError}</p>
          )}
          {!diagnosisCollapsed && (
            <>
              <PreviousConsultation
                ref={previousConsultRef}
                athleteId={athleteId}
                sessionId={currentSessionId}
                isNewConsultation={isNewConsultation}
                ensureSession={ensureSession}
                embedded={true}
                isEditMode={isDiagnosisEditMode}
              />
              {isDiagnosisEditMode && (
                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => { previousConsultRef.current?.clearAll(); }}
                    className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setIsDiagnosisEditMode(false)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDiagnosis}
                    disabled={isSavingDiagnosis}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSavingDiagnosis ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Open Items — clears on new consultation */}
        <OpenItems
          athleteId={athleteId}
          sessionId={isNewConsultation ? "" : currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
        />

        {/* Prescription */}
        {!isNewConsultation && (
          <Prescription athleteId={athleteId} sessionId={currentSessionId} />
        )}

        {/* 4. Training Schedule */}
        <TrainingSchedule
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
        />

        {/* 5. Meal Logs */}
        <MealLogs
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
        />

        {/* 6. Anthropometry — clears on new consultation */}
        <Anthropometry
          athleteId={athleteId}
          sessionId={isNewConsultation ? "" : currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
          onAnthroChange={handleAnthroChange}
        />

        {/* 7. Adherences — clears on new consultation */}
        <Adherences
          athleteId={athleteId}
          sessionId={isNewConsultation ? "" : currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
          liveWeight={liveAnthro.weight}
          liveHeight={liveAnthro.height}
          liveTargetWeight={liveAnthro.targetWeight}
        />

        {/* 9. Medical History */}
        <MedicalHistory
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          ensureSession={ensureSession}
        />

        {/* 10. New Prescription Form (only when starting a new consultation) */}
        {isNewConsultation && <NewPrescriptionForm ensureSession={ensureSession} />}
      </div>
    </div>
    </>
  );
}
