"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import SearchSection from "@/components/SSS/SearchSection";
import BatchTable from "@/components/SSS/BatchTable";
import OCRModal from "@/components/SSS/OCRModal";
import SupplementTabBar from "@/components/SSS/SupplementTabBar";

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

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Batch[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ocrModalOpen, setOcrModalOpen] = useState(false);

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
  };

  const handleClearSearch = async () => {
    setQuery("");
    await loadBatches("", 1);
  };

  const handlePageChange = async (page: number) => {
    await loadBatches(query, page);
  };

  return (
    <DashboardLayout>
      <SupplementTabBar activeId="inventory" />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Current Inventory
            </h1>
          </div>

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
            onOpenOCR={() => setOcrModalOpen(true)}
          />

          {/* OCR Modal */}
          <OCRModal
            isOpen={ocrModalOpen}
            onClose={() => setOcrModalOpen(false)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
