import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

interface Sport {
  id: string;
  sport: string;
  is_active: boolean;
}

interface Coach {
  id: string;
  name: string;
  sport_id: string;
  sport_name: string;
}

interface AddAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface AthleteFormData {
  // Athlete table fields
  sport_id: string;
  sportsync_id: string;
  athlete_name_abbr: string;
  gender: string;
  date_of_birth: string;

  // Registry fields
  carding_status: string;
  athlete_notified_on: string;
  carding_start_date: string;
  carding_end_date: string;
  medical_clearance: boolean;
  approved_start_date: string;
  approved_end_date: string;

  // Medical fields
  medical_condition: string;
  food_allergy: string;
  drug_allergy: string;
  past_injury: string;
  medical_remarks: string;

  // Target Event (custom field)
  target_event: string;

  // Coach assignment
  coach_ids: string[];
}

const AddAthleteModal: React.FC<AddAthleteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [formData, setFormData] = useState<AthleteFormData>({
    sport_id: "",
    sportsync_id: "",
    athlete_name_abbr: "",
    gender: "",
    date_of_birth: "",
    carding_status: "",
    athlete_notified_on: "",
    carding_start_date: "",
    carding_end_date: "",
    medical_clearance: false,
    approved_start_date: "",
    approved_end_date: "",
    medical_condition: "",
    food_allergy: "",
    drug_allergy: "",
    past_injury: "",
    medical_remarks: "",
    target_event: "",
    coach_ids: [],
  });

  // Load sports and coaches when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSports();
      loadCoaches();
    }
  }, [isOpen]);

  const loadSports = async () => {
    try {
      const token = localStorage.getItem("nysi_auth_token");
      const response = await axios.get<{ data: Sport[] }>(
        "http://localhost:8000/api/AMS/sports",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSports(response.data.data);
    } catch (error) {
      console.error("Error loading sports:", error);
    }
  };

  const loadCoaches = async () => {
    try {
      const token = localStorage.getItem("nysi_auth_token");
      const response = await axios.get<{ data: Coach[] }>(
        "http://localhost:8000/api/AMS/coaches",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCoaches(response.data.data);
    } catch (error) {
      console.error("Error loading coaches:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleCoachSelection = (coachId: string, selected: boolean) => {
    setFormData((prev) => ({
      ...prev,
      coach_ids: selected
        ? [...prev.coach_ids, coachId]
        : prev.coach_ids.filter((id) => id !== coachId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create the payload for the complete athlete creation
      const payload = {
        // Athlete fields
        sport_id: formData.sport_id,
        sportsync_id: formData.sportsync_id,
        athlete_name_abbr: formData.athlete_name_abbr,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,

        // Registry fields
        carding_status: formData.carding_status,
        athlete_notified_on: formData.athlete_notified_on,
        carding_start_date: formData.carding_start_date,
        carding_end_date: formData.carding_end_date,
        medical_clearance: formData.medical_clearance,
        approved_start_date: formData.approved_start_date,
        approved_end_date: formData.approved_end_date,

        // Medical fields
        medical_condition: formData.medical_condition || "",
        food_allergy: formData.food_allergy || "",
        drug_allergy: formData.drug_allergy || "",
        past_injury: formData.past_injury || "",
        medical_remarks: formData.medical_remarks || "",

        // Coach assignments
        coach_ids: formData.coach_ids,

        // Note: nutritionist_id is auto-assigned on backend based on logged-in user
      };

      // Choose the correct endpoint based on user role
      const isAdmin = user?.role === "ADMIN" || user?.role === "IT_ADMIN";
      const endpoint = isAdmin
        ? "http://localhost:8000/api/AMS/athletes/complete/admin"
        : "http://localhost:8000/api/AMS/athletes/complete";

      console.log("User info:", user);
      console.log("Is admin:", isAdmin);
      console.log("Using endpoint:", endpoint);
      console.log("JWT token:", token ? "Token present" : "No token found");
      console.log(
        "Token starts with:",
        token ? token.substring(0, 20) + "..." : "null",
      );

      await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      onSuccess("Athlete created successfully!");
      onClose();
      resetForm();
    } catch (error: any) {
      console.error("Error creating athlete:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to create athlete";
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sport_id: "",
      sportsync_id: "",
      athlete_name_abbr: "",
      gender: "",
      date_of_birth: "",
      carding_status: "",
      athlete_notified_on: "",
      carding_start_date: "",
      carding_end_date: "",
      medical_clearance: false,
      approved_start_date: "",
      approved_end_date: "",
      medical_condition: "",
      food_allergy: "",
      drug_allergy: "",
      past_injury: "",
      medical_remarks: "",
      target_event: "",
      coach_ids: [],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-black">
              Add New Athlete
            </h2>
            <p className="text-sm text-black mt-1">
              Complete the fields below to add a new athlete to your assigned
              list. Once added, you can manage their individual support plan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          <div className="px-6 py-6 space-y-8">
            {/* Athlete Profile Section */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">
                Athlete Profile
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="athlete_name_abbr"
                    value={formData.athlete_name_abbr}
                    onChange={handleInputChange}
                    placeholder="Athlete Abbr Name"
                    className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    SportSync ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="sportsync_id"
                    value={formData.sportsync_id}
                    onChange={handleInputChange}
                    placeholder="SportSync ID"
                    className="w-full px-3 py-2 placeholder:text-gray-400 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Sex <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sex</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Sport <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="sport_id"
                    value={formData.sport_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sport Field</option>
                    {sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.sport}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Coach Assigned <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto">
                    {coaches.map((coach) => (
                      <label
                        key={coach.id}
                        className={`flex items-center space-x-2 py-1 ${
                          formData.coach_ids.includes(coach.id)
                            ? "text-black"
                            : "text-gray-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.coach_ids.includes(coach.id)}
                          onChange={(e) =>
                            handleCoachSelection(coach.id, e.target.checked)
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          {coach.name} ({coach.sport_name})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Registry Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">
                Registry Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Carding Level <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="carding_status"
                    value={formData.carding_status}
                    onChange={handleInputChange}
                    placeholder="Carding Level"
                    className="w-full px-3 py-2 placeholder:text-gray-400 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Carding Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="carding_start_date"
                    value={formData.carding_start_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Carding End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="carding_end_date"
                    value={formData.carding_end_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Athlete Notified On <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="athlete_notified_on"
                    value={formData.athlete_notified_on}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Approved Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="approved_start_date"
                    value={formData.approved_start_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Approved End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="approved_end_date"
                    value={formData.approved_end_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-black mb-2">
                  Target Event
                </label>
                <input
                  type="text"
                  name="target_event"
                  value={formData.target_event}
                  onChange={handleInputChange}
                  placeholder="Next Target Event"
                  className="w-full px-3 py-2 border placeholder:text-gray-400 text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Medical Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">
                Medical Information
              </h3>

              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="medical_clearance"
                    checked={formData.medical_clearance}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-black">
                    Medical Clearance Required
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Medical Condition
                  </label>
                  <textarea
                    name="medical_condition"
                    value={formData.medical_condition}
                    onChange={handleInputChange}
                    placeholder="Medical conditions"
                    rows={3}
                    className="w-full px-3 py-2 placeholder:text-gray-400 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Food Allergy
                  </label>
                  <textarea
                    name="food_allergy"
                    value={formData.food_allergy}
                    onChange={handleInputChange}
                    placeholder="Food allergies"
                    rows={3}
                    className="w-full px-3 py-2 placeholder:text-gray-400 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Drug Allergy
                  </label>
                  <textarea
                    name="drug_allergy"
                    value={formData.drug_allergy}
                    onChange={handleInputChange}
                    placeholder="Drug allergies (optional)"
                    rows={3}
                    className="w-full px-3 py-2 placeholder:text-gray-400 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Past Injury
                  </label>
                  <textarea
                    name="past_injury"
                    value={formData.past_injury}
                    onChange={handleInputChange}
                    placeholder="Past injuries (optional)"
                    rows={3}
                    className="w-full px-3 py-2 placeholder:text-gray-400 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-2">
                    Medical Remarks
                  </label>
                  <textarea
                    name="medical_remarks"
                    value={formData.medical_remarks}
                    onChange={handleInputChange}
                    placeholder="Additional medical remarks (optional)"
                    rows={3}
                    className="w-full px-3 py-2 placeholder:text-gray-400 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-black hover:text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAthleteModal;
