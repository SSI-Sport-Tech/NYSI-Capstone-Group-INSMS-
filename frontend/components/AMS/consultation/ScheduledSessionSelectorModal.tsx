"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, MapPin, FileText } from "lucide-react";
import { consultationApi } from "../../../utils/consultationApi";

export interface ScheduledSession {
  id: string;
  athlete_id: string;
  athlete_name_abbr: string;
  date_of_consult: string | null;
  time_of_consult: string | null;
  type_of_consult: string | null;
  venue: string | null;
  consultation_objective: string | null;
  nutritionist_name: string | null;
  is_scheduled_booking: boolean;
}

interface ScheduledSessionSelectorModalProps {
  isOpen: boolean;
  athleteId: string;
  onSelectSession: (session: ScheduledSession) => void;
  onStartNew: () => void;
  onClose: () => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date not set";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "Time not set";
  // timeStr is HH:MM or HH:MM:SS
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

export default function ScheduledSessionSelectorModal({
  isOpen,
  athleteId,
  onSelectSession,
  onStartNew,
  onClose,
}: ScheduledSessionSelectorModalProps) {
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !athleteId) return;

    const fetchSessions = async () => {
      setLoading(true);
      setError("");
      try {
        const response = (await consultationApi.getAllConsultations(athleteId)) as {
          data: ScheduledSession[];
        };
        // Show only sessions that were scheduled from the dashboard
        const scheduled = (response?.data ?? []).filter(
          (s) => s.is_scheduled_booking === true,
        );
        setSessions(scheduled);
      } catch {
        setError("Failed to load scheduled sessions.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [isOpen, athleteId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Select Session to Conduct
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose a scheduled session or start a new one
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {!loading && error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
            </div>
          )}

          {!loading && !error && sessions.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-8">
              No scheduled sessions found for this athlete.
            </div>
          )}

          {!loading &&
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session)}
                className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
              >
                {/* Date & Time row */}
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                    <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>{formatDate(session.date_of_consult)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>{formatTime(session.time_of_consult)}</span>
                  </div>
                </div>

                {/* Consult type */}
                {session.type_of_consult && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{session.type_of_consult}</span>
                  </div>
                )}

                {/* Venue */}
                {session.venue && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{session.venue}</span>
                  </div>
                )}

                {/* Objective preview */}
                {session.consultation_objective && (
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2 border-t border-gray-100 pt-2">
                    {session.consultation_objective}
                  </p>
                )}

                <div className="mt-2 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Select this session →
                </div>
              </button>
            ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 space-y-2">
          <button
            onClick={onStartNew}
            className="w-full px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Start Brand New Consultation Instead
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
