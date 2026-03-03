"use client";

import React, { useState } from "react";

interface NutritionalInfoProps {
  nutritionalInfoPer100g?: {
    [key: string]: number;
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

  const hasPer100gData =
    nutritionalInfoPer100g && Object.keys(nutritionalInfoPer100g).length > 0;
  const hasPerServingData =
    nutritionalInfoPerServing &&
    Object.keys(nutritionalInfoPerServing).length > 0;

  // Set default tab based on available data
  React.useEffect(() => {
    if (!hasPer100gData && hasPerServingData) {
      setActiveTab("perServing");
    } else if (hasPer100gData) {
      setActiveTab("per100g");
    }
  }, [hasPer100gData, hasPerServingData]);

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Nutritional Information
        </h2>

        {/* Tab Switcher */}
        {(hasPer100gData || hasPerServingData) && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("per100g")}
              disabled={!hasPer100gData}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === "per100g"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              } ${!hasPer100gData ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Per 100g
            </button>
            <button
              onClick={() => setActiveTab("perServing")}
              disabled={!hasPerServingData}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === "perServing"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              } ${!hasPerServingData ? "opacity-50 cursor-not-allowed" : ""}`}
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
            {Object.entries(nutritionalInfoPer100g!).map(
              ([key, value], index) => {
                if (value === undefined || value === null) return null;

                return (
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
                );
              },
            )}
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
      </div>

      {/* Page dots indicator */}
      <div className="flex justify-center mt-6 space-x-2">
        {hasPer100gData && (
          <div
            className={`w-2 h-2 rounded-full ${
              activeTab === "per100g" ? "bg-gray-400" : "bg-gray-200"
            }`}
          ></div>
        )}
        {hasPerServingData && (
          <div
            className={`w-2 h-2 rounded-full ${
              activeTab === "perServing" ? "bg-gray-400" : "bg-gray-200"
            }`}
          ></div>
        )}
      </div>
    </div>
  );
};

export default NutritionalInfo;
