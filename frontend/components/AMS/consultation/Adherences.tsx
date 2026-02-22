import { useState } from "react";

interface AdherencesProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  newSessionId?: string;
}

interface NutritionRequirement {
  minCarbohydrate: number;
  maxCarbohydrate: number;
  minProtein: number;
  maxProtein: number;
  minFat: number;
  maxFat: number;
}

interface IntakeData {
  estimatedCarbohydrate: number;
  estimatedProtein: number;
  estimatedFat: number;
  percentMinCarbohydrate: number;
  percentMinProtein: number;
  percentMinFat: number;
  weekdayComments: string;
  weekendComments: string;
}

interface MetabolicData {
  male: {
    rmr: number;
    tee: number;
    targetWeightRMR: number;
    targetWeightTEE: number;
    otherRemarks: string;
  };
  female: {
    rmr: number;
    tee: number;
    targetWeightRMR: number;
    targetWeightTEE: number;
  };
}

export default function Adherences({ athleteId, sessionId, isNewConsultation, newSessionId }: AdherencesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const effectiveEditing = isEditing || !!isNewConsultation;
  const [intakeData, setIntakeData] = useState<IntakeData>({
    estimatedCarbohydrate: 350,
    estimatedProtein: 154,
    estimatedFat: 60,
    percentMinCarbohydrate: 80,
    percentMinProtein: 70,
    percentMinFat: 75,
    weekdayComments: "",
    weekendComments: "",
  });

  const [metabolicData, setMetabolicData] = useState<MetabolicData>({
    male: {
      rmr: 1845,
      tee: 3200,
      targetWeightRMR: 1825,
      targetWeightTEE: 3210,
      otherRemarks: "",
    },
    female: {
      rmr: 0,
      tee: 0,
      targetWeightRMR: 0,
      targetWeightTEE: 0,
    },
  });

  const handleSave = async () => {
    try {
      console.log("Saving adherences data:", {
        intakeData,
        metabolicData,
      });
      // TODO: Implement API call to create new consultation session entry
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving adherences:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };
  // Mock data based on the form structure in the image
  const currentIntake: NutritionRequirement = {
    minCarbohydrate: 3.0,
    maxCarbohydrate: 7.0,
    minProtein: 1.6,
    maxProtein: 2.2,
    minFat: 0.8,
    maxFat: 1.2,
  };

  const targetIntake: NutritionRequirement = {
    minCarbohydrate: 3.0,
    maxCarbohydrate: 7.0,
    minProtein: 1.6,
    maxProtein: 2.2,
    minFat: 0.8,
    maxFat: 1.2,
  };

  return (
    <section id="adherences" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Adherences</h2>
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

      <div className="space-y-6">
        {/* Current Intake */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Current Intake
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Minimum Carbohydrate Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {currentIntake.minCarbohydrate}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Minimum Carbohydrate Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {currentIntake.minCarbohydrate}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Carbohydrate Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {currentIntake.maxCarbohydrate}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Carbohydrate Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {currentIntake.maxCarbohydrate}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Minimum Protein Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentIntake.minProtein}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Minimum Protein Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentIntake.minProtein}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Protein Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentIntake.maxProtein}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Protein Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentIntake.maxProtein}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Fat Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentIntake.minFat}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Fat Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentIntake.minFat}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Fat Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentIntake.maxFat}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Fat Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentIntake.maxFat}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Target Intake */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Target Intake
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Minimum Carbohydrate Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {targetIntake.minCarbohydrate}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Minimum Carbohydrate Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {targetIntake.minCarbohydrate}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Carbohydrate Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {targetIntake.maxCarbohydrate}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Carbohydrate Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {targetIntake.maxCarbohydrate}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Minimum Protein Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{targetIntake.minProtein}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Minimum Protein Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{targetIntake.minProtein}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Protein Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{targetIntake.maxProtein}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Protein Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{targetIntake.maxProtein}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Fat Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{targetIntake.minFat}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Fat Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{targetIntake.minFat}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Fat Requirement (g/kg/bw):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{targetIntake.maxFat}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Maximum Fat Requirement (g):
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{targetIntake.maxFat}</span>
              </div>
            </div>
          </div>

          {/* Estimated Intake */}
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Estimated Carbohydrate Intake (g):
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {intakeData.estimatedCarbohydrate}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  % of Min Carbohydrate Requirement:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {intakeData.percentMinCarbohydrate}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Estimated Protein Intake (g):
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {intakeData.estimatedProtein}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  % of Min Protein Requirement:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {intakeData.percentMinProtein}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Estimated Fat Intake (g):</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{intakeData.estimatedFat}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">% of Min Fat Requirement:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {intakeData.percentMinFat}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Comments on Weekday Intake:
                </label>
                <p className="text-sm text-gray-900">{intakeData.weekdayComments}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Comments on Weekend Intake:
                </label>
                <p className="text-sm text-gray-900">{intakeData.weekendComments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Male and Female Sections */}
        <div className="grid grid-cols-2 gap-8">
          {/* Male */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Male</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Resting Metabolic Rate (RMR) Calculation:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{metabolicData.male.rmr}</span>
                  <span className="text-gray-500">kcal</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Total Energy Expenditure (TEE) Calculation:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{metabolicData.male.tee}</span>
                  <span className="text-gray-500">kcal</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Target Weight RMR:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {metabolicData.male.targetWeightRMR}
                  </span>
                  <span className="text-gray-500">kcal</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Target Weight TEE:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {metabolicData.male.targetWeightTEE}
                  </span>
                  <span className="text-gray-500">kcal</span>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-gray-600 mb-2">
                  Other Remarks:
                </label>
                {effectiveEditing ? (
                  <textarea
                    className="w-full h-16 px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Input Text Here"
                    value={metabolicData.male.otherRemarks}
                    onChange={(e) =>
                      setMetabolicData((prev) => ({
                        ...prev,
                        male: {
                          ...prev.male,
                          otherRemarks: e.target.value,
                        },
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm text-gray-900">{metabolicData.male.otherRemarks}</p>
                )}
              </div>
            </div>
          </div>

          {/* Female */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Female</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Resting Metabolic Rate (RMR) Calculation:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {metabolicData.female.rmr}
                  </span>
                  <span className="text-gray-500">kcal</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Total Energy Expenditure (TEE) Calculation:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {metabolicData.female.tee}
                  </span>
                  <span className="text-gray-500">kcal</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Target Weight RMR:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {metabolicData.female.targetWeightRMR}
                  </span>
                  <span className="text-gray-500">kcal</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Target Weight TEE:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {metabolicData.female.targetWeightTEE}
                  </span>
                  <span className="text-gray-500">kcal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
