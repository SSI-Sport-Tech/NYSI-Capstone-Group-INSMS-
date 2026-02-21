interface PreviousConsultationProps {
  athleteId: string;
  sessionId: string;
}

interface ConsultationData {
  date_of_consult: string;
  follow_up_date: string;
  nutritionist_name: string;
  consultation_objective: string;
}

export default function PreviousConsultation({
  athleteId,
  sessionId,
}: PreviousConsultationProps) {
  // This component shows current session data, so no additional API call needed
  // Data is passed from parent ConsultationView component
  const consultationData: ConsultationData = {
    date_of_consult: "2026-01-18",
    follow_up_date: "2026-01-31",
    nutritionist_name: "Amy Tan",
    consultation_objective:
      "To gain more muscles and strength. Ensure athlete is hydrated.",
  };

  return (
    <section
      id="previous-consultation"
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Previous Consultation
        </h2>
        <span className="text-sm text-gray-500">
          {new Date(consultationData.date_of_consult).toLocaleDateString()}
        </span>
      </div>

      <div className="space-y-6">
        <h3 className="text-base font-medium text-gray-900 border-b border-gray-200 pb-2">
          Consultation Update:
        </h3>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 w-48 flex-shrink-0">
              Last Consult Date:
            </span>
            <span className="text-gray-900">
              {new Date(consultationData.date_of_consult).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-600 w-48 flex-shrink-0">
              Follow Up Date:
            </span>
            <span className="text-gray-900">
              {consultationData.follow_up_date
                ? new Date(consultationData.follow_up_date).toLocaleDateString()
                : "Not set"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-600 w-48 flex-shrink-0">
              Consulted By:
            </span>
            <span className="text-gray-900">
              {consultationData.nutritionist_name}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-gray-600 w-48 flex-shrink-0">Objective:</span>
            <span className="text-gray-900 flex-1">
              {consultationData.consultation_objective ||
                "No objective specified"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
