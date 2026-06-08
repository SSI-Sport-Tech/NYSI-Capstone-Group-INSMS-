"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, User, MapPin, FileText , School} from "lucide-react";
import { dashboardApi, Nutritionist, ScheduleType, NutritionistScheduleSession } from "@/utils/dashboardApi";
import { nutritionistScheduleLookupApi } from "@/utils/nutritionistScheduleApi";

interface NutritionistScheduleProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleCreated: (schedule: NutritionistScheduleSession) => void; 
  selectedDate?: Date;
  existingSchedule?: NutritionistScheduleSession | null;
}

export default function NutritionistSchedule({
  isOpen,
  onClose,
  onScheduleCreated,
  selectedDate,
  existingSchedule,
}: NutritionistScheduleProps) {
  const [loading, setLoading] = useState(false);
  const [nutritionist, setNutritionist] = useState<Nutritionist[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    nutritionist_id: "",
    schedule_type_id: "",
    schedule_date: "",
    start_time: "",
    end_time: "",
    remarks: "",
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
      if (existingSchedule) {
        // Edit mode - populate with existing schedule data
        setFormData({
          nutritionist_id: existingSchedule.nutritionist_id || "",
          schedule_type_id: existingSchedule.schedule_type_id || "",
          schedule_date: existingSchedule.schedule_date || "",
          start_time: existingSchedule.start_time?.slice(0, 5) || "",
          end_time: existingSchedule.end_time?.slice(0, 5) || "",
          remarks: existingSchedule.remarks || "",
        });
      } else if (selectedDate) {
        // New schedule mode - use selected date (local date, not UTC)
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const d = String(selectedDate.getDate()).padStart(2, "0");
        setFormData(prev => ({
          ...prev,
          schedule_date: `${y}-${m}-${d}`,
        }));
      }
      
      // Load reference data
      loadReferenceData();
    } else {
      // Reset form when modal closes
      setFormData({
        nutritionist_id: "",
        schedule_type_id: "",
        schedule_date: "",
        start_time: "",
        end_time: "",
        remarks: "",
      });
      setErrors({});
    }
  }, [isOpen, selectedDate, existingSchedule]);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const [nutritionistsResponse, typesResponse] = await Promise.all([
        dashboardApi.getNutritionists(),
        nutritionistScheduleLookupApi.getScheduleTypes(),
      ]);

      setNutritionist(nutritionistsResponse.data || []);
      setScheduleTypes(typesResponse.data || []);
    } catch (error) {
      console.error("Error loading reference data:", error);
      setErrors({ general: "Failed to load form data. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nutritionist_id) {
      newErrors.nutritionist_id = "Please select a nutritionist";
    } else {
      // Validate UUID format for nutritionist_id
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.nutritionist_id)) {
        newErrors.nutritionist_id = "Invalid nutritionist selection";
      }
    }

    if (!formData.schedule_type_id) {
      newErrors.schedule_type_id = "Please select a schedule type";
    }

    if (!formData.schedule_date) {
      newErrors.schedule_date = "Please select a date";
    }

    if (!formData.start_time) {
      newErrors.start_time = "Please select a start time";
    }

    if (!formData.end_time) {
      newErrors.end_time = "Please select an end time";
    }

    // Check if the selected date is in the past (only when both date and time are set)
    if (formData.schedule_date && formData.start_time) {
      const selectedDateTime = new Date(`${formData.schedule_date}T${formData.start_time}`);
      const now = new Date();
      if (!isNaN(selectedDateTime.getTime()) && selectedDateTime < now) {
        newErrors.schedule_date = "Cannot schedule nutritionist schedule in the past";
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
        nutritionist_id: formData.nutritionist_id,
        schedule_type_id: formData.schedule_type_id,
        schedule_date: formData.schedule_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        remarks: formData.remarks,
      };

      console.log('Submitting session data:', sessionData);

      let response;
      if (existingSchedule) {
        // Update existing schedule
        response = await dashboardApi.updateNutritionistSchedule(
          existingSchedule.id,
          sessionData
        );
      } else {
        // Create new session
        response = await dashboardApi.createNutritionistSchedule(sessionData);
      }

      onScheduleCreated(response.data);
      onClose();
    } catch (error) {
      console.error("Error saving nutritionist schedule:", error);
      
      // Handle specific validation errors
      // const err = error instanceof Error ? error : new Error(String(error));
      const err = error as any;
      console.log("FULL ZOD ERROR:", err?.response?.data?.errors || err?.response?.data || err);
      const axiosError = error as { response?: { status?: number; data?: { message?: string; error?: string } } };
      
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data?.message || axiosError.response.data?.error || "Validation failed";
        setErrors({ general: `Validation error: ${errorMessage}` });
      } else if (err.message?.includes('DashboardApiError')) {
        setErrors({ general: `API Error: ${err.message}` });
      } else {
        setErrors({ 
          general: err.message || "Failed to save nutritionist schedule. Please try again." 
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
            {existingSchedule ? "Edit Nutritionist Schedule" : "Schedule New Nutritionist Schedule"}
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

          {/* Nutritionist Selection */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              <span>Nutritionist *</span>
            </label>
            <select
              value={formData.nutritionist_id}
              onChange={(e) => handleInputChange("nutritionist_id", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.nutritionist_id ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading}
            >
              <option value="">Select a nutritionist</option>
              {nutritionist.map((nutritionists) => (
                <option key={nutritionists.id} value={nutritionists.id}>
                  {nutritionists.name}
                </option>
              ))}
            </select>
            {errors.nutritionist_id && (
              <p className="mt-1 text-sm text-red-600">{errors.nutritionist_id}</p>
            )}
          </div>

          {/* Schedule Type */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              <span>Schedule Type *</span>
            </label>
            <select
              value={formData.schedule_type_id}
              onChange={(e) => handleInputChange("schedule_type_id", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.schedule_type_id ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading}
            >
              <option value="">Select schedule type</option>
              {scheduleTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.schedule_type}
                </option>
              ))}
            </select>
            {errors.schedule_type_id && (
              <p className="mt-1 text-sm text-red-600">{errors.schedule_type_id}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Date *</span>
            </label>
            <input
              type="date"
              value={formData.schedule_date}
              onChange={(e) => handleInputChange("schedule_date", e.target.value)}
              min={(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; })()}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.schedule_date ? "border-red-500" : "border-gray-300"
              }`}
              disabled={loading}
            />
            {errors.schedule_date && (
              <p className="mt-1 text-sm text-red-600">{errors.schedule_date}</p>
            )}
          </div>

          {/* Start Time and End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4" />
                <span>Start Time *</span>
              </label>
              <select
                value={formData.start_time}
                onChange={(e) => handleInputChange("start_time", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.start_time ? "border-red-500" : "border-gray-300"
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
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4" />
                <span>End Time *</span>
              </label>
              <select
                value={formData.end_time}
                onChange={(e) => handleInputChange("end_time", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.end_time ? "border-red-500" : "border-gray-300"
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
              {errors.end_time && (
                <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>
              )}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              <span>Remarks</span>
            </label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              placeholder="Enter remarks"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
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
              {loading ? "Saving..." : existingSchedule ? "Update" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}