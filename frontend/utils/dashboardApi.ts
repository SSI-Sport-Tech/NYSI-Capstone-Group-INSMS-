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
  location?: string;
  duration?: number;
  status?: "scheduled" | "completed" | "cancelled" | "in-progress";
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
  name: string;
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
  // Get all consultation sessions for a date range
  getConsultationSessions: async (
    startDate?: string,
    endDate?: string,
  ): Promise<{ data: ConsultationSession[] }> => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    return apiCall(
      `/api/Consultation/sessions${params.toString() ? `?${params.toString()}` : ""}`,
    );
  },

  // Get today's sessions
  getTodaySessions: async (): Promise<{ data: ConsultationSession[] }> => {
    const today = new Date().toISOString().split("T")[0];
    return dashboardApi.getConsultationSessions(today, today);
  },

  // Get upcoming sessions (next 7 days)
  getUpcomingSessions: async (): Promise<{ data: ConsultationSession[] }> => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return dashboardApi.getConsultationSessions(
      today.toISOString().split("T")[0],
      nextWeek.toISOString().split("T")[0],
    );
  },

  // Get all athletes for booking
  getAthletes: async (): Promise<{ data: Athlete[] }> => {
    return apiCall("/api/AMS/athletes");
  },

  // Get consultation types
  getConsultationTypes: async (): Promise<{ data: ConsultationType[] }> => {
    return apiCall("/api/Consultation/lookups/consult-types");
  },

  // Create new consultation session
  createConsultationSession: async (sessionData: {
    athlete_id: string;
    type_of_consult_id: string;
    date_of_consult: string;
    consultation_objective?: string;
    time_slot?: string;
    location?: string;
  }): Promise<{ data: ConsultationSession }> => {
    return apiCall("/api/Consultation/consultation-update", {
      method: "POST",
      body: JSON.stringify(sessionData),
    });
  },

  // Update consultation session
  updateConsultationSession: async (
    sessionId: string,
    updates: Partial<ConsultationSession>,
  ): Promise<{ data: ConsultationSession }> => {
    return apiCall(`/api/Consultation/consultation-update/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  // Cancel consultation session
  cancelConsultationSession: async (sessionId: string): Promise<void> => {
    return apiCall(`/api/Consultation/consultation-update/${sessionId}`, {
      method: "DELETE",
    });
  },

  // Get user's sessions for a specific date
  getUserSessions: async (
    date: string,
  ): Promise<{ data: ConsultationSession[] }> => {
    return apiCall(`/api/Consultation/user-sessions?date=${date}`);
  },

  // Get session count statistics
  getSessionStats: async (): Promise<{
    data: {
      todayTotal: number;
      todayCompleted: number;
      activeAthletes: number;
      newAthletes: number;
    };
  }> => {
    return apiCall("/api/Consultation/stats");
  },
};
