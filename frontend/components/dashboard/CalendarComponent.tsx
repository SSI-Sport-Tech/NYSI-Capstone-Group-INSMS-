"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { dashboardApi, ConsultationSession } from "@/utils/dashboardApi";

interface CalendarComponentProps {
  onDateSelect?: (date: Date) => void;
  onBookingClick?: (session: ConsultationSession) => void;
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

export default function CalendarComponent({
  onDateSelect,
  onBookingClick,
  onNewBooking,
  selectedDate,
}: CalendarComponentProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Generate calendar days for current month
  const getCalendarDays = useCallback(
    (date: Date): DayData[] => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const today = new Date();

      // Get first day of the month and last day
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();

      // Get the starting day of week (0 = Sunday)
      const startingDayOfWeek = firstDay.getDay();

      // Get days from previous month
      const prevMonth = new Date(year, month, 0);
      const daysInPrevMonth = prevMonth.getDate();

      const days: DayData[] = [];

      // Add days from previous month
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const dayNumber = daysInPrevMonth - i;
        const fullDate = new Date(year, month - 1, dayNumber);
        days.push({
          date: dayNumber,
          fullDate,
          isCurrentMonth: false,
          isToday: false,
          isSelected: selectedDate
            ? fullDate.toDateString() === selectedDate.toDateString()
            : false,
          sessions: sessions.filter(
            (session) =>
              new Date(session.date_of_consult).toDateString() ===
              fullDate.toDateString(),
          ),
        });
      }

      // Add days from current month
      for (let i = 1; i <= daysInMonth; i++) {
        const fullDate = new Date(year, month, i);
        const isToday = fullDate.toDateString() === today.toDateString();
        days.push({
          date: i,
          fullDate,
          isCurrentMonth: true,
          isToday,
          isSelected: selectedDate
            ? fullDate.toDateString() === selectedDate.toDateString()
            : false,
          sessions: sessions.filter(
            (session) =>
              new Date(session.date_of_consult).toDateString() ===
              fullDate.toDateString(),
          ),
        });
      }

      // Add days from next month to fill the grid
      const remainingDays = 42 - days.length; // 6 weeks * 7 days
      for (let i = 1; i <= remainingDays; i++) {
        const fullDate = new Date(year, month + 1, i);
        days.push({
          date: i,
          fullDate,
          isCurrentMonth: false,
          isToday: false,
          isSelected: selectedDate
            ? fullDate.toDateString() === selectedDate.toDateString()
            : false,
          sessions: sessions.filter(
            (session) =>
              new Date(session.date_of_consult).toDateString() ===
              fullDate.toDateString(),
          ),
        });
      }

      return days;
    },
    [sessions, selectedDate],
  );

  // Fetch sessions for the current month
  const fetchMonthSessions = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const year = date.getFullYear();
      const month = date.getMonth();

      const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const response = await dashboardApi.getConsultationSessions(
        firstDay,
        lastDay,
      );
      setSessions(response.data || []);
    } catch (error) {
      console.error("Error fetching month sessions:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to fetch sessions when month changes
  useEffect(() => {
    fetchMonthSessions(currentDate);
  }, [currentDate, fetchMonthSessions]);

  const handleDateClick = (dayData: DayData) => {
    if (onDateSelect) {
      onDateSelect(dayData.fullDate);
    }
  };

  const handleSessionClick = (
    e: React.MouseEvent,
    session: ConsultationSession,
  ) => {
    e.stopPropagation();
    if (onBookingClick) {
      onBookingClick(session);
    }
  };

  const handleNewBookingClick = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation();
    if (onNewBooking) {
      onNewBooking(date);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const calendarDays = getCalendarDays(currentDate);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => navigateMonth("next")}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayData, index) => (
          <div
            key={index}
            className={`
              relative min-h-[60px] p-1 rounded-lg cursor-pointer transition-all duration-200
              ${
                dayData.isCurrentMonth
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
            <div
              className={`
              text-sm font-medium mb-1
              ${dayData.isToday ? "text-blue-600" : ""}
              ${dayData.isSelected ? "text-blue-700 font-semibold" : ""}
            `}
            >
              {dayData.date}
            </div>

            {/* Sessions */}
            <div className="space-y-1">
              {dayData.sessions.slice(0, 2).map((session) => (
                <div
                  key={session.id}
                  className="text-xs px-1 py-0.5 rounded bg-teal-100 text-teal-800 cursor-pointer hover:bg-teal-200 transition-colors truncate"
                  onClick={(e) => handleSessionClick(e, session)}
                  title={`${session.athlete_name_abbr} - ${session.type_of_consult}`}
                >
                  {session.athlete_name_abbr}
                </div>
              ))}

              {/* Show count if more than 2 sessions */}
              {dayData.sessions.length > 2 && (
                <div className="text-xs text-gray-600 px-1">
                  +{dayData.sessions.length - 2} more
                </div>
              )}
            </div>

            {/* Add Button on Hover */}
            {dayData.isCurrentMonth &&
              onNewBooking &&
              hoveredDate?.toDateString() ===
                dayData.fullDate.toDateString() && (
                <button
                  className="absolute top-1 right-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors opacity-75 hover:opacity-100"
                  onClick={(e) => handleNewBookingClick(e, dayData.fullDate)}
                  title="Schedule new consultation"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
          </div>
        ))}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
}
