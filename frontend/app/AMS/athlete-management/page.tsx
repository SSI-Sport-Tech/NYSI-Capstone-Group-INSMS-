"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import AthleteTable from "@/components/AMS/AthleteTable";
import AthleteSearchSection from "@/components/AMS/AthleteSearchSection";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";

interface Athlete {
  id: string;
  sportsync_id: string;
  athlete_name_abbr: string;
  sport_name: string;
  gender: string;
  date_of_birth: string;
}

interface SearchResponse {
  data: Athlete[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  searchQuery?: string;
}

export default function AthleteManagementPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchAthletes = async (page = 1, searchQuery = "") => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await axios.get<SearchResponse>(
        `${backendUrl}/api/AMS/athletes`,
        {
          params: { page, search: searchQuery },
        },
      );
      setAthletes(response.data.data);
      setCurrentPage(response.data.currentPage);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
    } catch (err) {
      console.error("Error fetching athletes:", err);
      setError("Failed to load athletes. Please try again.");
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAthletes();
  }, []);

  const handleSearch = async () => {
    fetchAthletes(1, query);
  };

  const handleClearSearch = () => {
    setQuery("");
    fetchAthletes(1, "");
  };

  const handlePageChange = (page: number) => {
    fetchAthletes(page, query);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Header */}
          <PageHeader title="Athlete Management" />
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-6 flex items-start gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Search Section */}
          <AthleteSearchSection
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            loading={loading}
          />

          {/* Athletes Table */}
          <AthleteTable
            athletes={athletes}
            total={totalCount}
            loading={loading}
            searchQuery={query}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onRefresh={() => fetchAthletes(currentPage, query)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
