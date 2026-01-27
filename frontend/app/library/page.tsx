"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import ViewTabs from "@/components/ViewTabs";
import { Search, Filter, Grid, List, Globe } from "lucide-react";

interface Supplement {
  id: number;
  supplement_name: string;
  supplement_brand: string;
  supplement_description: string;
  supplement_dose_form: string;
  supplement_ingredient: string[];
  supplement_website: string;
}

const tabs = [
  {
    id: "inventory",
    label: "Current Inventory View",
    icon: "globe",
    href: "/inventory",
  },
  {
    id: "scraper",
    label: "Web Scraper View",
    icon: "search",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    loadSupplements();
  }, []);

  const loadSupplements = async (search = "") => {
    setLoading(true);
    setError("");

    try {
      const params: { page: number; search?: string } = { page: 1 };
      if (search.trim()) {
        params.search = search;
      }

      const response = await axios.get("/api/SSS/supplements", { params });

      if (response.data && Array.isArray(response.data.data)) {
        setSupplements(response.data.data);
        setTotal(response.data.totalCount || 0);
      } else {
        setSupplements([]);
        setTotal(0);
      }
    } catch (err) {
      setError("Failed to load supplements library.");
      console.error(err);
      setSupplements([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadSupplements(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getIngredientTags = (ingredients: string[] | string) => {
    if (!ingredients) return [];
    const ingredientArray = Array.isArray(ingredients)
      ? ingredients
      : [ingredients];
    return ingredientArray.slice(0, 3);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Supplements</h1>

        {/* Tabs */}
        <ViewTabs tabs={tabs} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Library Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Search className="w-5 h-5 text-blue-600 mr-2" />
                Supplement Library
              </h2>
              <p className="text-sm text-gray-500">
                Browse and search our comprehensive supplement database
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${
                  viewMode === "grid"
                    ? "bg-gray-200"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${
                  viewMode === "list"
                    ? "bg-gray-200"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Search supplements, brands, or ingredients..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              />
            </div>
            <button className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Search
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {searchQuery
                ? `Search Results (${total})`
                : `All Supplements (${total})`}
            </h3>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">
              Loading supplements...
            </div>
          ) : supplements.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {supplements.map((supplement) => (
                  <div
                    key={supplement.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {supplement.supplement_name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {supplement.supplement_brand}
                    </p>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                      {supplement.supplement_description ||
                        "No description available"}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {getIngredientTags(supplement.supplement_ingredient).map(
                        (ingredient, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {ingredient}
                          </span>
                        )
                      )}
                    </div>
                    {supplement.supplement_dose_form && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {supplement.supplement_dose_form}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {supplements.map((supplement) => (
                  <div
                    key={supplement.id}
                    className="px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {supplement.supplement_name}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {supplement.supplement_brand}
                        </p>
                        <p className="text-sm text-gray-500 mb-2">
                          {supplement.supplement_description ||
                            "No description available"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {getIngredientTags(
                            supplement.supplement_ingredient
                          ).map((ingredient, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {ingredient}
                            </span>
                          ))}
                        </div>
                      </div>
                      {supplement.supplement_dose_form && (
                        <span className="ml-4 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded whitespace-nowrap">
                          {supplement.supplement_dose_form}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              {searchQuery
                ? "No supplements found matching your search."
                : "No supplements available in library."}
            </div>
          )}

          {/* Pagination */}
          {supplements.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  1 - 10 of {total} items
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                  disabled
                >
                  Previous
                </button>
                <button className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
