"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Users,
  Calendar,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Edit,
  Eye,
  Clock,
  MapPin,
  User
} from "lucide-react";

export default function Home() {
  const [currentDate] = useState(new Date());

  // Generate calendar days for current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const days = getDaysInMonth(currentDate);
  const today = currentDate.getDate();

  return (
    <DashboardLayout>
      <div>
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section - Stats and Sessions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Your Sessions Today */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm text-gray-600 mb-2">Your Sessions Today</div>
                <div className="text-4xl font-bold text-gray-900 mb-1">5</div>
                <div className="text-xs text-gray-500">2 finished sessions</div>
              </div>

              {/* Active Athletes */}
              <div className="bg-blue-600 rounded-lg shadow-sm p-6 text-white">
                <div className="text-sm mb-2 opacity-90">Active Athletes</div>
                <div className="text-4xl font-bold mb-1">120</div>
                <div className="text-xs opacity-75">+5 New Athletes</div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</div>
                <div className="space-y-2">
                  <button className="w-full flex items-center space-x-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm">
                    <Users className="w-4 h-4" />
                    <span>Athlete Management</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Schedule Session</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm">
                    <UserPlus className="w-4 h-4" />
                    <span>Add New Athlete</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Upcoming Sessions</h2>
                <Link href="#" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
                  Check All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Session Card 1 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Marcus Chen</h3>
                      <p className="text-sm text-gray-500">14 October, Tue</p>
                      <p className="text-sm text-gray-500">09:00 - 10:00</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Edit className="w-5 h-5 text-teal-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Eye className="w-5 h-5 text-teal-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Pre-Competition</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Nutrition Review</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      SC
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Assigned to</span>
                      <p className="font-medium text-gray-900">Dr. Sarah Chen</p>
                    </div>
                  </div>
                </div>

                {/* Session Card 2 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Celine Dion</h3>
                      <p className="text-sm text-gray-500">15 October, Wed</p>
                      <p className="text-sm text-gray-500">10:00 - 11:00</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Edit className="w-5 h-5 text-teal-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Eye className="w-5 h-5 text-teal-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Pre-Competition</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Nutrition Review</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      SC
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Assigned to</span>
                      <p className="font-medium text-gray-900">Dr. Amy Tan</p>
                    </div>
                  </div>
                </div>

                {/* Session Card 3 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Robert Tan</h3>
                      <p className="text-sm text-gray-500">14 October, Tue</p>
                      <p className="text-sm text-gray-500">09:00 - 10:00</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Edit className="w-5 h-5 text-teal-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Eye className="w-5 h-5 text-teal-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Pre-Competition</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Nutrition Review</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      SC
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Assigned to</span>
                      <p className="font-medium text-gray-900">Dr. Jeff Chua</p>
                    </div>
                  </div>
                </div>

                {/* Session Card 4 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Celine Dion</h3>
                      <p className="text-sm text-gray-500">15 October, Wed</p>
                      <p className="text-sm text-gray-500">10:00 - 11:00</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Edit className="w-5 h-5 text-teal-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Eye className="w-5 h-5 text-teal-600" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Pre-Competition</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Nutrition Review</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      SC
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Assigned to</span>
                      <p className="font-medium text-gray-900">Dr. Amy Tan</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Calendar and Schedule */}
          <div className="space-y-6">
            {/* Calendar */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {today} {monthNames[currentDate.getMonth()]}, {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
                </h2>
                <div className="flex space-x-2">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {dayNames.map((day) => (
                  <div key={day} className="text-gray-500 font-medium py-2">
                    {day}
                  </div>
                ))}
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={`py-2 rounded-lg ${
                      day === null
                        ? ""
                        : day === today
                        ? "bg-red-500 text-white font-bold"
                        : "text-gray-700 hover:bg-gray-100 cursor-pointer"
                    }`}
                  >
                    {day || ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Your Schedule */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Schedule</h2>
              <div className="space-y-3">
                {/* Schedule Item 1 */}
                <div className="flex space-x-3">
                  <div className="w-2 bg-teal-400 rounded-full"></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">Nutrition Consultation</h3>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>10:30 AM</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>Nutrition Room 12</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>Sarah Chua</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">45 min</div>
                  </div>
                </div>

                {/* Schedule Item 2 */}
                <div className="flex space-x-3">
                  <div className="w-2 bg-teal-600 rounded-full"></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">Nutrition Session</h3>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>04:00 PM</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>Bishan Swimming Pool</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>Mike Ng</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">90 min</div>
                  </div>
                </div>

                {/* Schedule Item 3 */}
                <div className="flex space-x-3">
                  <div className="w-2 bg-teal-400 rounded-full"></div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">Nutrition Consultation</h3>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>10:30 AM</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>Nutrition Room 12</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>Sarah Chua</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">45 min</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
