"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import SupplementTable from "@/components/SSS/SupplementTable";
import SearchSection from "@/components/SSS/SearchSection";
import OCRModal from "@/components/SSS/OCRModal";
import AddSupplementModal from "@/components/SSS/AddSupplementModal";
import SupplementTabBar from "@/components/SSS/SupplementTabBar";

interface Supplement {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form: string;
  supplement_status: string;
  batch_testing_org: string | null;
  batch_testing_org_url: string | null;
  product_source_url: string[] | string | null;
}

export default function LibraryPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    loadSupplements();
    // Reopen OCR modal if user navigated away mid-session
    try {
      const saved = sessionStorage.getItem("ocr_modal_state");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.step === "verify" || s.step === "result") {
          setOcrModalOpen(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const loadSupplements = async (search = "", page = 1) => {
    setLoading(true);
    setError("");

    try {
      const params: { page: number; search?: string } = { page };
      if (search.trim()) {
        params.search = search;
      }

      const response = await axios.get("/api/SSS/supplements", { params });

      if (response.data && Array.isArray(response.data.data)) {
        setSupplements(response.data.data);
        setTotal(response.data.totalCount || 0);
        setCurrentPage(response.data.currentPage || 1);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setSupplements([]);
        setTotal(0);
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("API Error:", err);
      setError("Failed to load supplements library.");
      setSupplements([]);
      setTotal(0);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadSupplements(searchQuery, 1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    loadSupplements("", 1);
  };

  const handlePageChange = (page: number) => {
    loadSupplements(searchQuery, page);
  };

  return (
    <DashboardLayout>
      <SupplementTabBar activeId="library" />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Supplement Library
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
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            loading={loading}
          />

          {/* Supplement Table */}
          <SupplementTable
            supplements={supplements}
            total={total}
            loading={loading}
            searchQuery={searchQuery}
            onRefresh={() => loadSupplements(searchQuery, currentPage)}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onOpenOCR={() => setOcrModalOpen(true)}
            onAddSupplement={() => setAddModalOpen(true)}
          />

          {/* OCR Modal */}
          <OCRModal
            isOpen={ocrModalOpen}
            onClose={() => setOcrModalOpen(false)}
          />

          {/* Add Supplement Modal */}
          <AddSupplementModal
            isOpen={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            onSuccess={() => {
              setAddModalOpen(false);
              loadSupplements(searchQuery, currentPage);
            }}
            supplementOnly
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
