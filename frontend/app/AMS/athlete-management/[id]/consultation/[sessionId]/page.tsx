"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Actionables from "@/components/AMS/consultation/Actionables";
import PreviousConsultation from "@/components/AMS/consultation/PreviousConsultation";
import SupplementDispensing from "@/components/AMS/consultation/SupplementDispensing";
import TrainingSchedule from "@/components/AMS/consultation/TrainingSchedule";
import MealLogs from "@/components/AMS/consultation/MealLogs";
import Anthropometry from "@/components/AMS/consultation/Anthropometry";
import NutritionRequirements from "@/components/AMS/consultation/NutritionRequirements";
import MedicalHistory from "@/components/AMS/consultation/MedicalHistory";
import { getBackendUrl } from "@/utils/backendUrl";

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

const STEPS = [
  { id: 1, label: "Consultation Details" },
  { id: 2, label: "Anthropometry" },
  { id: 3, label: "Medical History" },
  { id: 4, label: "Training Schedule" },
  { id: 5, label: "Meal Logs" },
  { id: 6, label: "Nutrition Requirements" },
  { id: 7, label: "Nutrition Diagnosis Summary" },
  { id: 8, label: "Actionables" },
  { id: 9, label: "Supplement Dispensing" },
];

const BACKEND_URL = getBackendUrl();

export default function ConsultationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.id as string;
  const sessionId = params.sessionId as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const base = `${BACKEND_URL}/api/Consultation/consultation-session`;
        const res = await fetch(`${base}/${sessionId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSessionData(data.data);
        }
      } catch {
        // non-critical — other cards still load independently
      }
    };
    fetchSession();
  }, [sessionId]);

  const handleBack = () => {
    router.push(`/AMS/athlete-management/${athleteId}?tab=history`);
  };

  const renderCard = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Consultation Details
            </h2>
            {sessionData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900">
                <div>
                  <span className="text-gray-500">Date of Consult:</span>
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
                  <span className="text-gray-500">Follow Up Date:</span>
                  <span className="ml-2 font-medium">
                    {sessionData.date_of_next_follow_up
                      ? new Date(
                          sessionData.date_of_next_follow_up,
                        ).toLocaleDateString()
                      : "Not set"}
                    {sessionData.date_of_next_follow_up &&
                      sessionData.time_of_next_follow_up && (
                        <span className="ml-1 text-gray-600">
                          {sessionData.time_of_next_follow_up.substring(0, 5)}
                        </span>
                      )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Consulted By:</span>
                  <span className="ml-2 font-medium">
                    {sessionData.nutritionist_name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Consult Type:</span>
                  <span className="ml-2 font-medium">
                    {sessionData.type_of_consult || "—"}
                  </span>
                </div>
                {sessionData.venue && (
                  <div>
                    <span className="text-gray-500">Venue:</span>
                    <span className="ml-2 font-medium">
                      {sessionData.venue}
                    </span>
                  </div>
                )}
                {sessionData.title_description && (
                  <div>
                    <span className="text-gray-500">Title:</span>
                    <span className="ml-2 font-medium">
                      {sessionData.title_description}
                    </span>
                  </div>
                )}
                <div className="md:col-span-2">
                  <span className="text-gray-500">Objective:</span>
                  <span className="ml-2 font-medium">
                    {sessionData.consultation_objective ||
                      "No objective specified"}
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
          </div>
        );
      case 2:
        return (
          <Anthropometry athleteId={athleteId} sessionId={sessionId} readOnly />
        );
      case 3:
        return (
          <MedicalHistory
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />
        );
      case 4:
        return (
          <TrainingSchedule
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />
        );
      case 5:
        return (
          <MealLogs athleteId={athleteId} sessionId={sessionId} readOnly />
        );
      case 6:
        return (
          <NutritionRequirements
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />
        );
      case 7:
        return (
          <PreviousConsultation
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
            embedded
          />
        );
      case 8:
        return (
          <Actionables athleteId={athleteId} sessionId={sessionId} readOnly />
        );
      case 9:
        return (
          <SupplementDispensing
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shrink-0">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to History
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-base font-medium text-gray-900">
            Consultation Details
          </h1>
          {sessionData && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">
                {new Date(sessionData.date_of_consult).toLocaleDateString()}
              </span>
              {sessionData.nutritionist_name && (
                <span className="text-sm text-gray-500">
                  · {sessionData.nutritionist_name}
                </span>
              )}
              {sessionData.type_of_consult && (
                <span className="text-sm text-gray-500">
                  · {sessionData.type_of_consult}
                </span>
              )}
            </>
          )}
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
            <nav className="py-2">
              {STEPS.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${
                    currentStep === step.id
                      ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      currentStep === step.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step.id}
                  </span>
                  {step.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right content area */}
          <div className="flex-1 overflow-y-auto p-6">{renderCard()}</div>
        </div>
      </div>
    </DashboardLayout>
  );
}
