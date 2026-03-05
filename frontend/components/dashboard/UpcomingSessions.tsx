"use client";

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { dashboardApi, ConsultationSession } from "@/utils/dashboardApi";
import SessionCard from "./SessionCard";

interface UpcomingSessionsProps {
  onSessionEdit?: (session: ConsultationSession) => void;
  limit?: number;
}

export default function UpcomingSessions({
  onSessionEdit,
  limit = 4,
}: UpcomingSessionsProps) {
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fetchUpcomingSessions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await dashboardApi.getUpcomingSessions();
      setSessions(response.data || []);
    } catch (error: unknown) {
      console.error("Error fetching upcoming sessions:", error);
      setError("Session data not available yet");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingSessions();
    
    // Refresh sessions every 2 minutes
    const interval = setInterval(fetchUpcomingSessions, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSessionDelete = async (sessionId: string) => {
    try {
      await dashboardApi.cancelConsultationSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error("Error cancelling session:", error);
      alert("Failed to cancel session. Please try again.");
    }
  };

  const refreshSessions = () => {
    fetchUpcomingSessions();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Upcoming Sessions</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Upcoming Sessions
          </h2>
          {error && (
            <button
              onClick={refreshSessions}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {error && !sessions.length && (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Yet</h3>
          <p className="text-gray-500 mb-4 max-w-sm mx-auto">
            Your upcoming consultation sessions will appear here once scheduled.
          </p>
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg inline-block mb-4">
            {error}
          </div>
          <button
            onClick={refreshSessions}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
          >
            Refresh
          </button>
        </div>
      )}

      {sessions.length === 0 && !error ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Schedule</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            No upcoming sessions scheduled yet. Use the calendar or quick actions to book consultation sessions with your athletes.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sessions.slice(0, limit).map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onEdit={onSessionEdit}
              onDelete={handleSessionDelete}
              showActions={true}
            />
          ))}
        </div>
      )}

      {sessions.length > limit && (
        <div className="text-center mt-4">
          <Link
            href="/AMS/consultations"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View {sessions.length - limit} more sessions
          </Link>
        </div>
      )}
    </div>
  );
}