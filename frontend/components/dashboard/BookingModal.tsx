"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, User, MapPin, FileText, School } from "lucide-react";
import { dashboardApi, Athlete, ConsultationType, ConsultationSession } from "@/utils/dashboardApi";
import { consultationLookupApi } from "@/utils/consultationApi";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated: (booking: ConsultationSession) => void;
  selectedDate?: Date;
  existingSession?: ConsultationSession | null;
}

export default function BookingModal({
  isOpen,
  onClose,
  onBookingCreated,
  selectedDate,
  existingSession,
}: BookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([]);
  const [consultationObjectives, setConsultationObjectives] = useState<{ id: string; consultation_objective: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    athlete_id: "",
    type_of_consult_id: "",
    date_of_consult: "",
    time_of_consult: "",
    venue: "",
    consultation_objective_id: "",
    duration: 60,
    ssp: false,
  });

  // Time slot options
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00"
  ];

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingSession) {
        // Edit mode - populate with existing session data
        setFormData({
          athlete_id: existingSession.athlete_id,
          type_of_consult_id: existingSession.type_of_consult || "",
          date_of_consult: existingSession.date_of_consult.split('T')[0],
          time_of_consult: existingSession.time_slot || "",
          venue: existingSession.location || "",
          consultation_objective_id: "",
          duration: existingSession.duration || 60,
          ssp: (existingSession as any).ssp ?? false,
        });
      } else if (selectedDate) {
        // New booking mode - use selected date (local date, not UTC)
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const d = String(selectedDate.getDate()).padStart(2, "0");
        setFormData(prev => ({
          ...prev,
          date_of_consult: `${y}-${m}-${d}`,
        }));
      }

      // Load reference data
      loadReferenceData();
    } else {
      // Reset form when modal closes
      setFormData({
        athlete_id: "",
        type_of_consult_id: "",
        date_of_consult: "",
        time_of_consult: "",
        venue: "",
        consultation_objective_id: "",
        duration: 60,
        ssp: false,
      });
      setErrors({});
    }
  }, [isOpen, selectedDate, existingSession]);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const [athletesResponse, typesResponse, objectivesResponse] = await Promise.all([
        dashboardApi.getAthletes(),
        consultationLookupApi.getConsultationTypes(),
        consultationLookupApi.getConsultationObjectives(),
      ]);

      setAthletes(athletesResponse.data || []);
      setConsultationTypes(typesResponse.data || []);
      setConsultationObjectives(objectivesResponse.data || []);
    } catch (error) {
      console.error("Error loading reference data:", error);
      setErrors({ general: "Failed to load form data. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.athlete_id) {
      newErrors.athlete_id = "Please select an athlete";
    } else {
      // Validate UUID format for athlete_id
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.athlete_id)) {
        newErrors.athlete_id = "Invalid athlete selection";
      }
    }

    if (!formData.type_of_consult_id) {
      newErrors.type_of_consult_id = "Please select a consultation type";
    } else {
      // Validate UUID format for type_of_consult_id
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.type_of_consult_id)) {
        newErrors.type_of_consult_id = "Invalid consultation type selection";
      }
    }

    if (!formData.date_of_consult) {
      newErrors.date_of_consult = "Please select a date";
    }
    if (!formData.time_of_consult) {
      newErrors.time_of_consult = "Please select a time slot";
    }

    // Check if the selected date is in the past (only when both date and time are set)
    if (formData.date_of_consult && formData.time_of_consult) {
      const selectedDateTime = new Date(`${formData.date_of_consult}T${formData.time_of_consult}`);
      const now = new Date();
      if (!isNaN(selectedDateTime.getTime()) && selectedDateTime < now) {
        newErrors.date_of_consult = "Cannot schedule consultation in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      const sessionData = {
        athlete_id: formData.athlete_id,
        type_of_consult_id: formData.type_of_consult_id,
        ...(formData.date_of_consult && { date_of_consult: formData.date_of_consult }),
        ...(formData.time_of_consult && { time_of_consult: formData.time_of_consult }),
        ...(formData.venue?.trim() && { venue: formData.venue.trim() }),
        ...(formData.consultation_objective_id && { consultation_objective_id: formData.consultation_objective_id }),
        ssp: formData.ssp,
        // Mark sessions created from the dashboard so ConsultationView can detect them
        ...(!existingSession && { is_scheduled_booking: true }),
      };

      console.log('Submitting session data:', sessionData);

      let response;
      if (existingSession) {
        // Update existing session
        response = await dashboardApi.updateConsultationSession(
          existingSession.id,
          sessionData
        );
      } else {
        // Create new session
        response = await dashboardApi.createConsultationSession(sessionData);
      }

      onBookingCreated(response.data);
      onClose();
    } catch (error) {
      console.error("Error saving consultation:", error);

      // Handle specific validation errors
      const err = error instanceof Error ? error : new Error(String(error));
      const axiosError = error as { response?: { status?: number; data?: { message?: string; error?: string } } };

      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data?.message || axiosError.response.data?.error || "Validation failed";
        setErrors({ general: `Validation error: ${errorMessage}` });
      } else if (err.message?.includes('DashboardApiError')) {
        setErrors({ general: `API Error: ${err.message}` });
      } else {
        setErrors({
          general: err.message || "Failed to save consultation. Please try again."
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {existingSession ? "Edit Consultation" : "Schedule New Consultation"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {errors.general}
            </div>
          )}

          {/* Athlete Selection */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              <span>Athlete *</span>
            </label>
            <select
              value={formData.athlete_id}
              onChange={(e) => handleInputChange("athlete_id", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.athlete_id ? "border-red-500" : "border-gray-300"
                }`}
              disabled={loading}
            >
              <option value="">Select an athlete</option>
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.initials || `${athlete.first_name} ${athlete.last_name}`}
                  {athlete.sport_name && ` (${athlete.sport_name})`}
                </option>
              ))}
            </select>
            {errors.athlete_id && (
              <p className="mt-1 text-sm text-red-600">{errors.athlete_id}</p>
            )}
          </div>

          {/* Consultation Type */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              <span>Consultation Type *</span>
            </label>
            <select
              value={formData.type_of_consult_id}
              onChange={(e) => handleInputChange("type_of_consult_id", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.type_of_consult_id ? "border-red-500" : "border-gray-300"
                }`}
              disabled={loading}
            >
              <option value="">Select consultation type</option>
              {consultationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.type_of_consult || type.name}
                  {type.duration && ` (${type.duration} min)`}
                </option>
              ))}
            </select>
            {errors.type_of_consult_id && (
              <p className="mt-1 text-sm text-red-600">{errors.type_of_consult_id}</p>
            )}
          </div>

          {/* Support SSP */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <School className="w-4 h-4" />
              <span>Support SSP *</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleInputChange("ssp", true)}
                className={`flex-1 py-2 rounded-lg border ${formData.ssp ? "bg-green-600 text-white border-green-600" : "border-gray-300"
                  }`}
              >
                Yes
              </button>

              <button
                type="button"
                onClick={() => handleInputChange("ssp", false)}
                className={`flex-1 py-2 rounded-lg border ${!formData.ssp ? "bg-gray-600 text-white border-gray-600" : "border-gray-300"
                  }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4" />
                <span>Date *</span>
              </label>
              <input
                type="date"
                value={formData.date_of_consult}
                onChange={(e) => handleInputChange("date_of_consult", e.target.value)}
                min={(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; })()}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.date_of_consult ? "border-red-500" : "border-gray-300"
                  }`}
                disabled={loading}
              />
              {errors.date_of_consult && (
                <p className="mt-1 text-sm text-red-600">{errors.date_of_consult}</p>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4" />
                <span>Time *</span>
              </label>
              <select
                value={formData.time_of_consult}
                onChange={(e) => handleInputChange("time_of_consult", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.time_of_consult ? "border-red-500" : "border-gray-300"
                  }`}
                disabled={loading}
              >
                <option value="">Select time</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              {errors.time_of_consult && (
                <p className="mt-1 text-sm text-red-600">{errors.time_of_consult}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              <span>Location</span>
            </label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => handleInputChange("venue", e.target.value)}
              placeholder="Enter location"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Consultation Objective */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              <span>Objective</span>
            </label>
            <select
              value={formData.consultation_objective_id}
              onChange={(e) => handleInputChange("consultation_objective_id", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Select objective...</option>
              {consultationObjectives.map((o) => (
                <option key={o.id} value={o.id}>{o.consultation_objective}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading}
            >
              {loading ? "Saving..." : existingSession ? "Update" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}