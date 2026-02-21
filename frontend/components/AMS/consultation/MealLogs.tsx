import { useState, useEffect } from "react";

interface MealLogsProps {
  athleteId: string;
  sessionId: string;
}

interface MealEntry {
  time: string;
  foodIntake: string;
  macronutrients: string;
}

interface Assessment {
  totalCarbohydrateIntake: number;
  totalProteinIntake: number;
  totalFatIntake: number;
  otherRemarks: string;
}

export default function MealLogs({ athleteId, sessionId }: MealLogsProps) {
  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchMealLogs = async () => {
    if (!sessionId) {
      setMealEntries([]);
      setAssessment(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/Consultation/sessions/${sessionId}/meal-logs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          setMealEntries([]);
          setAssessment(null);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMealEntries(data.data?.meal_entries || []);
      setAssessment(data.data?.assessment || null);
    } catch (error) {
      console.error("Error fetching meal logs:", error);
      setError("Failed to load meal logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealLogs();
  }, [sessionId]);

  if (loading) {
    return (
      <section id="meal-logs" className="bg-white rounded-xl shadow-lg p-6">
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
      <section id="meal-logs" className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchMealLogs}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  // Mock data for demonstration if no data from API
  const defaultMealEntries: MealEntry[] = [
    {
      time: "AM Breakfast",
      foodIntake: "2 Yakun Kaya Toast + 2 boiled eggs + teh o kosong",
      macronutrients: "CHO: 55g, Protein: 16g, Fat: 18g",
    },
    {
      time: "AM Training",
      foodIntake: "",
      macronutrients: "",
    },
    {
      time: "PM Lunch",
      foodIntake:
        "Chicken rice with steamed chicken, braised egg, braised tofu + veggie with oyster sauce",
      macronutrients: "CHO: 85G, P: 35g, F: 30g",
    },
    {
      time: "PM Training",
      foodIntake: "Protein shake",
      macronutrients: "P: 25g",
    },
    {
      time: "PM Dinner",
      foodIntake: "Cai fan (2 meats + 1 veggie + brown rice)",
      macronutrients: "CHO: 60g, P: 30g, F: 28g",
    },
    {
      time: "Supper",
      foodIntake: "Soy milk",
      macronutrients: "CHO: 12g, P: 8g, F: 4g",
    },
  ];

  const defaultAssessment: Assessment = {
    totalCarbohydrateIntake: 215,
    totalProteinIntake: 114,
    totalFatIntake: 82,
    otherRemarks: "",
  };

  // Use fetched data if available, otherwise use defaults
  const displayMealEntries =
    mealEntries.length > 0 ? mealEntries : defaultMealEntries;
  const displayAssessment = assessment || defaultAssessment;

  return (
    <section id="meal-logs" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Meal Logs</h2>
        <button className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700">
          Edit
        </button>
      </div>

      <div className="space-y-6">
        {/* Meal Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 w-32">
                  Time
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Food Intake (Usual)
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 w-64">
                  Macronutrient Intake
                </th>
              </tr>
            </thead>
            <tbody>
              {displayMealEntries.map((entry, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                    {entry.time}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    {entry.foodIntake}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 text-center">
                    {entry.macronutrients}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Assessment Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Total Carbohydrate Intake (g):
              </span>
              <input
                type="number"
                value={displayAssessment.totalCarbohydrateIntake}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                readOnly
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Protein Intake (g):</span>
              <input
                type="number"
                value={displayAssessment.totalProteinIntake}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                readOnly
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Fat Intake (g):</span>
              <input
                type="number"
                value={displayAssessment.totalFatIntake}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                readOnly
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-2">
              Other Remarks:
            </label>
            <textarea
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="Input Text Here"
              value={displayAssessment.otherRemarks}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
