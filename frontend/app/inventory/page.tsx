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

  const loadBatches = async (searchQuery = "") => {
    setLoading(true);
    setError("");

    try {
      const params: { page: number; search?: string } = { page: 1 };
      if (searchQuery.trim()) {
        params.search = searchQuery;
      }

      const response = await axios.get("/api/SSS/batches", { params });

      if (response.data && Array.isArray(response.data.data)) {
        setResults(response.data.data);
        setTotal(response.data.totalCount || 0);
      } else {
        setResults([]);
        setTotal(0);
      }
    } catch (err) {
      setError(
        "Failed to load batches. Please check your database connection."
      );
      console.error(err);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await loadBatches(query);
  };

  const handleClearSearch = async () => {
    setQuery("");
    await loadBatches();
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
        />
      </div>
    </DashboardLayout>
  );
}
