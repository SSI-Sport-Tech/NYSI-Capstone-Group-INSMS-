"use client";

import { useEffect, useState } from "react";
import { dashboardApi, NutritionistScheduleSession } from "@/utils/dashboardApi";
import SessionCardNutritionistSchedule from "@/components/dashboard/SessionCardNutritionistSchedule";
import ScheduleModal from "@/components/dashboard/NutritionistSchedule";

export default function NutritionistSchedulesPage() {
  const [schedules, setSchedules] = useState<NutritionistScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<NutritionistScheduleSession | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await dashboardApi.getUpcomingNutritionistSchedules();

      setSchedules(res.data || []);
    } catch (err) {
      console.error("Failed to fetch nutritionist schedules:", err);
      setError("Failed to load nutritionist schedules.");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleEdit = (schedule: NutritionistScheduleSession) => {
    setEditingSchedule(schedule);
    setShowScheduleModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await dashboardApi.deleteNutritionistSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete schedule.");
    }
  };

  const handleScheduleUpdated = async () => {
    await fetchSchedules();

    setShowScheduleModal(false);
    setEditingSchedule(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading schedules...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Nutritionist Schedules</h1>
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchSchedules}
          className="mt-3 text-blue-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="py-4 max-w-6xl">
      {schedules.length === 0 ? (
        <p className="text-gray-500">No schedules found.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {schedules.map((schedule) => (
            <SessionCardNutritionistSchedule
              key={schedule.id}
              session={schedule}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showActions={true}
            />
          ))}
        </div>
      )}

      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setEditingSchedule(null);
        }}
        onScheduleCreated={handleScheduleUpdated}
        existingSchedule={editingSchedule}
      />
    </div>
  );
}