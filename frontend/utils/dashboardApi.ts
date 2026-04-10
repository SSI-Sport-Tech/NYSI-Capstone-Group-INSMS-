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
  nutritionist_id?: string;
  nutritionist_name: string;
  date_of_consult: string;
  date_of_next_follow_up: string;
  consultation_objective: string;
  type_of_consult: string;
  time_slot?: string;
  time_of_consult?: string;
  venue?: string;
  location?: string;
  duration?: number;
  status?: "scheduled" | "expired" | "completed" | "cancelled";
  is_scheduled_booking?: boolean;
}

export interface Athlete {
  id: string;
  athlete_name_abbr: string;
  first_name: string;
  last_name: string;
  sport_name?: string;
}

export interface AssignedAthlete {
  id: string;
  athlete_name_abbr: string;
  sportsync_id: string;
  sport_name?: string;
  is_pinned?: boolean;
  is_active?: boolean;
  start_date?: string;
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

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

  getMyAthletes: async (): Promise<{ data: AssignedAthlete[] }> => {
    return apiCall("/api/AMS/nutritionists/my-athletes");
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
    return apiCall("/api/Consultation/consultation-session", {
      method: "POST",
      body: JSON.stringify(sessionData),
    });
  },

  // Update consultation session (this endpoint exists)
  updateConsultationSession: async (
    sessionId: string,
    updates: Partial<ConsultationSession>
  ): Promise<{ data: ConsultationSession }> => {
    return apiCall(`/api/Consultation/consultation-session/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  getConsultationSessions: async (
    startDate?: string,
    endDate?: string
  ): Promise<{ data: ConsultationSession[] }> => {
    if (!startDate || !endDate) return { data: [] };
    return apiCall(`/api/Consultation/consultation-session/range?from=${startDate}&to=${endDate}`);
  },

  getTodaySessions: async (date?: string): Promise<{ data: ConsultationSession[] }> => {
    const query = date ? `?date=${date}` : "";
    return apiCall(`/api/Consultation/consultation-session/today${query}`);
  },

  updateSessionStatus: async (
    sessionId: string,
    status: "scheduled" | "completed" | "cancelled"
  ): Promise<{ data: ConsultationSession }> => {
    return apiCall(`/api/Consultation/consultation-session/${sessionId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  getUpcomingSessions: async (): Promise<{ data: ConsultationSession[] }> => {
    return apiCall("/api/Consultation/consultation-session/upcoming");
  },

  cancelConsultationSession: async (sessionId: string): Promise<void> => {
    await apiCall(`/api/Consultation/consultation-session/${sessionId}`, {
      method: "DELETE",
    });
  },

  getUserSessions: async (_date: string): Promise<{ data: ConsultationSession[] }> => {
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
    const today = toDateStr(new Date());
    const [todayRes, athletesRes] = await Promise.allSettled([
      apiCall<{ data: ConsultationSession[] }>(`/api/Consultation/consultation-session/today?date=${today}`),
      apiCall<{ activeCount?: number }>("/api/AMS/athletes"),
    ]);

    const sessions = todayRes.status === "fulfilled" ? todayRes.value.data : [];
    const todayTotal = sessions.length;
    const todayCompleted = sessions.filter((s) => s.status === "completed").length;

    const activeAthletes =
      athletesRes.status === "fulfilled" ? (athletesRes.value.activeCount ?? 0) : 0;

    return {
      data: {
        todayTotal,
        todayCompleted,
        activeAthletes,
        newAthletes: 0,
      },
    };
  },
};
