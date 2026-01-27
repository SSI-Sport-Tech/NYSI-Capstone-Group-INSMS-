import React from "react";
import { Search, Upload } from "lucide-react";
import Link from "next/link";

interface SearchSectionProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onClear: () => void;
  loading: boolean;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  query,
  onQueryChange,
  onSearch,
  onClear,
  loading,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Search Supplements
        </h2>
        <p className="text-sm text-gray-500">
          Search the supplement database by name or ingredient
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your search here..."
            className="w-full pl-11 pr-4 py-2.5 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow"
            disabled={loading}
          />
        </div>

        <Link
          href="/ocr"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Image</span>
        </Link>

        <button
          onClick={onSearch}
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Search</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SearchSection;
