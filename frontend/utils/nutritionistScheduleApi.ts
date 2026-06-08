// API utility functions for nutritionist schedule components
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface ApiError {
  message: string;
  status: number;
}

export class NutritionistScheduleApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "NutritionistScheduleApiError";
  }
}

// Generic API call function (GET)
export async function apiCall<T>(endpoint: string): Promise<T> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new NutritionistScheduleApiError("Authentication token not found", 401);
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
    throw new NutritionistScheduleApiError(
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
    throw new NutritionistScheduleApiError("Authentication token not found", 401);
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
    throw new NutritionistScheduleApiError(
      `HTTP error! status: ${response.status}`,
      response.status,
    );
  }

  return response.json();
}

// Nutritionist schedule lookup functions
export const nutritionistScheduleLookupApi = {
  // Get schedule types
  getScheduleTypes: async (): Promise<{ data: any[] }> => {
    return apiCall("/api/AMS/lookups/schedule-types");
  },
};

// Nutritionist schedule-specific API functions
export const nutritionistScheduleApi = {
  // Get schedule by ID
  getScheduleById: async (scheduleId: string) => {
    return apiCall(
      `/api/AMS/nutritionist-schedule/${scheduleId}`
    );
  },

  // Get upcoming schedules
  getUpcomingSchedules: async (limit = 20) => {
    return apiCall(
      `/api/AMS/nutritionist-schedule/upcoming?limit=${limit}`
    );
  },

  // Get today's schedules for logged-in nutritionist
  getTodaySchedules: async (date?: string) => {
    const query = date ? `?date=${date}` : "";
    return apiCall(
      `/api/AMS/nutritionist-schedule/today${query}`
    );
  },

  // Get schedules within a date range
  getSchedulesByRange: async (
    from: string,
    to: string,
    nutritionistId?: string
  ) => {
    const params = new URLSearchParams({
      from,
      to,
    });

    if (nutritionistId) {
      params.append("nutritionist_id", nutritionistId);
    }

    return apiCall(
      `/api/AMS/nutritionist-schedule/range?${params.toString()}`
    );
  },

  // Create schedule
  createSchedule: async (data: {
    nutritionist_id?: string;
    schedule_type_id: string;
    schedule_date: string;
    start_time: string;
    end_time: string;
    remarks?: string;
  }) => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new NutritionistScheduleApiError(
        "Authentication token not found",
        401
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/AMS/nutritionist-schedule`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new NutritionistScheduleApiError(
        `HTTP error! status: ${response.status}`,
        response.status
      );
    }

    return response.json();
  },

  // Update schedule
  updateSchedule: async (
    scheduleId: string,
    data: {
      schedule_type_id?: string;
      schedule_date?: string;
      start_time?: string;
      end_time?: string;
      remarks?: string;
    }
  ) => {
    return apiPatch(
      `/api/AMS/nutritionist-schedule/${scheduleId}`,
      data
    );
  },

  // Delete schedule
  deleteSchedule: async (scheduleId: string) => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new NutritionistScheduleApiError(
        "Authentication token not found",
        401
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/AMS/nutritionist-schedule/${scheduleId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new NutritionistScheduleApiError(
        `HTTP error! status: ${response.status}`,
        response.status
      );
    }

    return response.json();
  },
};

export async function apiPost<T>(
  endpoint: string,
  body: object
): Promise<T> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new NutritionistScheduleApiError(
      "Authentication token not found",
      401
    );
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new NutritionistScheduleApiError(
      `HTTP error! status: ${response.status}`,
      response.status
    );
  }

  return response.json();
}

export async function apiDelete<T>(
  endpoint: string
): Promise<T> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new NutritionistScheduleApiError(
      "Authentication token not found",
      401
    );
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new NutritionistScheduleApiError(
      `HTTP error! status: ${response.status}`,
      response.status
    );
  }

  return response.json();
}