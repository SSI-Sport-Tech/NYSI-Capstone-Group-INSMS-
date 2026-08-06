"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import AthleteTable from "@/components/AMS/AthleteTable";
import AthleteSearchSection from "@/components/AMS/AthleteSearchSection";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import { getBackendUrl } from "@/utils/backendUrl";


// interface Athlete {
//   id: string;
//   sportsync_id: string;
//   initials: string;
//   sport_name: string;
//   gender: string;
//   date_of_birth: string;
//   carding_status?: string;
//   target_event?: string;
//   assigned_nutritionist?: string;
//   is_pinned?: boolean;
// }
// interface Athlete {
//   pk_athlete_uuid: string;
//   first_name: string;
//   last_name: string;
//   anonymized_display_name: string;
//   email: string;
//   date_of_birth: string;
//   gender: string;
//   fk_sport_uuid: string;
//   position: string;
//   race: string | null;
//   ethnicity: string | null;
//   nationality: string | null;
//   sport_sync_id: string | null;
//   external_patient_id: string | null;
//   pnco: string;
//   is_active: boolean;
//   created_at: string;
//   updated_at: string;
// }
interface Athlete {
  id: string;
  anonymized_display_name: string;
  fk_sport_uuid: string;
  sport_name: string;
  gender: string;
  date_of_birth: string;
  carding_status: string | null;
  carding_start_date: Date,
  carding_end_date: Date,
  is_active: boolean;
  email: string;
  position: string;
  race: string | null;
  ethnicity: string | null;
  nationality: string | null;
  target_event: string | null;
  sport_start_date: number | null;
  athlete_group_id: number | null;
  medical_clearance: boolean;
  is_pinned: boolean;
  team_uuid: string;
  assigned_nutritionist: string;
}
// interface SearchResponse {
//   data: Athlete[];
//   totalCount: number;
//   currentPage: number;
//   totalPages: number;
//   searchQuery?: string;
// }
interface SearchResponse {
  data: Athlete[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const inFlightAthleteRequests = new Map<string, Promise<SearchResponse>>();


export default function AthleteManagementPage() {
  const { token, loading: authLoading } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchAthletes = useCallback(async (page = 1, searchQuery = "") => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || getBackendUrl();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const requestKey = JSON.stringify({
        page,
        searchQuery,
        token: token ?? "",
      });

      let request = inFlightAthleteRequests.get(requestKey);
      if (!request) {
        request = axios
          .get<SearchResponse>(`${backendUrl}/api/AMS/athletes/adex`, {
            params: { page, search: searchQuery },
            headers,
          })
          .then((response) => response.data)
          .finally(() => {
            inFlightAthleteRequests.delete(requestKey);
          });

        inFlightAthleteRequests.set(requestKey, request);
      }

      const data = await request;
      console.log("ADEX response:", data);

      // setAthletes(data.data);
      // setCurrentPage(data.currentPage);
      // setTotalPages(data.totalPages);
      // setTotalCount(data.totalCount);
      setAthletes(data.data);
      setCurrentPage(data.meta.currentPage);
      setTotalPages(data.meta.totalPages);
      setTotalCount(data.meta.totalItems);
    } catch (err) {
      console.error("Error fetching athletes:", err);
      setError("Failed to load athletes. Please try again.");
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    fetchAthletes();
  }, [authLoading, fetchAthletes]);

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

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    setError(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleError = (message: string) => {
    setError(message);
    setSuccessMessage(null);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Header */}
          <PageHeader title="Athlete Management" />

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-xl mb-6 flex items-start gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          )}

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
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
