import React, { useState, useEffect } from "react";
import { X, Plus, AlertCircle } from "lucide-react";
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

interface Nutritionist {
  id: string;
  name: string;
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
  dietary_restriction: string;

  // Sport & event fields
  ethnicity: string;
  sport_start_date: string;
  target_event: string;

  // Nutritionist assignment (admin only)
  nutritionist_id: string;

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
  const [nutritionists, setNutritionists] = useState<Nutritionist[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Inline create sport
  const [showAddSportForm, setShowAddSportForm] = useState(false);
  const [newSportName, setNewSportName] = useState("");
  const [addingSport, setAddingSport] = useState(false);

  // Inline create coach
  const [showAddCoachForm, setShowAddCoachForm] = useState(false);
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachSportId, setNewCoachSportId] = useState("");
  const [addingCoach, setAddingCoach] = useState(false);

  // Check if current user is admin
  const isAdmin = user?.role === "ADMIN" || user?.role === "IT_ADMIN";

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
    dietary_restriction: "",
    ethnicity: "",
    sport_start_date: "",
    target_event: "",
    nutritionist_id: "",
    coach_ids: [],
  });

  // Load sports and coaches when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSports();
      loadCoaches();

      // Only load nutritionists for admin users
      if (isAdmin) {
        loadNutritionists();
      }
    }
  }, [isOpen, isAdmin]);

  // Validate dates whenever they change
  useEffect(() => {
    validateDates();
  }, [
    formData.carding_start_date,
    formData.carding_end_date,
    formData.approved_start_date,
    formData.approved_end_date,
  ]);

  const validateDates = () => {
    const errors: string[] = [];

    // Validate carding dates
    if (formData.carding_start_date && formData.carding_end_date) {
      const cardingStart = new Date(formData.carding_start_date);
      const cardingEnd = new Date(formData.carding_end_date);

      if (cardingEnd < cardingStart) {
        errors.push("Carding End Date must be after or equal to Carding Start Date");
      }
    }

    // Validate approved dates
    if (formData.approved_start_date && formData.approved_end_date) {
      const approvedStart = new Date(formData.approved_start_date);
      const approvedEnd = new Date(formData.approved_end_date);

      if (approvedEnd < approvedStart) {
        errors.push("Approved End Date must be after or equal to Approved Start Date");
      }
    }

    setValidationErrors(errors);
  };

  const loadSports = async () => {
    try {
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
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

  const loadNutritionists = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get<{ data: Nutritionist[] }>(
        "http://localhost:8000/api/AMS/nutritionists/nutritionists",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNutritionists(response.data.data);
    } catch (error) {
      console.error("Error loading nutritionists:", error);
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

  const handleAddSport = async () => {
    if (!newSportName.trim()) return;
    setAddingSport(true);
    try {
      const authToken = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/api/AMS/sports",
        { sport: newSportName.trim() },
        { headers: { Authorization: `Bearer ${authToken}` } },
      );
      const created = response.data.data;
      await loadSports();
      setFormData((prev) => ({ ...prev, sport_id: created.id }));
      setShowAddSportForm(false);
      setNewSportName("");
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to create sport";
      onError(msg);
    } finally {
      setAddingSport(false);
    }
  };

  const handleAddCoach = async () => {
    if (!newCoachName.trim() || !newCoachSportId) return;
    setAddingCoach(true);
    try {
      const authToken = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/api/AMS/coaches",
        { name: newCoachName.trim(), sport_id: newCoachSportId },
        { headers: { Authorization: `Bearer ${authToken}` } },
      );
      const created = response.data.data;
      await loadCoaches();
      setFormData((prev) => ({
        ...prev,
        coach_ids: [...prev.coach_ids, created.id],
      }));
      setShowAddCoachForm(false);
      setNewCoachName("");
      setNewCoachSportId("");
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to create coach";
      onError(msg);
    } finally {
      setAddingCoach(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for validation errors
    if (validationErrors.length > 0) {
      onError(validationErrors.join(". "));
      return;
    }

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
        dietary_restriction: formData.dietary_restriction || "",

        // Sport & event fields
        ...(formData.ethnicity && { ethnicity: formData.ethnicity }),
        ...(formData.sport_start_date && { sport_start_date: Number(formData.sport_start_date) }),
        ...(formData.target_event && { target_event: formData.target_event }),

        // Coach assignments
        coach_ids: formData.coach_ids,

        // Nutritionist assignment (for admin users only)
        ...(isAdmin &&
          formData.nutritionist_id && {
          nutritionist_id: formData.nutritionist_id,
        }),
      };

      // Choose the correct endpoint based on user role
      const endpoint = isAdmin
        ? "http://localhost:8000/api/AMS/athletes/complete/admin"
        : "http://localhost:8000/api/AMS/athletes/complete";

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
      const data = error.response?.data;

      // Check for database constraint violations
      if (error.response?.status === 400 && data?.error) {
        if (data.error.includes("chk_carding_dates")) {
          onError("Carding End Date must be after or equal to Carding Start Date");
        } else if (data.error.includes("chk_approved_dates")) {
          onError("Approved End Date must be after or equal to Approved Start Date");
        } else {
          const errorMessage =
            data?.details?.[0]?.message ||
            data?.error ||
            data?.message ||
            "Failed to create athlete";
          onError(errorMessage);
        }
      } else {
        const errorMessage =
          data?.details?.[0]?.message ||
          data?.error ||
          data?.message ||
          "Failed to create athlete";
        onError(errorMessage);
      }
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
      dietary_restriction: "",
      ethnicity: "",
      sport_start_date: "",
      target_event: "",
      nutritionist_id: "",
      coach_ids: [],
    });
    setValidationErrors([]);
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

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 mb-1">
                  Please fix the following errors:
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

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
                {/* ... (keep all existing fields) ... */}
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
                    Ethnicity
                  </label>
                  <input
                    type="text"
                    name="ethnicity"
                    value={formData.ethnicity}
                    onChange={handleInputChange}
                    placeholder="e.g. Chinese, Malay, Indian"
                    className="w-full px-3 py-2 placeholder:text-gray-400 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Age Started Sport
                  </label>
                  <input
                    type="number"
                    name="sport_start_date"
                    value={formData.sport_start_date}
                    onChange={handleInputChange}
                    placeholder="e.g. 8"
                    min={1}
                    max={99}
                    className="w-full px-3 py-2 placeholder:text-gray-400 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Sport selection with inline add - keep existing code */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Sport <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="sport_id"
                      value={formData.sport_id}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select sport</option>
                      {sports.map((sport) => (
                        <option key={sport.id} value={sport.id}>
                          {sport.sport}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddSportForm((v) => !v)}
                      className="px-3 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New
                    </button>
                  </div>
                  {showAddSportForm && (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-gray-600">New Sport</p>
                      <input
                        type="text"
                        value={newSportName}
                        onChange={(e) => setNewSportName(e.target.value)}
                        placeholder="Sport name"
                        className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSport())}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => { setShowAddSportForm(false); setNewSportName(""); }}
                          className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddSport}
                          disabled={addingSport || !newSportName.trim()}
                          className="px-3 py-1.5 text-xs text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          {addingSport ? "Adding..." : "Add Sport"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nutritionist Assignment - Only show for admins */}
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Assign Nutritionist
                    </label>
                    <select
                      name="nutritionist_id"
                      value={formData.nutritionist_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Nutritionist (Optional)</option>
                      {nutritionists.map((nutritionist) => (
                        <option key={nutritionist.id} value={nutritionist.id}>
                          {nutritionist.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Auto-assignment info for nutritionists */}
                {!isAdmin && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 This athlete will be automatically assigned to you as
                      their nutritionist.
                    </p>
                  </div>
                )}

                {/* Coach selection - keep existing code */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Coach Assigned
                  </label>
                  <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto">
                    {coaches.length === 0 ? (
                      <p className="text-sm text-gray-400 py-1 px-1">No coaches available</p>
                    ) : (
                      coaches.map((coach) => (
                        <label
                          key={coach.id}
                          className={`flex items-center space-x-2 py-1 ${formData.coach_ids.includes(coach.id)
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
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCoachForm((v) => !v);
                      setNewCoachSportId(formData.sport_id || "");
                    }}
                    className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add new coach
                  </button>
                  {showAddCoachForm && (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-gray-600">New Coach</p>
                      <input
                        type="text"
                        value={newCoachName}
                        onChange={(e) => setNewCoachName(e.target.value)}
                        placeholder="Coach name"
                        className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <select
                        value={newCoachSportId}
                        onChange={(e) => setNewCoachSportId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-400 valid:text-black"
                      >
                        <option value="">Select sport for coach</option>
                        {sports.map((sport) => (
                          <option key={sport.id} value={sport.id}>
                            {sport.sport}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => { setShowAddCoachForm(false); setNewCoachName(""); setNewCoachSportId(""); }}
                          className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddCoach}
                          disabled={addingCoach || !newCoachName.trim() || !newCoachSportId}
                          className="px-3 py-1.5 text-xs text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          {addingCoach ? "Adding..." : "Add Coach"}
                        </button>
                      </div>
                    </div>
                  )}
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
                    Athlete Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="carding_status"
                    value={formData.carding_status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-gray-400 valid:text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
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
                    className={`w-full px-3 py-2 text-gray-400 valid:text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.some(e => e.includes("Carding"))
                        ? "border-red-500"
                        : "border-gray-300"
                      }`}
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
                    min={formData.carding_start_date || undefined}
                    className={`w-full px-3 py-2 text-gray-400 valid:text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.some(e => e.includes("Carding"))
                        ? "border-red-500"
                        : "border-gray-300"
                      }`}
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
                    className={`w-full px-3 py-2 text-gray-400 valid:text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.some(e => e.includes("Approved"))
                        ? "border-red-500"
                        : "border-gray-300"
                      }`}
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
                    min={formData.approved_start_date || undefined}
                    className={`w-full px-3 py-2 text-gray-400 valid:text-black border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.some(e => e.includes("Approved"))
                        ? "border-red-500"
                        : "border-gray-300"
                      }`}
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

            {/* Medical Information Section - keep existing code */}
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-2">
                    Dietary Restriction
                  </label>
                  <textarea
                    name="dietary_restriction"
                    value={formData.dietary_restriction}
                    onChange={handleInputChange}
                    placeholder="e.g. Vegetarian, Halal, Gluten-free (optional)"
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
              disabled={loading || validationErrors.length > 0}
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