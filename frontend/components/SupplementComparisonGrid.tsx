"use client";

import { useState } from "react";
import { Check, X, Star, ExternalLink, Package } from "lucide-react";

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
}

const SupplementComparisonGrid: React.FC<SupplementComparisonGridProps> = ({
  original,
  alternatives,
  selectedSupplements,
  onSupplementSelect,
  comparisonMode,
  comparisonCriteria,
  alternativesData,
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

  const SupplementCard: React.FC<{
    supplement: Supplement;
    isOriginal?: boolean;
  }> = ({ supplement, isOriginal = false }) => {
    const isSelected = selectedSupplements.includes(supplement.id);

    return (
      <div
        className={`bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-lg ${
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
        } ${isOriginal ? "ring-2 ring-yellow-300" : ""}`}
        onClick={() => handleSupplementToggle(supplement)}
      >
        <div className="p-6">
          {/* Header with selection indicator */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {isSelected && (
                <div className="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              {isOriginal && (
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
              )}
            </div>
            <div className="flex flex-col gap-1 items-end">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(supplement.supplement_status)}`}
              >
                {supplement.supplement_status}
              </span>
              {supplement.stock_status && (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStockStatusColor(supplement.stock_status)}`}
                >
                  {supplement.stock_status}
                </span>
              )}
            </div>
          </div>

          {/* Similarity Scores */}
          {(supplement.similarity_score_100g ||
            supplement.similarity_score_perserving) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-xs font-medium text-blue-800 mb-2">
                Similarity Scores
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {supplement.similarity_score_100g && (
                  <div>
                    <span className="text-blue-600">Per 100g: </span>
                    <span className="font-semibold text-blue-800">
                      {supplement.similarity_score_100g}
                    </span>
                  </div>
                )}
                {supplement.similarity_score_perserving && (
                  <div>
                    <span className="text-blue-600">Per Serving: </span>
                    <span className="font-semibold text-blue-800">
                      {supplement.similarity_score_perserving}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {supplement.supplement_name}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {supplement.supplement_brand}
          </p>

          {/* Key Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Form:</span>
              <span className="font-medium">
                {supplement.supplement_packaging_form || "N/A"}
              </span>
            </div>

            {supplement.serving_size && (
              <div className="text-sm">
                <span className="text-gray-600">Serving Size: </span>
                <span className="font-medium">{supplement.serving_size}</span>
              </div>
            )}

            {supplement.batch_testing_org && (
              <div className="text-sm">
                <span className="text-gray-600">Testing Org: </span>
                <span className="font-medium">
                  {supplement.batch_testing_org}
                </span>
              </div>
            )}
          </div>

          {/* Nutritional Info Preview */}
          {supplement.nutritional_info && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Key Nutrients
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {supplement.nutritional_info.protein && (
                  <div>
                    <span className="text-gray-500">Protein: </span>
                    <span className="font-medium">
                      {supplement.nutritional_info.protein}
                    </span>
                  </div>
                )}
                {supplement.nutritional_info.energy && (
                  <div>
                    <span className="text-gray-500">Energy: </span>
                    <span className="font-medium">
                      {supplement.nutritional_info.energy}
                    </span>
                  </div>
                )}
                {supplement.nutritional_info.carbohydrates && (
                  <div>
                    <span className="text-gray-500">Carbs: </span>
                    <span className="font-medium">
                      {supplement.nutritional_info.carbohydrates}
                    </span>
                  </div>
                )}
                {supplement.nutritional_info.total_fat && (
                  <div>
                    <span className="text-gray-500">Fat: </span>
                    <span className="font-medium">
                      {supplement.nutritional_info.total_fat}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Source Links */}
          {supplement.product_source_url && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  Product Source Available
                </span>
              </div>
            </div>
          )}
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
                      {supplement[field.key as keyof Supplement] || "N/A"}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
