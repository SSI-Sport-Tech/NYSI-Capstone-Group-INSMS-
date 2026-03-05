"use client";

import { useState } from "react";
import { Edit, Eye, Clock, MapPin, Trash2, CheckCircle2, Circle } from "lucide-react";
import { ConsultationSession, dashboardApi } from "@/utils/dashboardApi";
import { nutritionistColor, getInitials } from "@/utils/nutritionistAvatar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface SessionCardProps {
  session: ConsultationSession;
  onEdit?: (session: ConsultationSession) => void;
  onDelete?: (sessionId: string) => void;
  onStatusChange?: (sessionId: string, status: ConsultationSession["status"]) => void;
  showActions?: boolean;
}

export default function SessionCard({
  session,
  onEdit,
  onDelete,
  onStatusChange,
  showActions = true,
}: SessionCardProps) {
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(session.status);
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMIN" || user?.role === "IT_ADMIN";
  const isOwner = !!user?.nutritionist_id && user.nutritionist_id === session.nutritionist_id;
  const canModify = isAdmin || isOwner;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      case "scheduled":
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in-progress":
        return "In Progress";
      case "cancelled":
        return "Cancelled";
      case "scheduled":
      default:
        return "Scheduled";
    }
  };

  // Eye — always navigates to the athlete's consultation tab for this session
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(
      `/AMS/athlete-management/${session.athlete_id}?tab=consultation&sessionId=${session.id}`,
    );
  };

  // Edit — opens the BookingModal to change schedule details (date, time, location, type)
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(session);
    }
  };

  const handleCompleteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentStatus === "cancelled") return;
    const newStatus = currentStatus === "completed" ? "scheduled" : "completed";
    setLoading(true);
    try {
      await dashboardApi.updateSessionStatus(session.id, newStatus);
      setCurrentStatus(newStatus);
      onStatusChange?.(session.id, newStatus);
    } catch (error) {
      console.error("Failed to update session status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm("Are you sure you want to cancel this consultation?")) {
      setLoading(true);
      try {
        await onDelete(session.id);
      } finally {
        setLoading(false);
      }
    }
  };

  const isCompleted = currentStatus === "completed";

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow bg-white ${isCompleted ? "border-gray-100 opacity-60" : "border-gray-200"}`}>
      {/* Header with athlete name, date, and checkmark */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`font-semibold ${isCompleted ? "text-gray-400" : "text-gray-900"}`}>
            {session.athlete_name_abbr}
          </h3>
          <p className="text-sm text-gray-500">{formatDate(session.date_of_consult)}</p>
          {(session.time_of_consult || session.time_slot) && (
            <p className="text-sm text-gray-500">
              {session.time_of_consult ?? session.time_slot}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Checkmark to mark as completed */}
          {currentStatus !== "cancelled" && canModify && (
            <button
              onClick={handleCompleteToggle}
              disabled={loading}
              title={isCompleted ? "Mark as scheduled" : "Mark as completed"}
              className="p-1 rounded-full transition-colors"
            >
              {isCompleted
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : <Circle className="w-5 h-5 text-gray-300 hover:text-green-400" />
              }
            </button>
          )}

          {/* Status Badge */}
          <span className={`
            px-2 py-1 text-xs font-medium rounded-full border
            ${getStatusColor(currentStatus)}
          `}>
            {getStatusText(currentStatus)}
          </span>
        </div>
      </div>

      {/* Consultation Type and Objective */}
      <div className="mb-3">
        {session.type_of_consult && (
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full mr-2 mb-1">
            {session.type_of_consult}
          </span>
        )}
        {session.consultation_objective && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {session.consultation_objective}
          </p>
        )}
      </div>

      {/* Additional Info */}
      <div className="space-y-1 mb-3">
        {(session.venue || session.location) && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-3 h-3" />
            <span>{session.venue ?? session.location}</span>
          </div>
        )}
        
        {session.duration && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-3 h-3" />
            <span>{session.duration} minutes</span>
          </div>
        )}

        {session.nutritionist_name && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-bold ${nutritionistColor(session.nutritionist_id || session.nutritionist_name)}`}
              style={{ fontSize: "9px" }}>
              {getInitials(session.nutritionist_name)}
            </div>
            <div>
              <span className="text-xs text-gray-500">Assigned to</span>
              <p className="font-medium text-gray-900 text-sm">{session.nutritionist_name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && canModify && (
        <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
          <button
            onClick={handleEditClick}
            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            title="Edit schedule (date, time, location)"
            disabled={loading || !onEdit}
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            onClick={handleViewClick}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Open consultation"
            disabled={loading}
          >
            <Eye className="w-4 h-4" />
          </button>

          {canModify && currentStatus !== "completed" && currentStatus !== "cancelled" && (
            <button
              onClick={handleDeleteClick}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Cancel consultation"
              disabled={loading}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}