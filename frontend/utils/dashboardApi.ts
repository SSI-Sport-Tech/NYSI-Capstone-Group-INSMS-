// API utility functions for dashboard components
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface ApiError {
  message: string;
  status: number;
}

export class DashboardApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "DashboardApiError";
  }
}

export interface ConsultationSession {
  id: string;
  athlete_id: string;
  athlete_name_abbr: string;
  date_of_consult: string;
  date_of_next_follow_up: string;
  nutritionist_name: string;
  consultation_objective: string;
  type_of_consult: string;
  time_slot?: string;
  time_of_consult?: string;
  venue?: string;
  location?: string;
  duration?: number;
  status?: "scheduled" | "completed" | "cancelled" | "in-progress";
  is_scheduled_booking?: boolean;
}

export interface Athlete {
  id: string;
  athlete_name_abbr: string;
  first_name: string;
  last_name: string;
  sport_name?: string;
}

export interface ConsultationType {
  id: string;
  /** Field name returned by the API */
  type_of_consult?: string;
  /** Legacy alias — may not be present */
  name?: string;
  description?: string;
  duration?: number;
}

// Generic API call function
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new DashboardApiError("Authentication token not found", 401);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If parsing fails, use the default message
    }
    throw new DashboardApiError(errorMessage, response.status);
  }

  const data = await response.json();
  return data;
}

// Dashboard-specific API functions
export const dashboardApi = {
  // Get all athletes for booking (this endpoint exists)
  getAthletes: async (): Promise<{ data: Athlete[] }> => {
    return apiCall("/api/AMS/athletes");
  },

  // Get consultation types (use shared consultation API)
  getConsultationTypes: async (): Promise<{ data: ConsultationType[] }> => {
    // Import here to avoid circular dependencies
    const { consultationLookupApi } = await import('./consultationApi');
    return consultationLookupApi.getConsultationTypes();
  },

  // Create new consultation session (this endpoint exists)
  createConsultationSession: async (sessionData: {
    athlete_id: string;
    type_of_consult_id: string;
    date_of_consult?: string;
    consultation_objective?: string;
    time_of_consult?: string;
    venue?: string;
    is_scheduled_booking?: boolean;
  }): Promise<{ data: ConsultationSession }> => {
    return apiCall("/api/Consultation/consultation-update", {
      method: "POST",
      body: JSON.stringify(sessionData),
    });
  },

  // Update consultation session (this endpoint exists)
  updateConsultationSession: async (
    sessionId: string,
    updates: Partial<ConsultationSession>
  ): Promise<{ data: ConsultationSession }> => {
    return apiCall(`/api/Consultation/consultation-update/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  // These endpoints don't exist in the backend yet - return empty data
  getConsultationSessions: async (
    startDate?: string,
    endDate?: string
  ): Promise<{ data: ConsultationSession[] }> => {
    console.warn("getConsultationSessions endpoint not implemented in backend");
    return { data: [] };
  },

  getTodaySessions: async (): Promise<{ data: ConsultationSession[] }> => {
    console.warn("getTodaySessions endpoint not implemented in backend");
    return { data: [] };
  },

  getUpcomingSessions: async (): Promise<{ data: ConsultationSession[] }> => {
    return apiCall("/api/Consultation/consultation-update/upcoming");
  },

  cancelConsultationSession: async (sessionId: string): Promise<void> => {
    console.warn("cancelConsultationSession endpoint not implemented in backend");
    throw new DashboardApiError("Cancellation not yet available", 501);
  },

  getUserSessions: async (date: string): Promise<{ data: ConsultationSession[] }> => {
    console.warn("getUserSessions endpoint not implemented in backend");
    return { data: [] };
  },

  getSessionStats: async (): Promise<{
    data: {
      todayTotal: number;
      todayCompleted: number;
      activeAthletes: number;
      newAthletes: number;
    };
  }> => {
    console.warn("getSessionStats endpoint not implemented in backend");
    return {
      data: {
        todayTotal: 0,
        todayCompleted: 0,
        activeAthletes: 0,
        newAthletes: 0,
      },
    };
  },
};
