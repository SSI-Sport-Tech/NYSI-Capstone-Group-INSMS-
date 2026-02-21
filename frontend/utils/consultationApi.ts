// API utility functions for consultation components
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiError {
  message: string;
  status: number;
}

export class ConsultationApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ConsultationApiError";
  }
}

// Generic API call function
export async function apiCall<T>(endpoint: string): Promise<T> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new ConsultationApiError("Authentication token not found", 401);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new ConsultationApiError(
      `HTTP error! status: ${response.status}`,
      response.status,
    );
  }

  const data = await response.json();
  return data;
}

// Consultation-specific API functions
export const consultationApi = {
  // Get latest consultation for athlete
  getLatestConsultation: async (athleteId: string) => {
    return apiCall(
      `/api/Consultation/consultation-update/athlete/${athleteId}/latest`,
    );
  },

  // Get open items for session
  getOpenItems: async (sessionId: string) => {
    return apiCall(`/api/Consultation/open-items/session/${sessionId}`);
  },

  // Get prescriptions for session
  getPrescriptions: async (sessionId: string) => {
    return apiCall(`/api/Consultation/prescription/session/${sessionId}`);
  },

  // Get anthropometry for session
  getAnthropometry: async (sessionId: string) => {
    return apiCall(`/api/Consultation/sessions/${sessionId}/anthropometry`);
  },

  // Get training schedule for session
  getTrainingSchedule: async (sessionId: string) => {
    return apiCall(`/api/Consultation/sessions/${sessionId}/training-schedule`);
  },

  // Get meal logs for session
  getMealLogs: async (sessionId: string) => {
    return apiCall(`/api/Consultation/sessions/${sessionId}/meal-logs`);
  },

  // Get medical history for session
  getMedicalHistory: async (sessionId: string) => {
    return apiCall(`/api/Consultation/sessions/${sessionId}/medical-history`);
  },

  // Get adherences for session
  getAdherences: async (sessionId: string) => {
    return apiCall(`/api/Consultation/sessions/${sessionId}/adherences`);
  },
};
