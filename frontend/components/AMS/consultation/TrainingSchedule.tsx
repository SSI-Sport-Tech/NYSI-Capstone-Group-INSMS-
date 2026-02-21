import { useState } from "react";

interface TrainingScheduleProps {
  athleteId: string;
  sessionId: string;
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

export default function TrainingSchedule({
  athleteId,
  sessionId,
}: TrainingScheduleProps) {
  const [isEditing, setIsEditing] = useState(false);
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
  };
  const trainingSchedule: TrainingSession[] = [
    {
      day: "Monday",
      activities:
        "S&C (Max Training) 09:00-10:30\nBJJ (Hard Sparring) 15:00-17:00\nTraining with Coach 14:00-15:00",
      trainingHours: 3.5,
      rpe: 7,
    },
    {
      day: "Tuesday",
      activities: "BJJ (No-Gi) 19:30-21:00\nS&C (Power) 09:00-10:30",
      trainingHours: 2.5,
      rpe: 8,
    },
    {
      day: "Wednesday",
      activities: "Drilling (Gi) 13:00-14:30\nS&C (Strength) 09:00-10:30",
      trainingHours: 3,
      rpe: 6,
    },
    {
      day: "Thursday",
      activities: "Comp Class (Gi) 19:00-21:00\nYoga/Mobility 09:00-11:00",
      trainingHours: 3.5,
      rpe: 8,
    },
    {
      day: "Friday",
      activities: "Positional Sparring 14:00-15:00",
      trainingHours: 3,
      rpe: 5,
    },
    {
      day: "Saturday",
      activities: "",
      trainingHours: 0,
      rpe: 0,
    },
    {
      day: "Sunday",
      activities: "",
      trainingHours: 0,
      rpe: 0,
    },
  ];

  const trainingDetails: TrainingDetails = {
    totalTrainingHours: 16.83,
    physicalActivityLevel: 1.9,
    upcomingMajorCompetitions: "SEA Games 2025 (Thailand)",
    upcomingLocalCompetitions: "-",
  };

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
          {isEditing && (
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          )}
          <button
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
          >
            {isEditing ? "Save" : "Edit"}
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
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    {session.activities.split("\n").map((activity, idx) => (
                      <div key={idx} className="whitespace-nowrap">
                        {activity}
                      </div>
                    ))}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                    {session.trainingHours}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-center">
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
                <textarea
                  className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Input Text Here"
                  value={performanceDetails.currentPerformance}
                  onChange={(e) => {
                    if (isEditing) {
                      setPerformanceDetails((prev) => ({
                        ...prev,
                        currentPerformance: e.target.value,
                      }));
                    }
                  }}
                  readOnly={!isEditing}
                />
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Coach Performance Goals:
                </label>
                <textarea
                  className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Input Text Here"
                  value={performanceDetails.coachPerformanceGoals}
                  onChange={(e) => {
                    if (isEditing) {
                      setPerformanceDetails((prev) => ({
                        ...prev,
                        coachPerformanceGoals: e.target.value,
                      }));
                    }
                  }}
                  readOnly={!isEditing}
                />
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Athlete Performance Goals:
                </label>
                <textarea
                  className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Input Text Here"
                  value={performanceDetails.athletePerformanceGoals}
                  onChange={(e) => {
                    if (isEditing) {
                      setPerformanceDetails((prev) => ({
                        ...prev,
                        athletePerformanceGoals: e.target.value,
                      }));
                    }
                  }}
                  readOnly={!isEditing}
                />
              </div>

              <div>
                <label className="block text-gray-600 mb-2">
                  Other Remarks:
                </label>
                <textarea
                  className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Input Text Here"
                  value={performanceDetails.otherRemarks}
                  onChange={(e) => {
                    if (isEditing) {
                      setPerformanceDetails((prev) => ({
                        ...prev,
                        otherRemarks: e.target.value,
                      }));
                    }
                  }}
                  readOnly={!isEditing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
