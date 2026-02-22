import { useState, useEffect } from "react";
import { consultationApi, apiCall } from "@/utils/consultationApi";

interface PreviousConsultationProps {
  athleteId: string;
  sessionId: string;
}

interface ConsultationData {
  id: string;
  athlete_id: string;
  date_of_consult: string;
  nutritionist_name: string;
  intervention_status?: string;
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

export default function PreviousConsultation({
  athleteId,
  sessionId,
}: PreviousConsultationProps) {
  const [consultationData, setConsultationData] =
    useState<ConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreviousConsultation = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the latest consultation session for the athlete
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

        console.log("Latest session response:", latestSession);

        if (latestSession?.data) {
          const sessionData = latestSession.data as {
            id: string;
            athlete_id: string;
            date_of_consult: string;
            nutritionist_name: string;
          };

          // Fetch detailed consultation data and prescriptions in parallel
          const [detailsResponse, prescriptionsResponse] =
            await Promise.allSettled([
              apiCall(
                `/api/Consultation/consultation-details/${sessionData.id}`,
              ),
              consultationApi.getPrescriptions(sessionData.id),
            ]);

          console.log("Details response:", detailsResponse);
          console.log("Prescriptions response:", prescriptionsResponse);

          // Debug: Log the actual data structure
          if (detailsResponse.status === "fulfilled") {
            console.log("Details response value:", detailsResponse.value);
            console.log(
              "Details response data:",
              (detailsResponse.value as any)?.data,
            );
          } else {
            console.log("Details response rejected:", detailsResponse.reason);
          }

          if (prescriptionsResponse.status === "fulfilled") {
            console.log(
              "Prescriptions response value:",
              prescriptionsResponse.value,
            );
            console.log(
              "Prescriptions response data:",
              (prescriptionsResponse.value as any)?.data,
            );
          } else {
            console.log(
              "Prescriptions response rejected:",
              prescriptionsResponse.reason,
            );
          }

          const consultationData: ConsultationData = {
            id: sessionData.id,
            athlete_id: sessionData.athlete_id,
            date_of_consult: sessionData.date_of_consult,
            nutritionist_name: sessionData.nutritionist_name,
            intervention_status: "Supplement Intake", // Default or from session data
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

          console.log("Final consultation data:", consultationData);

          setConsultationData(consultationData);
        }
      } catch (err) {
        console.error("Error fetching previous consultation:", err);
        setError("Failed to load previous consultation data");
      } finally {
        setLoading(false);
      }
    };

    if (athleteId) {
      fetchPreviousConsultation();
    }
  }, [athleteId]);

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
          Previous Consultation
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
