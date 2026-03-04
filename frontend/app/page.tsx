"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import UpcomingSessions from "@/components/dashboard/UpcomingSessions";
import CalendarComponent from "@/components/dashboard/CalendarComponent";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import BookingModal from "@/components/dashboard/BookingModal";
import { ConsultationSession } from "@/utils/dashboardApi";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingSession, setEditingSession] =
    useState<ConsultationSession | null>(null);
  const router = useRouter();

  // Handle calendar date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle session booking from calendar
  const handleNewBooking = (date: Date) => {
    setSelectedDate(date);
    setEditingSession(null);
    setShowBookingModal(true);
  };

  // Handle session view/edit from various components
  const handleSessionView = (session: ConsultationSession) => {
    // Navigate to athlete consultation tab
    router.push(
      `/AMS/athlete-management/${session.athlete_id}?tab=consultation`,
    );
  };

  const handleSessionEdit = (session: ConsultationSession) => {
    setEditingSession(session);
    setShowBookingModal(true);
  };

  // Handle booking creation/update
  const handleBookingCreated = (booking: ConsultationSession) => {
    // Refresh the page data by triggering re-renders
    // This could be improved with a state management solution
    window.location.reload();
  };

  // Handle quick actions from stats component
  const handleQuickAction = (action: string) => {
    switch (action) {
      case "schedule":
        setSelectedDate(new Date());
        setEditingSession(null);
        setShowBookingModal(true);
        break;
      case "add-athlete":
        router.push("/AMS/athlete-management?action=add");
        break;
      default:
        break;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Title */}
          <PageHeader title="Dashboard" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Section - Stats and Sessions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Cards */}
              <DashboardStats onQuickAction={handleQuickAction} />

              {/* Upcoming Sessions */}
              <UpcomingSessions
                onSessionEdit={handleSessionEdit}
                onSessionView={handleSessionView}
                limit={4}
              />
            </div>

            {/* Right Section - Calendar and Schedule */}
            <div className="space-y-6">
              {/* Interactive Calendar */}
              <CalendarComponent
                onDateSelect={handleDateSelect}
                onBookingClick={handleSessionView}
                onNewBooking={handleNewBooking}
                selectedDate={selectedDate || undefined}
              />

              {/* Today's Schedule */}
              <TodaySchedule />
            </div>
          </div>

          {/* Booking Modal */}
          <BookingModal
            isOpen={showBookingModal}
            onClose={() => {
              setShowBookingModal(false);
              setEditingSession(null);
              setSelectedDate(null);
            }}
            onBookingCreated={handleBookingCreated}
            selectedDate={selectedDate || undefined}
            existingSession={editingSession}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
