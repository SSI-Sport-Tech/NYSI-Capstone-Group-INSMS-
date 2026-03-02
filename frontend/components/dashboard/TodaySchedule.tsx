"use client";

import { useState, useEffect } from "react";
import { Clock, MapPin, User } from "lucide-react";
import { dashboardApi, ConsultationSession } from "@/utils/dashboardApi";

export default function TodaySchedule() {
  const [schedule, setSchedule] = useState<ConsultationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchTodaySchedule = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await dashboardApi.getTodaySessions();
      setSchedule(response.data || []);
    } catch (error: any) {
      console.error("Error fetching today's schedule:", error);
      setError("Failed to load schedule");
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySchedule();
    
    // Refresh every minute to keep schedule current
    const interval = setInterval(fetchTodaySchedule, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getTimeColor = (timeSlot: string, status?: string) => {
    if (status === "completed") {
      return "bg-green-500";
    }
    
    if (!timeSlot) return "bg-gray-400";
    
    const currentTime = new Date();
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const sessionTime = new Date();
    sessionTime.setHours(hours, minutes, 0, 0);
    
    const timeDiff = sessionTime.getTime() - currentTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    if (status === "in-progress" || (minutesDiff >= -30 && minutesDiff <= 30)) {
      return "bg-blue-500"; // Current/active session
    } else if (minutesDiff > 30) {
      return "bg-teal-400"; // Upcoming session
    } else {
      return "bg-gray-400"; // Past session
    }
  };

  const sortedSchedule = schedule
    .sort((a, b) => {
      const timeA = a.time_slot || "00:00";
      const timeB = b.time_slot || "00:00";
      return timeA.localeCompare(timeB);
    });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Schedule</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-3 animate-pulse">
              <div className="w-2 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Schedule</h2>
        {error && (
          <button
            onClick={fetchTodaySchedule}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Retry
          </button>
        )}
      </div>

      {error && !schedule.length ? (
        <div className="text-center py-4">
          <div className="text-red-600 text-sm mb-2">⚠️ {error}</div>
          <button
            onClick={fetchTodaySchedule}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      ) : schedule.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No sessions today</div>
          <p className="text-sm text-gray-400">
            Enjoy your free day! 
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSchedule.map((session) => (
            <div key={session.id} className="flex space-x-3">
              {/* Time indicator */}
              <div className={`
                w-2 rounded-full
                ${getTimeColor(session.time_slot || "", session.status)}
              `}></div>
              
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 text-sm">
                  {session.consultation_objective || session.type_of_consult}
                </h3>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                  {session.time_slot && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{session.time_slot}</span>
                    </div>
                  )}
                  
                  {session.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{session.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{session.athlete_name_abbr}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                  <span>{session.duration ? `${session.duration} min` : ""}</span>
                  {session.status && (
                    <span className={`
                      px-2 py-0.5 rounded-full text-xs
                      ${session.status === "completed" ? 
                        "bg-green-100 text-green-700" : 
                        session.status === "in-progress" ?
                        "bg-blue-100 text-blue-700" :
                        "bg-yellow-100 text-yellow-700"
                      }
                    `}>
                      {session.status === "completed" ? "Completed" :
                       session.status === "in-progress" ? "In Progress" :
                       "Scheduled"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}