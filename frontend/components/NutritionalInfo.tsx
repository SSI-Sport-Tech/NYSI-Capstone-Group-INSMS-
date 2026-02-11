"use client";

import React, { useState } from "react";

interface NutritionalInfoProps {
  nutritionalInfoPer100g?: {
    energy_kcal?: number;
    protein_g?: number;
    fat_g?: number;
    carbohydrate_g?: number;
    saturated_fat?: number;
    trans_fat?: number;
    cholesterol?: number;
    total_sugars?: number;
    dietary_fibre?: number;
    sodium?: number;
  };
  nutritionalInfoPerServing?: {
    [key: string]: number;
  };
  servingDefinition?: string;
}

const NutritionalInfo: React.FC<NutritionalInfoProps> = ({
  nutritionalInfoPer100g,
  nutritionalInfoPerServing,
  servingDefinition,
}) => {
  const [activeTab, setActiveTab] = useState<"per100g" | "perServing">(
    "per100g",
  );

  // Format the nutrient name for display
  const formatNutrientName = (key: string): string => {
    return key
      .replace(/_/g, " ")
      .replace(/\bg\b/gi, "g")
      .replace(/\bkcal\b/gi, "kcal")
      .replace(/\biu\b/gi, "IU")
      .replace(/\bmcg\b/gi, "mcg")
      .replace(/\bmg\b/gi, "mg")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Format the nutrient value with appropriate units
  const formatNutrientValue = (key: string, value: number): string => {
    if (key.includes("_g")) return `${value}g`;
    if (key.includes("_kcal")) return `${value} kcal`;
    if (key.includes("_iu")) return `${value} IU`;
    if (key.includes("_mcg")) return `${value} mcg`;
    if (key.includes("_mg")) return `${value} mg`;
    return value.toString();
  };

  const hasPer100gData =
    nutritionalInfoPer100g && Object.keys(nutritionalInfoPer100g).length > 0;
  const hasPerServingData =
    nutritionalInfoPerServing &&
    Object.keys(nutritionalInfoPerServing).length > 0;

  // Debug logging
  console.log("NutritionalInfo Debug:", {
    nutritionalInfoPer100g,
    nutritionalInfoPerServing,
    hasPer100gData,
    hasPerServingData,
    activeTab,
  });

  if (!hasPer100gData && !hasPerServingData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Nutritional Information
        </h2>
        <p className="text-sm text-gray-500">
          No nutritional information available
        </p>
      </div>
    );
  }

  // Standard nutritional items for per 100g display
  const per100gItems = [
    { key: "energy_kcal", label: "Energy", unit: "kcal" },
    { key: "protein_g", label: "Protein", unit: "g" },
    { key: "fat_g", label: "Total Fat", unit: "g" },
    {
      key: "saturated_fat",
      label: "- Saturated Fat",
      unit: "g",
      isSubItem: true,
    },
    { key: "trans_fat", label: "- Trans Fat", unit: "g", isSubItem: true },
    { key: "cholesterol", label: "Cholesterol", unit: "mg" },
    { key: "carbohydrate_g", label: "Carbohydrates", unit: "g" },
    { key: "total_sugars", label: "Total Sugars", unit: "g" },
    { key: "dietary_fibre", label: "Dietary Fibre", unit: "g" },
    { key: "sodium", label: "Sodium", unit: "mg" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Nutritional Information
        </h2>

        {/* Tab Switcher */}
        {hasPer100gData && hasPerServingData && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("per100g")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === "per100g"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Per 100g
            </button>
            <button
              onClick={() => setActiveTab("perServing")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === "perServing"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Per Serving
            </button>
          </div>
        )}
      </div>

      {/* Show serving definition if available */}
      {activeTab === "perServing" && servingDefinition && (
        <p className="text-sm text-gray-600 mb-4">{servingDefinition}</p>
      )}

      <div className="space-y-3">
        {/* Per 100g Display */}
        {activeTab === "per100g" && hasPer100gData && (
          <>
            {per100gItems.map((item, index) => {
              const value =
                nutritionalInfoPer100g![
                  item.key as keyof typeof nutritionalInfoPer100g
                ];
              if (value === undefined || value === null) return null;

              return (
                <div
                  key={item.key}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                >
                  <dt
                    className={`text-sm ${
                      item.isSubItem
                        ? "text-gray-600 ml-4"
                        : "text-gray-900 font-medium"
                    }`}
                  >
                    {item.label}
                  </dt>
                  <dd className="text-sm text-gray-900 font-medium">
                    {value}
                    {item.unit}
                  </dd>
                </div>
              );
            })}
          </>
        )}

        {/* Per Serving Display */}
        {activeTab === "perServing" && hasPerServingData && (
          <>
            {Object.entries(nutritionalInfoPerServing!).map(
              ([key, value], index) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                >
                  <dt className="text-sm text-gray-900 font-medium">
                    {formatNutrientName(key)}
                  </dt>
                  <dd className="text-sm text-gray-900 font-medium">
                    {formatNutrientValue(key, value)}
                  </dd>
                </div>
              ),
            )}
          </>
        )}

        {/* Default to per 100g if only one type exists */}
        {!hasPer100gData && hasPerServingData && activeTab === "per100g" && (
          <>
            {Object.entries(nutritionalInfoPerServing!).map(
              ([key, value], index) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                >
                  <dt className="text-sm text-gray-900 font-medium">
                    {formatNutrientName(key)}
                  </dt>
                  <dd className="text-sm text-gray-900 font-medium">
                    {formatNutrientValue(key, value)}
                  </dd>
                </div>
              ),
            )}
          </>
        )}
      </div>

      {/* Page dots indicator */}
      <div className="flex justify-center mt-6 space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${activeTab === "per100g" ? "bg-gray-400" : "bg-gray-200"}`}
        ></div>
        <div
          className={`w-2 h-2 rounded-full ${activeTab === "perServing" ? "bg-gray-400" : "bg-gray-200"}`}
        ></div>
        <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  );
};

export default NutritionalInfo;
