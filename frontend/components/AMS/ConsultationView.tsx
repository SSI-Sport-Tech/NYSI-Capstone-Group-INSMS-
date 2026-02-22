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
import Assessment from "./consultation/Assessment";

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

interface ConsultationSection {
  id: string;
  title: string;
  icon: string;
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

  // Fetch latest consultation data for the athlete
  const fetchLatestConsultation = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await consultationApi.getLatestConsultation(athleteId) as { data: LatestConsultation };
      const data = response.data as LatestConsultation;
      setLatestConsultation(data);
      setCurrentSessionId(data.id);
    } catch (error) {
      console.error("Error fetching latest consultation:", error);

      if (error instanceof ConsultationApiError && error.status === 404) {
        // No consultation sessions found for this athlete
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

  const consultationSections: ConsultationSection[] = [
    { id: "open-items", title: "Open Items", icon: "📋" },
    { id: "previous-consultation", title: "Previous Consultation", icon: "🔄" },
    { id: "prescription", title: "Prescription", icon: "💊" },
    { id: "training-schedule", title: "Training Schedule", icon: "🏃" },
    { id: "meal-logs", title: "Meal Logs", icon: "🍽️" },
    { id: "anthropometry", title: "Anthropometry", icon: "📏" },
    { id: "medical-history", title: "Medical History", icon: "🏥" },
    { id: "adherences", title: "Adherences", icon: "✅" },
    { id: "assessment", title: "Assessment", icon: "📊" },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading consultation data...</p>
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
          <p className="text-gray-600 mb-4">{error}</p>
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

  // Handle case where no consultation exists
  if (!latestConsultation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Consultation Records
          </h3>
          <p className="text-gray-600 mb-6">
            This athlete hasn't had any consultation sessions yet. Start by
            creating a new consultation.
          </p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Start New Consultation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Side Navigator */}
      {/* <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Consultation Sections
        </h3>
        <nav className="space-y-2">
          {consultationSections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                activeSection === section.id
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-lg">{section.icon}</span>
              <span className="font-medium">{section.title}</span>
            </button>
          ))}
        </nav>
      </div> */}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Consultation Update Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-gray-900">
              {latestConsultation.athlete_name}'s Details
            </h1>
            <div className="flex items-center gap-2">
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
              <button className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700">
                Start New Consultation
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
              Consultation Update:
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Last Consult Date:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {new Date(
                    latestConsultation.date_of_consult,
                  ).toLocaleDateString()}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Follow Up Date:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {latestConsultation.follow_up_date
                    ? new Date(
                        latestConsultation.follow_up_date,
                      ).toLocaleDateString()
                    : "Not set"}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Consulted By:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {latestConsultation.nutritionist_name}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Consult Type:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {latestConsultation.consult_type}
                </span>
              </div>

              <div className="md:col-span-2">
                <span className="text-gray-600">Objective:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {latestConsultation.consultation_objective ||
                    "No objective specified"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <OpenItems athleteId={athleteId} sessionId={currentSessionId} />
        <PreviousConsultation
          athleteId={athleteId}
          sessionId={currentSessionId}
        />
        <Prescription athleteId={athleteId} sessionId={currentSessionId} />
        <TrainingSchedule athleteId={athleteId} sessionId={currentSessionId} />
        <MealLogs athleteId={athleteId} sessionId={currentSessionId} />
        <Anthropometry athleteId={athleteId} sessionId={currentSessionId} />
        <MedicalHistory athleteId={athleteId} sessionId={currentSessionId} />
        <Adherences athleteId={athleteId} sessionId={currentSessionId} />
        <Assessment athleteId={athleteId} sessionId={currentSessionId} />
      </div>
    </div>
  );
}
