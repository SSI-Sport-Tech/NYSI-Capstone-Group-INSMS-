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
  // For now, using mock data - this could be integrated with meal logs API later
  const assessmentData: AssessmentData = {
    totalCarbohydrateIntake: 215,
    totalProteinIntake: 114,
    totalFatIntake: 82,
    otherRemarks: "",
  };

  return (
    <section id="assessment" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Assessment</h2>
        <button className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700">
          Edit
        </button>
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
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                readOnly
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Protein Intake (g):</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={assessmentData.totalProteinIntake}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                readOnly
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Fat Intake (g):</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={assessmentData.totalFatIntake}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                readOnly
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
          />
        </div>
      </div>
    </section>
  );
}
