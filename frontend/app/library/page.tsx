"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import SupplementTable from "@/components/SSS/SupplementTable";
import ViewTabs from "@/components/SSS/ViewTabs";
import { Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface Supplement {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form: string;
  supplement_status: string;
  batch_testing_org: string | null;
  product_source_url: string[] | string | null;
}

const tabs = [
  {
    id: "inventory",
    label: "Current Inventory View",
    icon: "inventory",
    href: "/inventory",
  },
  {
    id: "scraper",
    label: "Web Scraper View",
    icon: "scraper",
    href: "/web-scraper",
  },
  {
    id: "library",
    label: "Supplement Library",
    icon: "library",
    href: "/library",
  },
];

export default function LibraryPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSupplements();
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
      console.log("API Response:", response.data);

      if (response.data && Array.isArray(response.data.data)) {
        console.log("Setting supplements:", response.data.data);
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
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    loadSupplements(searchQuery, page);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Page Title */}
        <PageHeader title="Supplements" />

        {/* Tabs */}
        <ViewTabs tabs={tabs} />

        {/* Search Input */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Search Library
            </h2>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Search supplements by name, brand, or ingredients..."
                className="w-full px-4 py-2.5 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-8 py-2.5 bg-black text-black rounded-md hover:bg-gray-800 transition-colors font-medium"
            >
              Search
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

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
        />
      </div>
    </DashboardLayout>
  );
}
