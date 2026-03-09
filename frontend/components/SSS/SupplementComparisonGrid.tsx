"use client";

import { useState } from "react";
import {
  Check,
  X,
  Star,
  ExternalLink,
  Package,
  CheckCircle,
  XCircle,
} from "lucide-react";

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

interface SupplementComparisonGridProps {
  original: Supplement | null;
  alternatives: Supplement[];
  selectedSupplements: string[];
  onSupplementSelect: (supplementId: string, selected: boolean) => void;
  comparisonMode: "grid" | "detailed";
  comparisonCriteria: string[];
  alternativesData?: {
    currentSupplementId: string;
    currentSupplementName: string;
    totalCount: number;
    threshold: number;
  };
  onOpenTab?: (s: { id: string; name: string; brand: string }) => void;
}

const SupplementComparisonGrid: React.FC<SupplementComparisonGridProps> = ({
  original,
  alternatives,
  selectedSupplements,
  onSupplementSelect,
  comparisonMode,
  comparisonCriteria,
  alternativesData,
  onOpenTab,
}) => {
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const allSupplements = original ? [original, ...alternatives] : alternatives;
  const selectedSupplementsData = allSupplements.filter((sup) =>
    selectedSupplements.includes(sup.id),
  );

  const handleSupplementToggle = (supplement: Supplement) => {
    const isSelected = selectedSupplements.includes(supplement.id);
    onSupplementSelect(supplement.id, !isSelected);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "BATCH TESTED":
        return "bg-green-100 text-green-800";
      case "NOT BATCH TESTED":
        return "bg-yellow-100 text-yellow-800";
      case "CURRENT":
        return "bg-blue-100 text-blue-800";
      case "APPROVED":
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "DISCONTINUED":
      case "INACTIVE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStockStatusColor = (stockStatus: string) => {
    switch (stockStatus?.toLowerCase()) {
      case "available":
        return "bg-green-100 text-green-800";
      case "low stock":
        return "bg-yellow-100 text-yellow-800";
      case "out of stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Helper function to get similarity score color
  const getSimilarityColor = (score: string): string => {
    const numScore = parseFloat(score);
    if (numScore >= 95) return "text-green-600";
    if (numScore >= 90) return "text-blue-600";
    return "text-gray-600";
  };

  // Helper function to create circular progress SVG
  const CircularProgress: React.FC<{ score: string; size?: number }> = ({
    score,
    size = 80,
  }) => {
    const numScore = parseFloat(score);
    const circumference = 2 * Math.PI * 30; // radius = 30
    const strokeDashoffset = circumference - (numScore / 100) * circumference;

    let strokeColor = "#10b981"; // green
    if (numScore < 95) strokeColor = "#3b82f6"; // blue
    if (numScore < 90) strokeColor = "#6b7280"; // gray

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r="30"
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r="30"
            stroke={strokeColor}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color: strokeColor }}>
            {Math.round(numScore)}
          </span>
        </div>
      </div>
    );
  };

  const SupplementCard: React.FC<{
    supplement: Supplement;
    isOriginal?: boolean;
  }> = ({ supplement, isOriginal = false }) => {
    const isSelected = selectedSupplements.includes(supplement.id);
    const similarityScore =
      supplement.similarity_score_perserving ||
      supplement.similarity_score_100g;

    const handleCardClick = () => {
      if (onOpenTab) {
        onOpenTab({
          id: supplement.id,
          name: supplement.supplement_name,
          brand: supplement.supplement_brand,
        });
      } else {
        onSupplementSelect(supplement.id, !isSelected);
      }
    };

    return (
      <div
        className={`bg-white rounded-lg border transition-all cursor-pointer hover:shadow-md relative ${
          isSelected ? "border-blue-500 shadow-lg" : "border-gray-200"
        }`}
        onClick={handleCardClick}
      >
        <div className="p-6">
          {/* Current supplement badge - positioned at top right to not overlap */}
          {isOriginal && (
            <div className="absolute top-4 right-4 flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs font-medium">
              <Star className="w-3 h-3 fill-current" />
              CURRENT
            </div>
          )}

          {/* Header with name, brand and similarity score */}
          <div className="flex items-start justify-between mb-4">
            <div className={`flex-1 ${isOriginal ? "pr-20" : "pr-4"}`}>
              <h3 className="font-semibold text-gray-900 mb-1 leading-tight">
                {supplement.supplement_name}
              </h3>
              <p className="text-sm text-gray-600">
                {supplement.supplement_brand}
              </p>
            </div>

            {/* Similarity Score Circle */}
            {similarityScore && (
              <div className="flex-shrink-0 flex flex-col items-center">
                <CircularProgress score={similarityScore} />
                <span className="text-xs text-gray-500 mt-1">Similarity</span>
              </div>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Batch Testing Status - Check supplement_status field */}
            {supplement.supplement_status
              ?.toUpperCase()
              .includes("BATCH TESTED") ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                <CheckCircle className="w-3 h-3" />
                Batch Tested
              </span>
            ) : supplement.supplement_status
                ?.toUpperCase()
                .includes("NOT BATCH TESTED") ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                <XCircle className="w-3 h-3" />
                Not Batch Tested
              </span>
            ) : null}

            {/* Stock Status */}
            {supplement.stock_status &&
            supplement.stock_status.toLowerCase() === "out of stock" ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                <XCircle className="w-3 h-3" />
                Out of Stock
              </span>
            ) : (
              supplement.stock_status && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                  <CheckCircle className="w-3 h-3" />
                  {supplement.stock_status}
                </span>
              )
            )}
          </div>

          {/* Form Information */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4" />
            <span>Form: {supplement.supplement_packaging_form || "N/A"}</span>
          </div>
        </div>
      </div>
    );
  };

  const DetailedComparisonTable = () => {
    if (selectedSupplementsData.length === 0) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Select supplements to compare</p>
        </div>
      );
    }

    const comparisonFields = [
      { key: "supplement_name", label: "Name" },
      { key: "supplement_brand", label: "Brand" },
      { key: "supplement_packaging_form", label: "Form" },
      { key: "supplement_status", label: "Status" },
      { key: "stock_status", label: "Stock Status" },
      { key: "similarity_score_100g", label: "Similarity (100g)" },
      { key: "similarity_score_perserving", label: "Similarity (Per Serving)" },
      { key: "serving_size", label: "Serving Size" },
      { key: "batch_testing_org", label: "Testing Organization" },
    ];

    const nutritionalFields = [
      { key: "energy", label: "Energy" },
      { key: "protein", label: "Protein" },
      { key: "total_fat", label: "Total Fat" },
      { key: "carbohydrates", label: "Carbohydrates" },
      { key: "sodium", label: "Sodium" },
    ];

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attribute
                </th>
                {selectedSupplementsData.map((supplement) => (
                  <th
                    key={supplement.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-2">
                      {original && supplement.id === original.id && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      {alternativesData &&
                        supplement.id ===
                          alternativesData.currentSupplementId &&
                        !original && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      {supplement.supplement_name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Basic Info */}
              {comparisonFields.map((field) => (
                <tr key={field.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {field.label}
                  </td>
                  {selectedSupplementsData.map((supplement) => (
                    <td
                      key={supplement.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {(() => {
                        const value = supplement[field.key as keyof Supplement];
                        if (typeof value === "string") {
                          return value;
                        }
                        if (Array.isArray(value)) {
                          return value.join(", ");
                        }
                        if (typeof value === "object" && value !== null) {
                          return JSON.stringify(value);
                        }
                        return "N/A";
                      })()}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Nutritional Info */}
              <tr className="bg-gray-25">
                <td
                  colSpan={selectedSupplementsData.length + 1}
                  className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100"
                >
                  Nutritional Information (per serving)
                </td>
              </tr>
              {nutritionalFields.map((field) => (
                <tr key={field.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {field.label}
                  </td>
                  {selectedSupplementsData.map((supplement) => (
                    <td
                      key={supplement.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {supplement.nutritional_info?.[
                        field.key as keyof typeof supplement.nutritional_info
                      ] || "N/A"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (comparisonMode === "detailed") {
    return <DetailedComparisonTable />;
  }

  return (
    <div className="space-y-6">
      {/* Selection Summary */}
      {selectedSupplements.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              Comparing {selectedSupplements.length} supplements
            </span>
            <button
              onClick={() => setSortBy(sortBy === "name" ? "brand" : "name")}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Sort by {sortBy === "name" ? "Brand" : "Name"}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Current/Original supplement first */}
        {original && <SupplementCard supplement={original} isOriginal={true} />}

        {/* Alternative supplements */}
        {alternatives.map((supplement) => (
          <SupplementCard
            key={supplement.id}
            supplement={supplement}
            isOriginal={
              !original &&
              alternativesData?.currentSupplementId === supplement.id
            }
          />
        ))}
      </div>

      {/* No alternatives message */}
      {alternatives.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Alternatives Found
          </h3>
          <p className="text-gray-500">
            No alternative supplements were found for this product.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupplementComparisonGrid;
