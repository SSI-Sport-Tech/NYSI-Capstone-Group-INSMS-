"use client";

import { useState, useEffect } from "react";
import { Calendar, Users, UserPlus } from "lucide-react";
import { dashboardApi } from "@/utils/dashboardApi";
import Link from "next/link";

interface DashboardStatsProps {
  onQuickAction?: (action: string) => void;
}

export default function DashboardStats({ onQuickAction }: DashboardStatsProps) {
  const [stats, setStats] = useState({
    todayTotal: 0,
    todayCompleted: 0,
    activeAthletes: 0,
    newAthletes: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getSessionStats();
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      // Keep stats at 0 if API fails - this is expected since endpoint doesn't exist yet
      setStats({
        todayTotal: 0,
        todayCompleted: 0,
        activeAthletes: 0,
        newAthletes: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleQuickAction = (action: string) => {
    if (onQuickAction) {
      onQuickAction(action);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Your Sessions Today */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-sm text-gray-600 mb-2">Your Sessions Today</div>
        <div className="text-4xl font-bold text-gray-900 mb-1">
          {stats.todayTotal}
        </div>
      </div>

      {/* Active Athletes */}
      <div className="bg-blue-600 rounded-lg shadow-sm p-6 text-white">
        <div className="text-sm mb-2 opacity-90">Active Athletes</div>
        <div className="text-4xl font-bold mb-1">{stats.activeAthletes}</div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-sm font-semibold text-gray-900 mb-3">
          Quick Actions
        </div>
        <div className="space-y-2">
          <Link
            href="/AMS/athlete-management"
            className="w-full flex items-center space-x-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Athlete Management</span>
          </Link>
          
          <button
            onClick={() => handleQuickAction("schedule")}
            className="w-full flex items-center space-x-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Session</span>
          </button>
          
          <button
            onClick={() => handleQuickAction("add-athlete")}
            className="w-full flex items-center space-x-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Athlete</span>
          </button>
        </div>
      </div>
    </div>
  );
}