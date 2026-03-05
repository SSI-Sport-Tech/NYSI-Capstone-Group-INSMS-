"use client";

import { useState } from "react";
import { Edit, Eye, Clock, MapPin, User, Trash2 } from "lucide-react";
import { ConsultationSession } from "@/utils/dashboardApi";
import { useRouter } from "next/navigation";

interface SessionCardProps {
  session: ConsultationSession;
  onEdit?: (session: ConsultationSession) => void;
  onDelete?: (sessionId: string) => void;
  onView?: (session: ConsultationSession) => void;
  showActions?: boolean;
}

export default function SessionCard({
  session,
  onEdit,
  onDelete,
  onView,
  showActions = true,
}: SessionCardProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  const handleViewClick = () => {
    if (onView) {
      onView(session);
    } else {
      // Navigate to athlete consultation tab, linking to this specific session
      router.push(
        `/AMS/athlete-management/${session.athlete_id}?tab=consultation&sessionId=${session.id}`,
      );
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(session);
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

  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
      onClick={handleViewClick}
    >
      {/* Header with athlete name and date */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{session.athlete_name_abbr}</h3>
          <p className="text-sm text-gray-500">{formatDate(session.date_of_consult)}</p>
          {session.time_slot && (
            <p className="text-sm text-gray-500">{session.time_slot}</p>
          )}
        </div>

        {/* Status Badge */}
        <span className={`
          px-2 py-1 text-xs font-medium rounded-full border
          ${getStatusColor(session.status)}
        `}>
          {getStatusText(session.status)}
        </span>
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
        {session.location && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-3 h-3" />
            <span>{session.location}</span>
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
            <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {session.nutritionist_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <span className="text-xs text-gray-500">Assigned to</span>
              <p className="font-medium text-gray-900 text-sm">{session.nutritionist_name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
          <button
            onClick={handleEditClick}
            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            title="Edit consultation"
            disabled={loading}
          >
            <Edit className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleViewClick}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View consultation details"
            disabled={loading}
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {session.status !== "completed" && session.status !== "cancelled" && (
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