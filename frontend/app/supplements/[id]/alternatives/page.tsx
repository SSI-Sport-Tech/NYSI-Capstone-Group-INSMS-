"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import DashboardLayout from "@/components/SSS/DashboardLayout";
import SupplementComparisonGrid from "@/components/SSS/SupplementComparisonGrid";
import { ArrowLeft, Filter, Download, RotateCcw } from "lucide-react";

interface Supplement {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form?: string;
  supplement_status: string;
  batch_testing_org?: string | null;
  product_source_url?: string[] | string | null;
  description?: string;
  serving_size?: string;
  ingredients?: string;
  notes?: string;
  similarity_score_100g?: string;
  similarity_score_perserving?: string | null;
  stock_status?: string;
  nutritional_info?: {
    energy?: string;
    protein?: string;
    total_fat?: string;
    saturated_fat?: string;
    trans_fat?: string;
    cholesterol?: string;
    carbohydrates?: string;
    total_sugars?: string;
    dietary_fibre?: string;
    sodium?: string;
  };
}

interface AlternativesData {
  currentSupplementId: string;
  currentSupplementName: string;
  alternatives: Supplement[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  threshold: number;
}

export default function SupplementAlternativesPage() {
  const params = useParams();
  const router = useRouter();
  const [alternativesData, setAlternativesData] =
    useState<AlternativesData | null>(null);
  const [currentSupplement, setCurrentSupplement] = useState<Supplement | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<"grid" | "detailed">(
    "grid",
  );
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (params.id) {
      loadAlternatives();
    }
  }, [params.id]);

  const loadAlternatives = async (page = 1) => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await axios.get(
        `${apiUrl}/api/SSS/supplements/${params.id}/alternatives?page=${page}`,
      );

      const data = response.data;

      if (!data.currentSupplementId) {
        setError("Supplement not found");
        return;
      }

      // Create current supplement object from response data
      const currentSupp: Supplement = {
        id: data.currentSupplementId,
        supplement_name: data.currentSupplementName,
        supplement_brand: "", // Will be populated from detail view if needed
        supplement_status: "CURRENT",
      };

      setCurrentSupplement(currentSupp);
      setAlternativesData({
        currentSupplementId: data.currentSupplementId,
        currentSupplementName: data.currentSupplementName,
        alternatives: data.alternatives || [],
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        totalCount: data.totalCount || 0,
        threshold: data.threshold || 0.6,
      });
      setCurrentPage(data.currentPage || 1);

      // Auto-select the current supplement
      setSelectedSupplements([data.currentSupplementId]);
    } catch (err) {
      setError("Failed to load supplement alternatives");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplementSelect = (supplementId: string, selected: boolean) => {
    if (selected) {
      setSelectedSupplements((prev) => [...prev, supplementId]);
    } else {
      setSelectedSupplements((prev) =>
        prev.filter((id) => id !== supplementId),
      );
    }
  };

  const clearComparison = () => {
    setSelectedSupplements(
      alternativesData ? [alternativesData.currentSupplementId] : [],
    );
  };

  const handlePageChange = (newPage: number) => {
    loadAlternatives(newPage);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">
                Loading supplement alternatives...
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !alternativesData) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">
                {error || "Failed to load alternatives"}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Supplement
              </button>
            </div>
          </div>

          {/* Title and Statistics */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
              Supplement Alternatives
            </h1>
            <p className="text-lg text-gray-600">
              Comparing{" "}
              <span className="font-semibold">
                {alternativesData.currentSupplementName}
              </span>
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>
                {alternativesData.totalCount} total alternatives found
              </span>
              <span>•</span>
              <span>
                Page {alternativesData.currentPage} of{" "}
                {alternativesData.totalPages}
              </span>
              <span>•</span>
              <span>
                Threshold: {(alternativesData.threshold * 100).toFixed(0)}%
                similarity
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex bg-white border border-gray-300 rounded-lg">
                <button
                  onClick={() => setComparisonMode("grid")}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                    comparisonMode === "grid"
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Grid View
                </button>
                <button
                  onClick={() => setComparisonMode("detailed")}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                    comparisonMode === "detailed"
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Detailed View
                </button>
              </div>

              <button
                onClick={clearComparison}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Selection
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {selectedSupplements.length} supplements selected
              </span>

              <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>

              <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                <Download className="w-4 h-4" />
                Export Comparison
              </button>
            </div>
          </div>

          {/* Pagination Controls */}
          {alternativesData.totalPages > 1 && (
            <div className="mb-6 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: alternativesData.totalPages },
                  (_, i) => i + 1,
                ).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg ${
                      page === currentPage
                        ? "bg-blue-500 text-white"
                        : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === alternativesData.totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {/* Comparison Grid */}
          <SupplementComparisonGrid
            original={currentSupplement}
            alternatives={alternativesData.alternatives}
            selectedSupplements={selectedSupplements}
            onSupplementSelect={handleSupplementSelect}
            comparisonMode={comparisonMode}
            comparisonCriteria={[]}
            alternativesData={alternativesData}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
