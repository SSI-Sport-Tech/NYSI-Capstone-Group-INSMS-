import React, { useState } from "react";
import { Search, X } from "lucide-react";

interface AthleteSearchSectionProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onClear: () => void;
  loading: boolean;
}

const AthleteSearchSection: React.FC<AthleteSearchSectionProps> = ({
  query,
  onQueryChange,
  onSearch,
  onClear,
  loading,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      {/* Search Header */}
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Search Athletes
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Search the athlete database by name, sport, or ID
        </p>
      </div>

      {/* Search Input Area */}
      <div className="pt-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Type athlete name, sport, or ID..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            {query && (
              <button
                onClick={onClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            onClick={onSearch}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AthleteSearchSection;
