import React, { useState, useEffect } from "react";
import { X, Play } from "lucide-react";
import axios from "axios";

interface CatalogUrl {
  id: string;
  product_catalog_website: string;
  is_active: boolean;
}

interface UrlSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScraping: (selectedUrlIds: string[]) => void;
  loading: boolean;
}

const UrlSelectionModal: React.FC<UrlSelectionModalProps> = ({
  isOpen,
  onClose,
  onStartScraping,
  loading,
}) => {
  const [catalogUrls, setCatalogUrls] = useState<CatalogUrl[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  // Load catalog URLs
  const loadCatalogUrls = async () => {
    try {
      const response = await axios.get("/api/SSS/catalog-urls");
      setCatalogUrls(response.data.data || []);
    } catch (error) {
      console.error("Error loading catalog URLs:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCatalogUrls();
    }
  }, [isOpen]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUrls(new Set());
    }
  }, [isOpen]);

  // Handle URL selection
  const handleUrlSelect = (urlId: string) => {
    const newSelected = new Set(selectedUrls);
    if (newSelected.has(urlId)) {
      newSelected.delete(urlId);
    } else {
      newSelected.add(urlId);
    }
    setSelectedUrls(newSelected);
  };

  // Handle select all URLs
  const handleSelectAllUrls = () => {
    const activeUrls = catalogUrls.filter((url) => url.is_active);
    if (selectedUrls.size === activeUrls.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(activeUrls.map((url) => url.id)));
    }
  };

  // Handle start scraping
  const handleStartScraping = () => {
    if (selectedUrls.size === 0) {
      alert("Please select at least one URL to scrape.");
      return;
    }
    onStartScraping(Array.from(selectedUrls));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">
              Select URLs to Scrape
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {catalogUrls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No catalog URLs available. Please add some URLs first.
              </div>
            ) : (
              <>
                {/* Select All */}
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        catalogUrls.filter((url) => url.is_active).length > 0 &&
                        selectedUrls.size ===
                          catalogUrls.filter((url) => url.is_active).length
                      }
                      onChange={handleSelectAllUrls}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="font-medium text-gray-900">
                      Select All Active URLs
                    </span>
                  </label>
                </div>

                {/* URL List */}
                <div className="space-y-3">
                  {catalogUrls.map((url) => (
                    <div
                      key={url.id}
                      className={`flex items-center p-3 rounded-md border ${
                        url.is_active
                          ? "border-gray-200 hover:bg-gray-50"
                          : "border-gray-100 bg-gray-50 opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUrls.has(url.id)}
                        onChange={() => handleUrlSelect(url.id)}
                        disabled={!url.is_active}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${
                              url.is_active ? "text-gray-900" : "text-gray-500"
                            }`}
                          >
                            {url.product_catalog_website}
                          </span>
                          {!url.is_active && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {selectedUrls.size} URL{selectedUrls.size !== 1 ? "s" : ""}{" "}
              selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleStartScraping}
                disabled={selectedUrls.size === 0 || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Scraping
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrlSelectionModal;
