"use client";

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

export default function ConsultationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.id as string;
  const sessionId = params.sessionId as string;

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
          <OpenItems
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />

          <PreviousConsultation
            athleteId={athleteId}
            sessionId={sessionId}
            readOnly
          />

          <Prescription
            athleteId={athleteId}
            sessionId={sessionId}
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
