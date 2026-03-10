import { useState } from "react";

interface AssessmentProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  newSessionId?: string;
}

interface AssessmentData {
  totalCarbohydrateIntake: number;
  totalProteinIntake: number;
  totalFatIntake: number;
  otherRemarks: string;
}

export default function Assessment({ athleteId, sessionId, isNewConsultation, newSessionId }: AssessmentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const effectiveEditing = isEditing || !!isNewConsultation;
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    totalCarbohydrateIntake: 215,
    totalProteinIntake: 114,
    totalFatIntake: 82,
    otherRemarks: "",
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(false);
  }, [assessmentData]);

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
      setIsSaved(true);
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
            className={`px-3 py-1 text-white text-sm rounded ${effectiveEditing && isSaved ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"}`}
          >
            {effectiveEditing ? (isSaved ? "Saved" : "Save") : "Edit"}
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
              {effectiveEditing ? (
                <input
                  type="number"
                  value={assessmentData.totalCarbohydrateIntake}
                  onChange={(e) =>
                    setAssessmentData((prev) => ({
                      ...prev,
                      totalCarbohydrateIntake: Number(e.target.value),
                    }))
                  }
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                />
              ) : (
                <span className="font-medium">{assessmentData.totalCarbohydrateIntake}</span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Protein Intake (g):</span>
            <div className="flex items-center gap-2">
              {effectiveEditing ? (
                <input
                  type="number"
                  value={assessmentData.totalProteinIntake}
                  onChange={(e) =>
                    setAssessmentData((prev) => ({
                      ...prev,
                      totalProteinIntake: Number(e.target.value),
                    }))
                  }
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                />
              ) : (
                <span className="font-medium">{assessmentData.totalProteinIntake}</span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Fat Intake (g):</span>
            <div className="flex items-center gap-2">
              {effectiveEditing ? (
                <input
                  type="number"
                  value={assessmentData.totalFatIntake}
                  onChange={(e) =>
                    setAssessmentData((prev) => ({
                      ...prev,
                      totalFatIntake: Number(e.target.value),
                    }))
                  }
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                />
              ) : (
                <span className="font-medium">{assessmentData.totalFatIntake}</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">
            Other Remarks:
          </label>
          {effectiveEditing ? (
            <textarea
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="Input Text Here"
              value={assessmentData.otherRemarks}
              onChange={(e) =>
                setAssessmentData((prev) => ({
                  ...prev,
                  otherRemarks: e.target.value,
                }))
              }
            />
          ) : (
            <p className="text-sm text-gray-900">{assessmentData.otherRemarks}</p>
          )}
        </div>
      </div>
    </section>
  );
}
function useEffect(arg0: () => void, arg1: AssessmentData[]) {
  throw new Error("Function not implemented.");
}

