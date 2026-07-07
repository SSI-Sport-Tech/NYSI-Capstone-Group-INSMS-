"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { dashboardApi, ConsultationSession, NutritionistScheduleSession } from "@/utils/dashboardApi";
import { nutritionistColor, getInitials } from "@/utils/nutritionistAvatar";

interface CalendarComponentProps {
  onDateSelect?: (date: Date) => void;
  onNewBooking?: (date: Date) => void;
  selectedDate?: Date;
}

interface DayData {
  date: number;
  fullDate: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  sessions: ConsultationSession[];
}

/** Unique nutritionists on a given day, preserving insertion order */
function uniqueNutritionistsForDay(sessions: ConsultationSession[]) {
  const seen = new Set<string>();
  const result: { id: string; name: string }[] = [];
  for (const s of sessions) {
    if (s.nutritionist_id && !seen.has(s.nutritionist_id)) {
      seen.add(s.nutritionist_id);
      result.push({ id: s.nutritionist_id, name: s.nutritionist_name || "" });
    }
  }
  return result;
}

export default function CalendarComponent({
  onDateSelect,
  onNewBooking,
  selectedDate,
}: CalendarComponentProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [nutritionistSchedules, setNutritionistSchedules] = useState<NutritionistScheduleSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const getCalendarDays = useCallback(
    (date: Date): DayData[] => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const today = new Date();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const prevMonth = new Date(year, month, 0);
      const daysInPrevMonth = prevMonth.getDate();

      const days: DayData[] = [];

      // const matchDay = (fullDate: Date) =>
      //   sessions.filter((s) => s.date_of_consult === fullDate.toLocaleDateString("en-CA"));
      const matchConsultations = (fullDate: Date) =>
        sessions.filter(
          (s) => s.date_of_consult === fullDate.toLocaleDateString("en-CA")
        );

      const matchSchedules = (fullDate: Date) =>
        nutritionistSchedules.filter(
          (s) => s.schedule_date === fullDate.toLocaleDateString("en-CA")
        );

      const getCombinedSessions = (
        fullDate: Date
      ): ConsultationSession[] => [
        ...matchConsultations(fullDate),
        ...matchSchedules(fullDate).map(
          (s) =>
            ({
              id: s.id,
              nutritionist_id: s.nutritionist_id,
              nutritionist_name: s.nutritionist_name,
              date_of_consult: s.schedule_date,
            }) as ConsultationSession
        ),
      ];

      // Previous month padding
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const dayNumber = daysInPrevMonth - i;
        const fullDate = new Date(year, month - 1, dayNumber);
        days.push({
          date: dayNumber,
          fullDate,
          isCurrentMonth: false,
          isToday: false,
          isSelected: selectedDate ? fullDate.toDateString() === selectedDate.toDateString() : false,
          // sessions: matchDay(fullDate),
          sessions: getCombinedSessions(fullDate),
          
        });
      }

      // Current month
      for (let i = 1; i <= daysInMonth; i++) {
        const fullDate = new Date(year, month, i);
        days.push({
          date: i,
          fullDate,
          isCurrentMonth: true,
          isToday: fullDate.toDateString() === today.toDateString(),
          isSelected: selectedDate ? fullDate.toDateString() === selectedDate.toDateString() : false,
          // sessions: matchDay(fullDate),
          sessions: getCombinedSessions(fullDate),
        });
      }

      // Next month padding
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        const fullDate = new Date(year, month + 1, i);
        days.push({
          date: i,
          fullDate,
          isCurrentMonth: false,
          isToday: false,
          isSelected: selectedDate ? fullDate.toDateString() === selectedDate.toDateString() : false,
          // sessions: matchDay(fullDate),
          sessions: getCombinedSessions(fullDate),
        });
      }

      return days;
    },
    [sessions, selectedDate],
  );

  const fetchMonthSessions = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const year = date.getFullYear();
      const month = date.getMonth();
      // Use local date strings to avoid UTC shift
      const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDayDate = new Date(year, month + 1, 0);
      const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

      // const response = await dashboardApi.getConsultationSessions(firstDay, lastDay);
      // setSessions(response.data || []);
      const [consultRes, scheduleRes] = await Promise.all([
        dashboardApi.getConsultationSessions(firstDay, lastDay),
        dashboardApi.getNutritionistSchedules(firstDay, lastDay),
      ]);

      setSessions(consultRes.data || []);
      setNutritionistSchedules(scheduleRes.data || []);
    } catch (error) {
      console.error("Error fetching month sessions:", error);
      setSessions([]);
      setNutritionistSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthSessions(currentDate);
  }, [currentDate, fetchMonthSessions]);

  const handleDateClick = (dayData: DayData) => {
    onDateSelect?.(dayData.fullDate);
  };

  const handleNewBookingClick = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation();
    onNewBooking?.(date);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === "prev" ? -1 : 1));
    setCurrentDate(newDate);
  };

  const calendarDays = getCalendarDays(currentDate);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex space-x-2">
          <button onClick={() => navigateMonth("prev")} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={() => navigateMonth("next")} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayData, index) => {
          const nutritionists = uniqueNutritionistsForDay(dayData.sessions);
          const MAX_VISIBLE = 3;
          const visible = nutritionists.slice(0, MAX_VISIBLE);
          const overflow = nutritionists.length - MAX_VISIBLE;
          const isHovered = hoveredDate?.toDateString() === dayData.fullDate.toDateString();

          return (
            <div
              key={index}
              className={`
                relative min-h-[60px] p-1 rounded-lg cursor-pointer transition-all duration-200
                ${dayData.isCurrentMonth
                  ? "text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200"
                  : "text-gray-400"
                }
                ${dayData.isToday ? "bg-blue-50 border-blue-200" : ""}
                ${dayData.isSelected ? "bg-blue-100 border-blue-300" : ""}
              `}
              onClick={() => handleDateClick(dayData)}
              onMouseEnter={() => setHoveredDate(dayData.fullDate)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {/* Date Number */}
              <div className={`text-sm font-medium mb-1 ${dayData.isToday ? "text-blue-600" : ""} ${dayData.isSelected ? "text-blue-700 font-semibold" : ""}`}>
                {dayData.date}
              </div>

              {/* Nutritionist avatar stack — clicking selects the date */}
              {nutritionists.length > 0 && (
                <div
                  className="flex items-center"
                  style={{ paddingLeft: "2px" }}
                  title={nutritionists.map(n => n.name || "Unknown").join(", ")}
                >
                  {/* Overlapping avatars */}
                  <div className="flex" style={{ gap: 0 }}>
                    {visible.map((n, i) => (
                      <div
                        key={n.id}
                        className={`
                          w-5 h-5 rounded-full flex items-center justify-center
                          text-white font-bold ring-1 ring-white
                          ${nutritionistColor(n.id)}
                        `}
                        style={{
                          fontSize: "7px",
                          marginLeft: i === 0 ? 0 : "-5px",
                          zIndex: visible.length - i,
                          position: "relative",
                        }}
                        title={n.name}
                      >
                        {getInitials(n.name)}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-400 text-white ring-1 ring-white"
                        style={{ fontSize: "7px", marginLeft: "-5px", position: "relative", zIndex: 0 }}
                      >
                        +{overflow}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add Button on Hover */}
              {dayData.isCurrentMonth && onNewBooking && isHovered && (
                <button
                  className="absolute top-1 right-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors opacity-75 hover:opacity-100"
                  onClick={(e) => handleNewBookingClick(e, dayData.fullDate)}
                  title="Schedule new consultation"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
}
