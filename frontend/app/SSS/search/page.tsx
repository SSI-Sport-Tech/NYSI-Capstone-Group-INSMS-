"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import ViewTabs from "@/components/SSS/ViewTabs";
import SearchSection from "@/components/SSS/SearchSection";
import BatchTable from "@/components/SSS/BatchTable";
import { Globe } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface Batch {
  id: string;
  product_id: string;
  product_name: string;
  brand: string | null;
  batch_number: string;
  category: string,
  description: string,
  barcode_sku: string;
  quantity_on_hand: number;
  original_stock_amount: number;
  expiry_date: string;
  unit_cost: number;
  supplier: string | null;
  received_date: string | null;
  notes: string | null;
  batch_status: string; // always "-" for now
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
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const tabs = [
    {
      id: "library",
      label: "Supplement Library",
      icon: "library",
      href: "/SSS/library",
    },
    {
      id: "inventory",
      label: "Current Inventory View",
      icon: "inventory",
      href: "/SSS/inventory",
    },
    {
      id: "scraper",
      label: "Web Scraper View",
      icon: "scraper",
      href: "/SSS/web-scraper",
    },
    {
      id: "batch-testing",
      label: "Batch OCR Testing",
      icon: "batch",
      href: "/SSS/batch-testing",
    },
  ];

  // Load all batches on component mount
  useEffect(() => {
    loadBatches(query, currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      loadBatches(query, 1);
    }, 400);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

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
    // setCurrentPage(1);
  };

  const handleClearSearch = async () => {
    setQuery("");
    // await loadBatches("", 1);
    // setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    // await loadBatches(query, page);
    setCurrentPage(page);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Page Title */}
        <PageHeader title="Supplements" />

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
