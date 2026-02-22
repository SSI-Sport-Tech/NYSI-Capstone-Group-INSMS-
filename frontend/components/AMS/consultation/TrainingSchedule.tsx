import { useState, useEffect } from "react";
import { consultationApi } from "@/utils/consultationApi";

interface TrainingScheduleProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  newSessionId?: string;
}

interface TrainingSession {
  day: string;
  activities: string;
  trainingHours: number;
  rpe: number;
}

interface TrainingDetails {
  totalTrainingHours: number;
  physicalActivityLevel: number;
  upcomingMajorCompetitions: string;
  upcomingLocalCompetitions: string;
}

interface PerformanceDetails {
  currentPerformance: string;
  coachPerformanceGoals: string;
  athletePerformanceGoals: string;
  otherRemarks: string;
}

interface TrainingScheduleData {
  id: string | null;
  sessionId: string;
  days: {
    monday: {
      am: string | null;
      pm: string | null;
      trainingHours: number;
      rpe: number;
    };
    tuesday: {
      am: string | null;
      pm: string | null;
      trainingHours: number;
      rpe: number;
    };
    wednesday: {
      am: string | null;
      pm: string | null;
      trainingHours: number;
      rpe: number;
    };
    thursday: {
      am: string | null;
      pm: string | null;
      trainingHours: number;
      rpe: number;
    };
    friday: {
      am: string | null;
      pm: string | null;
      trainingHours: number;
      rpe: number;
    };
    saturday: {
      am: string | null;
      pm: string | null;
      trainingHours: number;
      rpe: number;
    };
    sunday: {
      am: string | null;
      pm: string | null;
      trainingHours: number;
      rpe: number;
    };
  };
  totalTrainingHours: number;
  pal: string;
  trainingDetails: {
    upcomingMajorCompetitions: string | null;
    upcomingLocalCompetitions: string | null;
  };
  performanceDetails: {
    currentPerformance: string | null;
    coachPerformanceGoals: string | null;
    athletePerformanceGoals: string | null;
    otherRemarks: string | null;
  };
}

