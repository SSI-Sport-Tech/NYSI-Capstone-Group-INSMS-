import { useState, useEffect } from "react";
import {
  consultationApi,
  ConsultationApiError,
} from "../../../utils/consultationApi";

interface AnthropometryProps {
  athleteId: string;
  sessionId: string;
}

interface AnthropometryData {
  height: number | null;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  bone_density: number | null;
  water_percentage: number | null;
  basal_metabolic_rate: number | null;
  visceral_fat: number | null;
  bmi: number | null;
  bmi_category: string | null;
  fat_mass: number | null;
  fat_mass_percentage: number | null;
  skeletal_muscle_mass: number | null;
  skeletal_muscle_mass_percentage: number | null;
  sum_of_skinfold: number | null;
  target_weight: number | null;
  target_bmi: number | null;
  mothers_height: number | null;
  fathers_height: number | null;
  athlete_potential_adult_height: number | null;
  measured_by: string | null;
  measurement_notes: string | null;
  date_recorded: string | null;
}

export default function Anthropometry({
  athleteId,
  sessionId,
}: AnthropometryProps) {
  const [anthropometryData, setAnthropometryData] =
    useState<AnthropometryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchAnthropometry = async () => {
    if (!sessionId) {
      setAnthropometryData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await consultationApi.getAnthropometry(sessionId);
      setAnthropometryData((response as any).data);
    } catch (error) {
      console.error("Error fetching anthropometry:", error);
      if (error instanceof ConsultationApiError && error.status === 404) {
        setAnthropometryData(null);
      } else {
        setError("Failed to load anthropometry data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnthropometry();
  }, [sessionId]);

  if (loading) {
    return (
      <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchAnthropometry}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="anthropometry" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Anthropometry</h2>
        <button className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700">
          Edit
        </button>
      </div>

      <div className="space-y-6">
        {!anthropometryData ? (
          <div className="text-center py-8">
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No anthropometry data
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No measurements have been recorded for this consultation session.
            </p>
          </div>
        ) : (
          <>
            {/* Basic Measurements */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Height:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {anthropometryData.height || "N/A"}
                  </span>
                  {anthropometryData.height && (
                    <span className="text-gray-500">cm</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Weight:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {anthropometryData.weight || "N/A"}
                  </span>
                  {anthropometryData.weight && (
                    <span className="text-gray-500">kg</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">BMI:</span>
                <span className="font-medium">
                  {anthropometryData.bmi || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">BMI Category:</span>
                <span className="font-medium">
                  {anthropometryData.bmi_category || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fat Mass:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {anthropometryData.fat_mass || "N/A"}
                  </span>
                  {anthropometryData.fat_mass && (
                    <span className="text-gray-500">kg</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fat Mass (%):</span>
                <span className="font-medium">
                  {anthropometryData.fat_mass_percentage || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Skeletal Muscle Mass:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {anthropometryData.skeletal_muscle_mass || "N/A"}
                  </span>
                  {anthropometryData.skeletal_muscle_mass && (
                    <span className="text-gray-500">kg</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Skeletal Muscle Mass (%):</span>
                <span className="font-medium">
                  {anthropometryData.skeletal_muscle_mass_percentage || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sum of 8 Skinfold:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {anthropometryData.sum_of_skinfold || "N/A"}
                  </span>
                  {anthropometryData.sum_of_skinfold && (
                    <span className="text-gray-500">mm</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Target Weight:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {anthropometryData.target_weight || "N/A"}
                  </span>
                  {anthropometryData.target_weight && (
                    <span className="text-gray-500">kg</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Target BMI:</span>
                <span className="font-medium">
                  {anthropometryData.target_bmi || "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Mother's Height:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {anthropometryData.mothers_height || "N/A"}
                  </span>
                  {anthropometryData.mothers_height && (
                    <span className="text-gray-500">cm</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Father's Height:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {anthropometryData.fathers_height || "N/A"}
                  </span>
                  {anthropometryData.fathers_height && (
                    <span className="text-gray-500">cm</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center col-span-2">
                <span className="text-gray-600">
                  Athlete's Potential Adult Height:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {anthropometryData.athlete_potential_adult_height || "N/A"}
                  </span>
                  {anthropometryData.athlete_potential_adult_height && (
                    <span className="text-gray-500">cm</span>
                  )}
                </div>
              </div>
            </div>

            {/* Measurement Details */}
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Date Recorded:</span>
                  <span className="text-gray-900">
                    {anthropometryData.date_recorded
                      ? new Date(
                          anthropometryData.date_recorded,
                        ).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Measured By:</span>
                  <span className="text-gray-900">
                    {anthropometryData.measured_by || "N/A"}
                  </span>
                </div>
              </div>

              {anthropometryData.measurement_notes && (
                <div className="mt-3">
                  <span className="text-gray-600 text-sm">Notes:</span>
                  <p className="text-gray-900 text-sm mt-1">
                    {anthropometryData.measurement_notes}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
