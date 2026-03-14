// API utility functions for consultation components
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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

// Generic API call function (GET)
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
    // Return null for 404 (no data yet) so callers can handle it gracefully
    if (response.status === 404) {
      return null as T;
    }
    throw new ConsultationApiError(
      `HTTP error! status: ${response.status}`,
      response.status,
    );
  }

  const data = await response.json();
  return data;
}

// Generic PATCH call function
export async function apiPatch<T>(endpoint: string, body: object): Promise<T> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new ConsultationApiError("Authentication token not found", 401);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ConsultationApiError(
      `HTTP error! status: ${response.status}`,
      response.status,
    );
  }

  return response.json();
}

// Consultation lookup functions
export const consultationLookupApi = {
  // Get consultation types
  getConsultationTypes: async (): Promise<{ data: any[] }> => {
    return apiCall("/api/Consultation/lookups/consult-types");
  },
};

// Consultation-specific API functions
export const consultationApi = {
  // Get latest consultation for athlete
  getLatestConsultation: async (athleteId: string) => {
    return apiCall(
      `/api/Consultation/consultation-session/athlete/${athleteId}/latest`,
    );
  },

  // Get a specific consultation session by ID
  getConsultationById: async (sessionId: string) => {
    return apiCall(`/api/Consultation/consultation-session/${sessionId}`);
  },

  // Get all consultation sessions for an athlete
  getAllConsultations: async (athleteId: string) => {
    return apiCall(
      `/api/Consultation/consultation-session/athlete/${athleteId}/all`,
    );
  },

  // Get actionables for session
  getActionables: async (sessionId: string) => {
    return apiCall(`/api/Consultation/actionables/session/${sessionId}`);
  },

  // Get supplement dispensing for session
  getSupplementDispensing: async (sessionId: string) => {
    return apiCall(`/api/Consultation/supplement-dispensing/session/${sessionId}`);
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
    return apiCall(`/api/Consultation/sessions/${sessionId}/meal-log`);
  },

  // Get medical history for session
  getMedicalHistory: async (sessionId: string) => {
    return apiCall(`/api/Consultation/medical-history/${sessionId}`);
  },

  // Get nutrition requirements for session
  getNutritionRequirements: async (sessionId: string) => {
    return apiCall(`/api/Consultation/sessions/${sessionId}/nutrition-requirements`);
  },

  // Clear the scheduled booking flag on a session
  clearScheduledBooking: async (sessionId: string) => {
    return apiPatch(`/api/Consultation/consultation-session/${sessionId}`, {
      is_scheduled_booking: false,
    });
  },
};
