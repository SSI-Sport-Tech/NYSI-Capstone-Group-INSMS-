"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import { Search, Upload, ArrowUpDown, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

interface Supplement {
  id: number;
  name: string;
  brand: string;
  description: string;
  ingredient: string;
  website: string;
}

interface SearchResponse {
  success: boolean;
  results: Supplement[];
  total: number;
  error?: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Supplement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a search term");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get<SearchResponse>("/api/SSS/search", {
        params: { q: query, scope: "all" },
      });

      if (response.data.success) {
        setResults(response.data.results);
        setTotal(response.data.total);
      } else {
        setError(response.data.error || "Unknown error");
      }
    } catch (err) {
      setError("Search failed. Please check your database connection.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Parse ingredients into tags
  const getIngredientTags = (ingredientString: string) => {
    if (!ingredientString) return [];
    return ingredientString.split(",").map((ing) => ing.trim()).slice(0, 5);
  };

  return (
    <DashboardLayout>
      <div>
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Supplement Search</h1>

        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-blue-600">Search Supplements</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Search our database of supplements by name, brand, or ingredient
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Search supplements..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
            <Link
              href="/ocr"
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Image</span>
            </Link>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                All Supplements ({total})
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ArrowUpDown className="w-4 h-4" />
                <span>Sort By</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Supplement Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Brand</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ingredients</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((supplement) => (
                    <tr key={supplement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {supplement.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {supplement.brand || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {getIngredientTags(supplement.ingredient).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {getIngredientTags(supplement.ingredient).length < supplement.ingredient.split(",").length && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                              +{supplement.ingredient.split(",").length - 5} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        $ N/A
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Rows per page:</span>
                <select className="px-3 py-1 border border-gray-300 rounded text-sm text-black">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronsLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-700">Page 1 of {Math.ceil(total / 10)}</span>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronsRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !error && query && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No supplements found</h3>
            <p className="text-gray-500">Try searching with a different term</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