export default function TrainingSchedule({
  athleteId: _athleteId,
  sessionId,
  isNewConsultation,
  newSessionId: _newSessionId,
}: TrainingScheduleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const effectiveEditing = isEditing || !!isNewConsultation;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainingData, setTrainingData] = useState<TrainingScheduleData | null>(
    null,
  );
  const [performanceDetails, setPerformanceDetails] =
    useState<PerformanceDetails>({
      currentPerformance: "",
      coachPerformanceGoals: "",
      athletePerformanceGoals: "",
      otherRemarks: "",
    });

  const handleSave = async () => {
    try {
      console.log("Saving training schedule data:", performanceDetails);
      // TODO: Implement API call to create new consultation session entry
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving training schedule:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset performance details to original values
    if (trainingData?.performanceDetails) {
      setPerformanceDetails({
        currentPerformance:
          trainingData.performanceDetails.currentPerformance || "",
        coachPerformanceGoals:
          trainingData.performanceDetails.coachPerformanceGoals || "",
        athletePerformanceGoals:
          trainingData.performanceDetails.athletePerformanceGoals || "",
        otherRemarks: trainingData.performanceDetails.otherRemarks || "",
      });
    }
  };

  useEffect(() => {
    const fetchTrainingSchedule = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = (await consultationApi.getTrainingSchedule(
          sessionId,
        )) as {
          data: TrainingScheduleData;
        };

        console.log("Training schedule response:", response);

        if (response?.data) {
          setTrainingData(response.data);
          // Set performance details for editing
          setPerformanceDetails({
            currentPerformance:
              response.data.performanceDetails?.currentPerformance || "",
            coachPerformanceGoals:
              response.data.performanceDetails?.coachPerformanceGoals || "",
            athletePerformanceGoals:
              response.data.performanceDetails?.athletePerformanceGoals || "",
            otherRemarks: response.data.performanceDetails?.otherRemarks || "",
          });
        }
      } catch (err) {
        console.error("Error fetching training schedule:", err);
        setError("Failed to load training schedule data");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchTrainingSchedule();
    }
  }, [sessionId]);
  // Convert API data to display format
  const trainingSchedule: TrainingSession[] = trainingData
    ? [
        {
          day: "Monday",
          activities:
            [trainingData.days.monday.am, trainingData.days.monday.pm]
              .filter(Boolean)
              .join("\n") || "",
          trainingHours: trainingData.days.monday.trainingHours,
          rpe: trainingData.days.monday.rpe,
        },
        {
          day: "Tuesday",
          activities:
            [trainingData.days.tuesday.am, trainingData.days.tuesday.pm]
              .filter(Boolean)
              .join("\n") || "",
          trainingHours: trainingData.days.tuesday.trainingHours,
          rpe: trainingData.days.tuesday.rpe,
        },
        {
          day: "Wednesday",
          activities:
            [trainingData.days.wednesday.am, trainingData.days.wednesday.pm]
              .filter(Boolean)
              .join("\n") || "",
          trainingHours: trainingData.days.wednesday.trainingHours,
          rpe: trainingData.days.wednesday.rpe,
        },
        {
          day: "Thursday",
          activities:
            [trainingData.days.thursday.am, trainingData.days.thursday.pm]
              .filter(Boolean)
              .join("\n") || "",
          trainingHours: trainingData.days.thursday.trainingHours,
          rpe: trainingData.days.thursday.rpe,
        },
        {
          day: "Friday",
          activities:
            [trainingData.days.friday.am, trainingData.days.friday.pm]
              .filter(Boolean)
              .join("\n") || "",
          trainingHours: trainingData.days.friday.trainingHours,
          rpe: trainingData.days.friday.rpe,
        },
        {
          day: "Saturday",
          activities:
            [trainingData.days.saturday.am, trainingData.days.saturday.pm]
              .filter(Boolean)
              .join("\n") || "",
          trainingHours: trainingData.days.saturday.trainingHours,
          rpe: trainingData.days.saturday.rpe,
        },
        {
          day: "Sunday",
          activities:
            [trainingData.days.sunday.am, trainingData.days.sunday.pm]
              .filter(Boolean)
              .join("\n") || "",
          trainingHours: trainingData.days.sunday.trainingHours,
          rpe: trainingData.days.sunday.rpe,
        },
      ]
    : [];

  const trainingDetails: TrainingDetails = {
    totalTrainingHours: trainingData?.totalTrainingHours || 0,
    physicalActivityLevel: parseFloat(trainingData?.pal || "0"),
    upcomingMajorCompetitions:
      trainingData?.trainingDetails?.upcomingMajorCompetitions ||
      "Not specified",
    upcomingLocalCompetitions:
      trainingData?.trainingDetails?.upcomingLocalCompetitions ||
      "Not specified",
  };

  if (loading) {
    return (
      <section
        id="training-schedule"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            Loading training schedule...
          </span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        id="training-schedule"
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="text-center py-12">
          <div className="text-red-600 mb-2">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="training-schedule"
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Training Schedule
        </h2>
        <div className="flex items-center gap-2">
          {effectiveEditing && !isNewConsultation && (
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          )}
          <button
            onClick={effectiveEditing ? handleSave : () => setIsEditing(true)}
            className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
          >
            {effectiveEditing ? "Save" : "Edit"}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Training Schedule Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 w-24">
                  Day
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Activities
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 w-32">
                  Training Hours
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 w-24">
                  RPE (1-10)
                </th>
              </tr>
            </thead>
            <tbody>
              {trainingSchedule.map((session, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                    {session.day}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                    {session.activities.split("\n").map((activity, idx) => (
                      <div key={idx} className="whitespace-nowrap">
                        {activity}
                      </div>
                    ))}
                  </td>
                  <td className="text-gray-900 border border-gray-300 px-4 py-3 text-sm text-center">
                    {session.trainingHours}
                  </td>
                  <td className="text-gray-900 border border-gray-300 px-4 py-3 text-sm text-center">
                    {session.rpe}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Training Details */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-base font-medium text-gray-900 mb-4">
              Training Details
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Training Hours:</span>
                <span className="text-gray-900">
                  {trainingDetails.totalTrainingHours}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Physical Activity Level (PAL):
                </span>
                <span className="text-gray-900">
                  {trainingDetails.physicalActivityLevel}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Upcoming Major Competitions:
                </span>
                <span className="text-gray-900">
                  {trainingDetails.upcomingMajorCompetitions}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Upcoming Local Competitions:
                </span>
                <span className="text-gray-900">
                  {trainingDetails.upcomingLocalCompetitions}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-medium text-gray-900 mb-4">
              Performance Details
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-600 mb-2">
                  Current Performance:
                </label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={performanceDetails.currentPerformance}
                    onChange={(e) =>
                      setPerformanceDetails((prev) => ({
                        ...prev,
                        currentPerformance: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">{performanceDetails.currentPerformance}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Coach Performance Goals:
                </label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={performanceDetails.coachPerformanceGoals}
                    onChange={(e) =>
                      setPerformanceDetails((prev) => ({
                        ...prev,
                        coachPerformanceGoals: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">{performanceDetails.coachPerformanceGoals}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Athlete Performance Goals:
                </label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={performanceDetails.athletePerformanceGoals}
                    onChange={(e) =>
                      setPerformanceDetails((prev) => ({
                        ...prev,
                        athletePerformanceGoals: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">{performanceDetails.athletePerformanceGoals}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Other Remarks:
                </label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={performanceDetails.otherRemarks}
                    onChange={(e) =>
                      setPerformanceDetails((prev) => ({
                        ...prev,
                        otherRemarks: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">{performanceDetails.otherRemarks}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
