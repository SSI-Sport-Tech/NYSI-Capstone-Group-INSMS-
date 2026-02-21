import { useState } from "react";

interface AssessmentProps {
  athleteId: string;
  sessionId: string;
}

interface AssessmentData {
  totalCarbohydrateIntake: number;
  totalProteinIntake: number;
  totalFatIntake: number;
  otherRemarks: string;
}

export default function Assessment({ athleteId, sessionId }: AssessmentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    totalCarbohydrateIntake: 215,
    totalProteinIntake: 114,
    totalFatIntake: 82,
    otherRemarks: "",
  });

  const handleSave = async () => {
    try {
      // TODO: Implement API call to create new consultation session entry
      console.log("Saving assessment data:", assessmentData);
      // const response = await fetch(`/api/consultation/assessment`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ sessionId, athleteId, ...assessmentData })
      // });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving assessment:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original data if needed
  };

  return (
    <section id="assessment" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Assessment</h2>
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

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              Total Carbohydrate Intake (g):
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={assessmentData.totalCarbohydrateIntake}
                onChange={(e) => {
                  if (isEditing) {
                    setAssessmentData((prev) => ({
                      ...prev,
                      totalCarbohydrateIntake: Number(e.target.value),
                    }));
                  }
                }}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                readOnly={!isEditing}
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Protein Intake (g):</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={assessmentData.totalProteinIntake}
                onChange={(e) => {
                  if (isEditing) {
                    setAssessmentData((prev) => ({
                      ...prev,
                      totalProteinIntake: Number(e.target.value),
                    }));
                  }
                }}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                readOnly={!isEditing}
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Fat Intake (g):</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={assessmentData.totalFatIntake}
                onChange={(e) => {
                  if (isEditing) {
                    setAssessmentData((prev) => ({
                      ...prev,
                      totalFatIntake: Number(e.target.value),
                    }));
                  }
                }}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                readOnly={!isEditing}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">
            Other Remarks:
          </label>
          <textarea
            className="w-full h-24 px-3 py-2 border border-gray-300 rounded text-sm"
            placeholder="Input Text Here"
            value={assessmentData.otherRemarks}
            onChange={(e) => {
              if (isEditing) {
                setAssessmentData((prev) => ({
                  ...prev,
                  otherRemarks: e.target.value,
                }));
              }
            }}
            readOnly={!isEditing}
          />
        </div>
      </div>
    </section>
  );
}
