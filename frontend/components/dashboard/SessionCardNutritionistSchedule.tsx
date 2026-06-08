"use client";

import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import {
  NutritionistScheduleSession,
} from "@/utils/dashboardApi";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface SessionCardNutritionistScheduleProps {
  session: NutritionistScheduleSession;
  onEdit?: (session: NutritionistScheduleSession) => void;
  onDelete?: (sessionId: string) => void;
  showActions?: boolean;
}

export default function SessionCardNutritionistSchedule({
  session,
  onEdit,
  onDelete,
  showActions = true,
}: SessionCardNutritionistScheduleProps) {
  const [loading, setLoading] = useState(false);
  const currentSchedule = session.schedule_type;
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

  const getScheduleColor = (schedule_type?: string) => {
    switch (schedule_type) {
      case "Deliveries":
        return "bg-green-200 text-green-700 border-green-300";
      case "Events":
        return "bg-gray-200 text-gray-700 border-gray-300";
      case "Important":
        return "bg-red-100 text-red-700 border-red-200";
      case "Leaves / Time-off / WFH":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Nutrition Lab":
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const getScheduleText = (schedule_type?: string) => {
    switch (schedule_type) {
      case "Deliveries":
        return "Deliveries";
      case "Events":
        return "Events";
      case "Important":
        return "Important";
      case "Leaves / Time-off / WFH":
        return "Leaves / Time-off / WFH";
      case "Nutrition Lab":
      default:
        return "Nutrition Lab";
    }
  };

  // Edit — opens the NutritionistScheduleModal to change schedule details (date, time, type, remarks)
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(session);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm("Are you sure you want to delete this nutritionist schedule?")) {
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
      className={`border rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer`}
    >
      {/* Header with nutritionist name, date, and checkmark */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className={`font-semibold`}>
            {session.nutritionist_name}
          </h3>
          <p className="text-sm text-gray-500">{formatDate(session.schedule_date)}</p>
          {(session.start_time) && (
            <p className="text-sm text-gray-500">
              {session.start_time} - {session.end_time}
            </p>
          )}
          {session.remarks && (
            <p className="text-sm text-gray-500">
              {session.remarks}
            </p>
          )}
        </div>  

        <div className="flex items-center space-x-2">
          {/* Schedule Badge */}
          <span className={`
            px-2 py-1 text-xs font-medium rounded-full border
            ${getScheduleColor(session.schedule_type)}
          `}>
            {session.schedule_type}
          </span>
        </div>
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

          {canModify && (
            <button
              onClick={handleDeleteClick}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Schedule"
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
