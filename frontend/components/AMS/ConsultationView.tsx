"use client";

import { useState, useEffect } from "react";
import {
  consultationApi,
  ConsultationApiError,
} from "../../utils/consultationApi";
import OpenItems from "./consultation/OpenItems";
import PreviousConsultation from "./consultation/PreviousConsultation";
import Prescription from "./consultation/Prescription";
import TrainingSchedule from "./consultation/TrainingSchedule";
import MealLogs from "./consultation/MealLogs";
import Anthropometry from "./consultation/Anthropometry";
import MedicalHistory from "./consultation/MedicalHistory";
import Adherences from "./consultation/Adherences";
import NewPrescriptionForm from "./consultation/NewPrescriptionForm";

interface LatestConsultation {
  id: string;
  athlete_id: string;
  athlete_name: string;
  date_of_consult: string;
  follow_up_date: string;
  nutritionist_name: string;
  consultation_objective: string;
  consult_type: string;
}

interface ConsultationViewProps {
  athleteId: string;
  athleteName: string;
}

export default function ConsultationView({
  athleteId,
  athleteName,
}: ConsultationViewProps) {
  const [activeSection, setActiveSection] = useState<string>("open-items");
  const [latestConsultation, setLatestConsultation] =
    useState<LatestConsultation | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // New consultation state
  const [isNewConsultation, setIsNewConsultation] = useState(false);
  const [newSessionId, setNewSessionId] = useState<string>("");
  const [newConsultation, setNewConsultation] =
    useState<LatestConsultation | null>(null);

  // Fetch latest consultation data for the athlete
  const fetchLatestConsultation = async () => {
    try {
      setLoading(true);
      setError("");

      const response = (await consultationApi.getLatestConsultation(
        athleteId,
      )) as { data: LatestConsultation };
      const data = response.data as LatestConsultation;
      setLatestConsultation(data);
      setCurrentSessionId(data.id);
    } catch (error) {
      console.error("Error fetching latest consultation:", error);

      if (error instanceof ConsultationApiError && error.status === 404) {
        setLatestConsultation(null);
        setCurrentSessionId("");
      } else {
        setError("Failed to load consultation data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (athleteId) {
      fetchLatestConsultation();
    }
  }, [athleteId]);

  const handleStartNewConsultation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-update`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ athlete_id: athleteId }),
        },
      );
      const data = await response.json();
      if (data?.data?.id) {
        setNewSessionId(data.data.id);
        setNewConsultation(data.data as LatestConsultation);
      }
      setIsNewConsultation(true);
    } catch (err) {
      console.error("Error starting new consultation:", err);
    }
  };

  const handleCancelNewConsultation = () => {
    setIsNewConsultation(false);
    setNewSessionId("");
    setNewConsultation(null);
  };

  const handleSaveAll = () => {
    // Stub: individual cards handle their own saves
    setIsNewConsultation(false);
    setNewSessionId("");
    setNewConsultation(null);
    fetchLatestConsultation();
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
          <div className="text-gray-900 text-4xl mb-4">📋</div>
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

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Consultation Update Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-gray-900">
              {(latestConsultation?.athlete_name || athleteName)}&apos;s Details
            </h1>
            <div className="flex items-center gap-2">
              {isNewConsultation ? (
                <>
                  <button
                    onClick={handleCancelNewConsultation}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAll}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Save All
                  </button>
                </>
              ) : (
                <>
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded border hover:bg-gray-200 flex items-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={handleStartNewConsultation}
                    className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
                  >
                    Start New Consultation
                  </button>
                </>
              )}
            </div>
          </div>

          {(() => {
            const displaySession = isNewConsultation
              ? newConsultation
              : latestConsultation;
            if (!displaySession) return null;
            const dateLabel = isNewConsultation
              ? "Consultation Date"
              : "Last Consult Date";
            return (
              <div>
                <h2 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  Consultation Update:
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
                  <div>
                    <span className="text-gray-900">{dateLabel}:</span>
                    <span className="ml-2 font-medium">
                      {new Date(
                        displaySession.date_of_consult,
                      ).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-900">Follow Up Date:</span>
                    <span className="ml-2 font-medium">
                      {displaySession.follow_up_date
                        ? new Date(
                            displaySession.follow_up_date,
                          ).toLocaleDateString()
                        : "Not set"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-900">Consulted By:</span>
                    <span className="ml-2 font-medium">
                      {displaySession.nutritionist_name || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-900">Consult Type:</span>
                    <span className="ml-2 font-medium">
                      {displaySession.consult_type || "—"}
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-gray-900">Objective:</span>
                    <span className="ml-2 font-medium">
                      {displaySession.consultation_objective ||
                        "No objective specified"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 1. Open Items */}
        <OpenItems
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          newSessionId={newSessionId}
        />

        {/* 2. Previous Consultation */}
        <PreviousConsultation
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          newSessionId={newSessionId}
        />

        {/* 3. Prescription (hidden in new consultation mode) */}
        {!isNewConsultation && (
          <Prescription athleteId={athleteId} sessionId={currentSessionId} />
        )}

        {/* 4. Training Schedule */}
        <TrainingSchedule
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          newSessionId={newSessionId}
        />

        {/* 5. Meal Logs */}
        <MealLogs
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          newSessionId={newSessionId}
        />

        {/* 6. Anthropometry */}
        <Anthropometry
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          newSessionId={newSessionId}
        />

        {/* 7. Adherences */}
        <Adherences
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          newSessionId={newSessionId}
        />

        {/* 9. Medical History */}
        <MedicalHistory
          athleteId={athleteId}
          sessionId={currentSessionId}
          isNewConsultation={isNewConsultation}
          newSessionId={newSessionId}
        />

        {/* 10. New Prescription Form (only when starting a new consultation) */}
        {isNewConsultation && <NewPrescriptionForm sessionId={newSessionId} />}
      </div>
    </div>
  );
}
