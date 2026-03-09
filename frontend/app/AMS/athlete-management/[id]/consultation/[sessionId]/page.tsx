"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import OpenItems from "@/components/AMS/consultation/OpenItems";
import PreviousConsultation from "@/components/AMS/consultation/PreviousConsultation";
import Prescription from "@/components/AMS/consultation/Prescription";
import TrainingSchedule from "@/components/AMS/consultation/TrainingSchedule";
import MealLogs from "@/components/AMS/consultation/MealLogs";
import Anthropometry from "@/components/AMS/consultation/Anthropometry";
import Adherences from "@/components/AMS/consultation/Adherences";
import MedicalHistory from "@/components/AMS/consultation/MedicalHistory";

interface SessionData {
  id: string;
  date_of_consult: string;
  date_of_next_follow_up: string;
  time_of_next_follow_up: string;
  nutritionist_name: string;
  consultation_objective: string;
  type_of_consult: string;
  venue: string;
  time_of_consult: string;
  title_description: string;
}

export default function ConsultationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.id as string;
  const sessionId = params.sessionId as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [diagnosisCollapsed, setDiagnosisCollapsed] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/consultation-update/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        setSessionData(data.data);
      } catch {
        // non-critical — other cards still load independently
      }
    };
    fetchSession();
  }, [sessionId]);

  const handleBack = () => {
    router.push(`/AMS/athlete-management/${athleteId}?tab=history`);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Back header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to History
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-base font-medium text-gray-900">Consultation Details</h1>
        </div>

        {/* Card content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Card 1 — Consultation Details (session info) */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setDetailsCollapsed(!detailsCollapsed)}
                className="flex items-center gap-2 text-left"
              >
                <h2 className="text-xl font-semibold text-gray-900">Consultation Details</h2>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${detailsCollapsed ? "-rotate-90" : ""}`} />
              </button>
            </div>

            {!detailsCollapsed && (
              <>
                {sessionData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
                    <div>
                      <span className="text-gray-900">Last Consult Date:</span>
                      <span className="ml-2 font-medium">
                        {(sessionData.date_of_consult
                          ? new Date(sessionData.date_of_consult)
                          : new Date()
                        ).toLocaleDateString()}
                        {sessionData.time_of_consult && (
                          <span className="ml-1 text-gray-600">
                            {sessionData.time_of_consult.substring(0, 5)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-900">Follow Up Date:</span>
                      <span className="ml-2 font-medium">
                        {sessionData.date_of_next_follow_up
                          ? new Date(sessionData.date_of_next_follow_up).toLocaleDateString()
                          : "Not set"}
                        {sessionData.date_of_next_follow_up && sessionData.time_of_next_follow_up && (
                          <span className="ml-1 text-gray-600">
                            {sessionData.time_of_next_follow_up.substring(0, 5)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-900">Consulted By:</span>
                      <span className="ml-2 font-medium">{sessionData.nutritionist_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-900">Consult Type:</span>
                      <span className="ml-2 font-medium">{sessionData.type_of_consult || "—"}</span>
                    </div>
                    {sessionData.venue && (
                      <div>
                        <span className="text-gray-900">Venue:</span>
                        <span className="ml-2 font-medium">{sessionData.venue}</span>
                      </div>
                    )}
                    {sessionData.title_description && (
                      <div>
                        <span className="text-gray-900">Title:</span>
                        <span className="ml-2 font-medium">{sessionData.title_description}</span>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <span className="text-gray-900">Objective:</span>
                      <span className="ml-2 font-medium">
                        {sessionData.consultation_objective || "No objective specified"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Card 2 — Main Nutrition Diagnosis (intervention status + diagnosis + review + notes) */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setDiagnosisCollapsed(!diagnosisCollapsed)}
                className="flex items-center gap-2 text-left"
              >
                <h2 className="text-xl font-semibold text-gray-900">Main Nutrition Diagnosis</h2>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${diagnosisCollapsed ? "-rotate-90" : ""}`} />
              </button>
            </div>

            {!diagnosisCollapsed && (
              <PreviousConsultation
                athleteId={athleteId}
                sessionId={sessionId}
                readOnly
                embedded
              />
            )}
          </div>

          <OpenItems
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />

          <Prescription
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />

          <TrainingSchedule
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />

          <MealLogs
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />

          <Anthropometry
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />

          <Adherences
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />

          <MedicalHistory
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
