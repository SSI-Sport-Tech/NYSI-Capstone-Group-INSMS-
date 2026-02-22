import { useState } from "react";

interface MedicalHistoryProps {
  athleteId: string;
  sessionId: string;
  isNewConsultation?: boolean;
  newSessionId?: string;
}

interface GeneralInfo {
  medicalCondition: string;
  foodAllergy: string;
  drugAllergy: string;
  notablePastInjuries: string;
  medicalRemarks: string;
}

interface PubertyInfo {
  periodOfGrowthSpurt: string;
  otherRemarks: string;
}

interface BowelMovement {
  regularBowelMovement: string;
  frequencyOfBowelMovements: string;
  stoolAppearance: string;
  otherRemarks: string;
}

interface HydrationInfo {
  waterIntakeForTargetWeight: string;
  requirementForWaterIntake: string;
  waterIntakePerDay: string;
  urineColour: string;
  hydrationStatus: string;
  otherRemarks: string;
}

interface PeriodInfo {
  firstDayPeriod: string;
  ageOfMenarche: number;
  regularityOfPeriod: number;
  menstrualCycleLength: number;
  periodBleedingLength: number;
  menstrualBleedingHeaviness: number;
  signsAndSymptoms: string;
  otherRemarks: string;
}

export default function MedicalHistory({
  athleteId,
  sessionId,
  isNewConsultation,
  newSessionId,
}: MedicalHistoryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const effectiveEditing = isEditing || !!isNewConsultation;
  const [generalInfo, setGeneralInfo] = useState<GeneralInfo>({
    medicalCondition:
      "Often undergo dehydration to lose weight 24 hours before competition fight",
    foodAllergy: "Allergy to Peanut",
    drugAllergy: "N.A.",
    notablePastInjuries: "LCL/MCL Sprains",
    medicalRemarks: "",
  });

  const [pubertyInfo, setPubertyInfo] = useState<PubertyInfo>({
    periodOfGrowthSpurt: "",
    otherRemarks: "",
  });

  const [bowelMovement, setBowelMovement] = useState<BowelMovement>({
    regularBowelMovement: "",
    frequencyOfBowelMovements: "",
    stoolAppearance: "",
    otherRemarks: "",
  });

  const [hydrationInfo, setHydrationInfo] = useState<HydrationInfo>({
    waterIntakeForTargetWeight: "",
    requirementForWaterIntake: "",
    waterIntakePerDay: "",
    urineColour: "",
    hydrationStatus: "",
    otherRemarks: "",
  });

  const [periodInfo, setPeriodInfo] = useState<PeriodInfo>({
    firstDayPeriod: "YYYY-MM-DD",
    ageOfMenarche: 0,
    regularityOfPeriod: 0,
    menstrualCycleLength: 0,
    periodBleedingLength: 0,
    menstrualBleedingHeaviness: 0,
    signsAndSymptoms: "",
    otherRemarks: "",
  });

  const handleSave = async () => {
    try {
      console.log("Saving medical history data:", {
        generalInfo,
        pubertyInfo,
        bowelMovement,
        hydrationInfo,
        periodInfo,
      });
      // TODO: Implement API call to create new consultation session entry
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving medical history:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <section id="medical-history" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Medical History</h2>
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
        {/* General Section */}
        <div>
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <span className="font-medium">General</span>
            <span className="ml-2">2025-11-23 15:00:25 | Amy Tan</span>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Medical Condition:
              </span>
              <span className="text-gray-900 flex-1">
                {generalInfo.medicalCondition}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Food Allergy:
              </span>
              <span className="text-gray-900 flex-1">
                {generalInfo.foodAllergy}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Drug Allergy:
              </span>
              <span className="text-gray-900 flex-1">
                {generalInfo.drugAllergy}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Notable Past Injuries:
              </span>
              <span className="text-gray-900 flex-1">
                {generalInfo.notablePastInjuries}
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Medical Remarks:
              </span>
              {effectiveEditing ? (
                <input
                  type="text"
                  placeholder="Input Text Here"
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                  value={generalInfo.medicalRemarks}
                  onChange={(e) =>
                    setGeneralInfo((prev) => ({
                      ...prev,
                      medicalRemarks: e.target.value,
                    }))
                  }
                />
              ) : (
                <span className="text-gray-900 flex-1">{generalInfo.medicalRemarks}</span>
              )}
              <button className="text-gray-400 hover:text-gray-600">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Puberty Section */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">Puberty</h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Period of Growth Spurt:
              </span>
              <span className="text-gray-900 flex-1">{pubertyInfo.periodOfGrowthSpurt}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Other Remarks:
              </span>
              {effectiveEditing ? (
                <input
                  type="text"
                  placeholder="Input Text Here"
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                  value={pubertyInfo.otherRemarks}
                  onChange={(e) =>
                    setPubertyInfo((prev) => ({
                      ...prev,
                      otherRemarks: e.target.value,
                    }))
                  }
                />
              ) : (
                <span className="text-gray-900 flex-1">{pubertyInfo.otherRemarks}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bowel Movement Section */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Bowel Movement
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Does Athlete Have Regular Bowel Movement? :
              </span>
              <span className="text-gray-900 flex-1">{bowelMovement.regularBowelMovement}</span>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Frequency of Bowel Movements: (i.e. once a day/once every two
                days)
              </span>
              <span className="text-gray-900 flex-1">{bowelMovement.frequencyOfBowelMovements}</span>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                How Does Athlete's Stool Typically Look Like? :
              </span>
              {effectiveEditing ? (
                <input
                  type="text"
                  placeholder="Input Text Here"
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                  value={bowelMovement.stoolAppearance}
                  onChange={(e) =>
                    setBowelMovement((prev) => ({
                      ...prev,
                      stoolAppearance: e.target.value,
                    }))
                  }
                />
              ) : (
                <span className="text-gray-900 flex-1">{bowelMovement.stoolAppearance}</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Other Remarks:
              </span>
              <span className="text-gray-900 flex-1">{bowelMovement.otherRemarks}</span>
            </div>
          </div>
        </div>

        {/* Hydration/Fluid Intake Section */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Hydration/Fluid Intake
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Water intake for Target Weight (45ml/kg BW):
              </span>
              <span className="text-gray-900 flex-1">{hydrationInfo.waterIntakeForTargetWeight}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Requirement for Water Intake (45ml/kg BW):
              </span>
              <span className="text-gray-900 flex-1">{hydrationInfo.requirementForWaterIntake}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Water Intake per Day:
              </span>
              <span className="text-gray-900 flex-1">{hydrationInfo.waterIntakePerDay}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Athlete's Typical Colour of Urine:
              </span>
              <span className="text-gray-900 flex-1">{hydrationInfo.urineColour}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Typical Hydration Status Based on Colour of Urine:
              </span>
              <span className="text-gray-900 flex-1">{hydrationInfo.hydrationStatus}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Other Remarks:
              </span>
              <span className="text-gray-900 flex-1">{hydrationInfo.otherRemarks}</span>
            </div>
          </div>
        </div>

        {/* Period Section */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">Period</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Date of First Day Period:</span>
              <span className="font-medium">{periodInfo.firstDayPeriod}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Length of Typical Menstrual Cycle:
              </span>
              <span className="font-medium">{periodInfo.menstrualCycleLength}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Age of Menarche:</span>
              <span className="font-medium">{periodInfo.ageOfMenarche}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Length of Period/Menstrual Bleeding:
              </span>
              <span className="font-medium">{periodInfo.periodBleedingLength}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Regularity of Period:</span>
              <span className="font-medium">{periodInfo.regularityOfPeriod}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Heaviness of Menstrual Bleeding:
              </span>
              <span className="font-medium">{periodInfo.menstrualBleedingHeaviness}</span>
            </div>
          </div>

          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Any Signs and Symptoms:
              </span>
              <span className="text-gray-900 flex-1">{periodInfo.signsAndSymptoms}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 w-48 flex-shrink-0">
                Other Remarks:
              </span>
              <span className="text-gray-900 flex-1">{periodInfo.otherRemarks}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
