"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import ViewTabs from "@/components/ViewTabs";
import SearchSection from "@/components/SearchSection";
import BatchTable from "@/components/BatchTable";
import { Globe } from "lucide-react";

interface Batch {
  id: number;
  batch_number: string;
  supplement_name: string;
  supplement_brand: string;
  batch_status: string;
  batch_initial_quantity: number;
  booked: number;
  available: number;
  batch_expiration_date: string;
  batch_price: number;
}

interface SearchResponse {
  data: Batch[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  searchQuery: string | null;
}

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Batch[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tabs = [
    {
      id: "inventory",
      label: "Current Inventory View",
      icon: "globe",
      href: "/inventory",
    },
    {
      id: "scraper",
      label: "Web Scraper View",
      icon: "search",
      href: "/web-scraper",
    },
    {
      id: "library",
      label: "Supplement Library",
      icon: "library",
      href: "/library",
    },
  ];

  // Load all batches on component mount
  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async (searchQuery = "", page = 1) => {
    setLoading(true);
    setError("");

    try {
      const params: { page: number; search?: string } = { page };
      if (searchQuery.trim()) {
        params.search = searchQuery;
      }

      const response = await axios.get("/api/SSS/batches", { params });

      if (response.data && Array.isArray(response.data.data)) {
        setResults(response.data.data);
        setTotal(response.data.totalCount || 0);
        setCurrentPage(response.data.currentPage || 1);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setResults([]);
        setTotal(0);
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (err) {
      setError(
        "Failed to load batches. Please check your database connection.",
      );
      console.error(err);
      setResults([]);
      setTotal(0);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await loadBatches(query, 1);
    setCurrentPage(1);
  };

  const handleClearSearch = async () => {
    setQuery("");
    await loadBatches("", 1);
    setCurrentPage(1);
  };

  const handlePageChange = async (page: number) => {
    await loadBatches(query, page);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Header with User Profile */}
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Supplements
            </h1>
            
            {/* User Profile - Top Right */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">Amy Tan</div>
                  <div className="text-xs text-gray-500">Nutritionist</div>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">AT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <ViewTabs tabs={tabs} />

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
          <SearchSection
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            loading={loading}
          />

          {/* Batch Table */}
          <BatchTable
            batches={results}
            total={total}
            loading={loading}
            searchQuery={query}
            onRefresh={() => loadBatches(query, currentPage)}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
