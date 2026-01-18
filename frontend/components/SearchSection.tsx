import React from 'react';
import { Search, Upload } from 'lucide-react';
import Link from 'next/link';

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
  loading
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center space-x-2 mb-2">
        <Search className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Search Supplements</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Search the supplement database by name or ingredient
      </p>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your search here..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
          />
        </div>
        <Link
          href="/ocr"
          className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center space-x-2 whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Image</span>
        </Link>
        <button
          onClick={onSearch}
          disabled={loading}
          className="px-8 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchSection;