"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { dashboardApi, ConsultationSession } from "@/utils/dashboardApi";

// Hours shown in the calendar grid (6 AM to 9 PM inclusive)
const HOUR_START = 6;
const HOUR_END = 21;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_HEIGHT_PX = 64; // px per hour slot

function formatHour(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${suffix}`;
}

/** Convert "HH:MM" or "HH:MM:SS" to fractional hours from midnight */
function timeToHours(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60;
}

/** Fractional hours → pixel offset from the top of the grid */
function hoursToTop(fractionalHours: number): number {
  return (fractionalHours - HOUR_START) * HOUR_HEIGHT_PX;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TodaySchedule({ date, refreshKey }: { date?: Date; refreshKey?: number }) {
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [nowTop, setNowTop] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError("");
      const dateStr = date ? toDateStr(date) : undefined;
      const response = await dashboardApi.getTodaySessions(dateStr);
      setSessions(response.data || []);
    } catch (err: unknown) {
      console.error("Error fetching today's schedule:", err);
      setError("Schedule not available");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const updateNowLine = () => {
    const now = new Date();
    const fractional = now.getHours() + now.getMinutes() / 60;
    if (fractional >= HOUR_START && fractional <= HOUR_END) {
      setNowTop(hoursToTop(fractional));
    } else {
      setNowTop(null);
    }
  };

  useEffect(() => {
    fetchSchedule();
    updateNowLine();

    const sessionInterval = setInterval(fetchSchedule, 60 * 1000);
    const nowInterval = setInterval(updateNowLine, 30 * 1000);

    return () => {
      clearInterval(sessionInterval);
      clearInterval(nowInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, refreshKey]); // re-fetch when date or refreshKey changes

  // Scroll to current time on load
  useEffect(() => {
    if (!loading && nowTop !== null && gridRef.current) {
      const scrollTarget = nowTop - HOUR_HEIGHT_PX * 1.5;
      gridRef.current.scrollTop = Math.max(0, scrollTarget);
    }
  }, [loading, nowTop]);

  const displayDate = date ?? new Date();
  const isToday = !date || toDateStr(date) === toDateStr(new Date());
  const dateLabel = displayDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{isToday ? "Your Schedule" : "Your Schedule"}</h2>
        <p className="text-xs text-gray-400 mb-4">{dateLabel}</p>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-900">Your Schedule</h2>
        {error && (
          <button
            onClick={fetchSchedule}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Retry
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">{dateLabel}</p>

      {/* Scrollable time grid */}
      <div
        ref={gridRef}
        className="relative overflow-y-auto"
        style={{ height: `${HOUR_HEIGHT_PX * 7}px` }} // show ~7 hours at once
      >
        {/* Hour rows */}
        <div
          className="relative"
          style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT_PX}px` }}
        >
          {Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i).map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex"
              style={{ top: `${(hour - HOUR_START) * HOUR_HEIGHT_PX}px`, height: `${HOUR_HEIGHT_PX}px` }}
            >
              {/* Hour label */}
              <div className="w-14 flex-shrink-0 text-right pr-3 pt-0.5">
                <span className="text-xs text-gray-400">{formatHour(hour)}</span>
              </div>
              {/* Divider line */}
              <div className="flex-1 border-t border-gray-100" />
            </div>
          ))}

          {/* Current time red indicator */}
          {nowTop !== null && (
            <div
              className="absolute left-0 right-0 flex items-center pointer-events-none"
              style={{ top: `${nowTop}px`, zIndex: 10 }}
            >
              <div className="w-14 flex-shrink-0 flex justify-end pr-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 border-t-2 border-red-500" />
            </div>
          )}

          {/* Session blocks */}
          {sessions.map((session) => {
            const time = session.time_of_consult ?? session.time_slot;
            if (!time) return null;

            const startHours = timeToHours(time);
            if (startHours < HOUR_START || startHours >= HOUR_END) return null;

            const durationHours = (session.duration || 60) / 60;
            const topPx = hoursToTop(startHours);
            const heightPx = Math.max(durationHours * HOUR_HEIGHT_PX, 36);

            const isCompleted = session.status === "completed";
            const isCancelled = session.status === "cancelled";

            return (
              <button
                key={session.id}
                onClick={() =>
                  router.push(
                    `/AMS/athlete-management/${session.athlete_id}?tab=consultation&sessionId=${session.id}`
                  )
                }
                className={`
                  absolute left-16 right-2 rounded-lg px-2 py-1 text-left
                  transition-opacity hover:opacity-90 shadow-sm
                  ${isCompleted ? "bg-gray-200 opacity-60" : isCancelled ? "bg-red-100 opacity-60" : "bg-teal-500"}
                `}
                style={{ top: `${topPx}px`, height: `${heightPx}px`, zIndex: 5 }}
              >
                <p className={`text-xs font-semibold truncate ${isCompleted || isCancelled ? "text-gray-500" : "text-white"}`}>
                  {session.athlete_name_abbr}
                </p>
                {heightPx > 40 && (
                  <p className={`text-xs truncate ${isCompleted || isCancelled ? "text-gray-400" : "text-teal-100"}`}>
                    {session.type_of_consult}
                    {session.venue ? ` · ${session.venue}` : ""}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {sessions.length === 0 && !error && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">No sessions scheduled for today.</p>
        </div>
      )}

      {error && sessions.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-red-500">{error}</p>
          <button onClick={fetchSchedule} className="text-xs text-blue-600 underline mt-1">
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
