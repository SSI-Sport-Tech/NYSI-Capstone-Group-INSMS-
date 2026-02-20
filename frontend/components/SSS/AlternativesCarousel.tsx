"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, AlertCircle, Zap } from "lucide-react";

interface Alternative {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_status: string;
  stock_status: string;
  similarity_score_100g: string;
  similarity_score_perserving?: string | null;
  batch_testing_org?: string | null;
}

interface AlternativesCarouselProps {
  supplementId: string;
  supplementName: string;
  onAlternativeSelect?: (supplement: Alternative) => void;
  onFilterToggle?: (show: boolean) => void;
}

const AlternativesCarousel: React.FC<AlternativesCarouselProps> = ({
  supplementId,
  supplementName,
  onAlternativeSelect,
  onFilterToggle,
}) => {
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFiltered, setShowFiltered] = useState(false);

  useEffect(() => {
    if (supplementId) {
      fetchAlternatives();
    }
  }, [supplementId]);

  const fetchAlternatives = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `/api/SSS/supplements/${supplementId}/alternatives`,
        { params: { page: 1, limit: 10 } },
      );

      if (response.data?.alternatives) {
        setAlternatives(response.data.alternatives);
      } else {
        setAlternatives([]);
      }
    } catch (err) {
      console.error("Failed to fetch alternatives:", err);
      setError("Unable to load alternatives");
      setAlternatives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    const container = document.getElementById(`carousel-${supplementId}`);
    if (container) {
      const scrollAmount = 320; // card width + gap
      const newPosition =
        direction === "left"
          ? Math.max(0, scrollPosition - scrollAmount)
          : scrollPosition + scrollAmount;

      container.scrollLeft = newPosition;
      setScrollPosition(newPosition);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "BATCH TESTED":
        return "bg-green-100 text-green-800";
      case "NOT BATCH TESTED":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStockColor = (stock: string) => {
    switch (stock?.toLowerCase()) {
      case "available":
        return "bg-green-50 border-green-200 text-green-700";
      case "low stock":
        return "bg-yellow-50 border-yellow-200 text-yellow-700";
      case "out of stock":
        return "bg-red-50 border-red-200 text-red-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const getSimilarityColor = (similarity: string) => {
    const value = parseInt(similarity);
    if (value >= 85) return "text-green-600 font-semibold";
    if (value >= 70) return "text-blue-600 font-semibold";
    return "text-orange-600 font-semibold";
  };

  if (!alternatives.length && !loading && !error) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Similar Alternatives to &quot;{supplementName}&quot;
          </h2>
          {alternatives.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {alternatives.length} found
            </span>
          )}
        </div>
        {alternatives.length > 0 && (
          <button
            onClick={() => {
              setShowFiltered(!showFiltered);
              onFilterToggle?.(!showFiltered);
            }}
            className={`text-sm px-4 py-2 rounded-md font-medium transition-colors ${
              showFiltered
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {showFiltered
              ? "Showing Alternatives Only"
              : "Show Only Alternatives"}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Carousel */}
      {!loading && alternatives.length > 0 && (
        <div className="relative">
          {/* Scroll Buttons */}
          {alternatives.length > 3 && (
            <>
              <button
                onClick={() => handleScroll("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-2 hover:bg-gray-100 transition-colors shadow-md"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => handleScroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-2 hover:bg-gray-100 transition-colors shadow-md"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </>
          )}

          {/* Cards Container */}
          <div
            id={`carousel-${supplementId}`}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 px-2"
            style={{
              scrollBehavior: "smooth",
              scrollbarWidth: "thin",
            }}
          >
            {alternatives.map((alternative) => (
              <div
                key={alternative.id}
                className="flex-shrink-0 w-80 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
                onClick={() => onAlternativeSelect?.(alternative)}
              >
                {/* Similarity Score */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-500 font-medium">
                      Similarity Match
                    </div>
                    <div
                      className={`text-2xl ${getSimilarityColor(alternative.similarity_score_100g)}`}
                    >
                      {alternative.similarity_score_100g}
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStockColor(alternative.stock_status)}`}
                  >
                    {alternative.stock_status}
                  </div>
                </div>

                {/* Supplement Name */}
                <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                  {alternative.supplement_name}
                </h3>

                {/* Brand */}
                <p className="text-xs text-gray-600 mb-3">
                  {alternative.supplement_brand}
                </p>

                {/* Status Badges */}
                <div className="flex gap-2 flex-wrap mb-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                      alternative.supplement_status,
                    )}`}
                  >
                    {alternative.supplement_status}
                  </span>
                  {alternative.batch_testing_org && (
                    <span className="text-xs font-medium px-2 py-1 rounded bg-purple-100 text-purple-800">
                      {alternative.batch_testing_org.split(" ")[0]}
                    </span>
                  )}
                </div>

                {/* Similarity Score (if available) */}
                {alternative.similarity_score_perserving && (
                  <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
                    <span className="font-medium">Similarity:</span>{" "}
                    {alternative.similarity_score_perserving}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && alternatives.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            No similar alternatives found. This could mean this supplement has
            unique nutritional profile.
          </p>
        </div>
      )}
    </div>
  );
};

export default AlternativesCarousel;
