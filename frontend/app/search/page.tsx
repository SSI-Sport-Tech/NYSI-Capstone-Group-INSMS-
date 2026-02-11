"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import ViewTabs from "@/components/SSS/ViewTabs";
import SearchSection from "@/components/SSS/SearchSection";
import BatchTable from "@/components/SSS/BatchTable";
import { Globe } from "lucide-react";

interface Batch {
  id: number;
  batch_number: string;
  supplement_id: string;
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
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Supplements</h1>

        {/* Tabs */}
        <ViewTabs tabs={tabs} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
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
    </DashboardLayout>
  );
}
