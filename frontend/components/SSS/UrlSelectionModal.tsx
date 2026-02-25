"use client";

import React, { useState, useEffect } from "react";
import { X, Play, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

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
  const { token } = useAuth();
  const [catalogUrls, setCatalogUrls] = useState<CatalogUrl[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  // Add URL state
  const [newUrl, setNewUrl] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Per-row action loading (keyed by URL id)
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCatalogUrls = async () => {
    try {
      const response = await axios.get("/api/SSS/catalog-urls");
      setCatalogUrls(response.data.data || []);
    } catch (error) {
      console.error("Error loading catalog URLs:", error);
    }
  };

  useEffect(() => {
    if (isOpen) loadCatalogUrls();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUrls(new Set());
      setNewUrl("");
      setAddError("");
    }
  }, [isOpen]);

  // ── Scraping selection ────────────────────────────────────────────────────

  const handleUrlSelect = (urlId: string) => {
    const next = new Set(selectedUrls);
    if (next.has(urlId)) next.delete(urlId);
    else next.add(urlId);
    setSelectedUrls(next);
  };

  const handleSelectAllUrls = () => {
    const activeUrls = catalogUrls.filter((u) => u.is_active);
    if (selectedUrls.size === activeUrls.length) setSelectedUrls(new Set());
    else setSelectedUrls(new Set(activeUrls.map((u) => u.id)));
  };

  const handleStartScraping = () => {
    if (selectedUrls.size === 0) {
      alert("Please select at least one URL to scrape.");
      return;
    }
    onStartScraping(Array.from(selectedUrls));
  };

  // ── Add URL ───────────────────────────────────────────────────────────────

  const handleAddUrl = async () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setAddError("");
    setAddLoading(true);
    try {
      const res = await axios.post(
        "/api/SSS/catalog-urls",
        { product_catalog_website: trimmed, is_active: true },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCatalogUrls((prev) => [...prev, res.data.data]);
      setNewUrl("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setAddError(err.response?.data?.message || "Failed to add URL.");
      } else {
        setAddError("Failed to add URL.");
      }
    } finally {
      setAddLoading(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async (url: CatalogUrl) => {
    setTogglingId(url.id);
    try {
      await axios.patch(
        `/api/SSS/catalog-urls/${url.id}`,
        { is_active: !url.is_active },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setCatalogUrls((prev) =>
        prev.map((u) => (u.id === url.id ? { ...u, is_active: !u.is_active } : u)),
      );
      // Deselect if being made inactive
      if (url.is_active) {
        setSelectedUrls((prev) => {
          const next = new Set(prev);
          next.delete(url.id);
          return next;
        });
      }
    } catch (err) {
      console.error("Error toggling URL active state:", err);
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete URL ────────────────────────────────────────────────────────────

  const handleDeleteUrl = async (urlId: string) => {
    setDeletingId(urlId);
    try {
      await axios.delete("/api/SSS/catalog-urls", {
        data: { ids: [urlId] },
        headers: { Authorization: `Bearer ${token}` },
      });
      setCatalogUrls((prev) => prev.filter((u) => u.id !== urlId));
      setSelectedUrls((prev) => {
        const next = new Set(prev);
        next.delete(urlId);
        return next;
      });
    } catch (err) {
      console.error("Error deleting catalog URL:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  const activeUrls = catalogUrls.filter((u) => u.is_active);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
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

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Add URL */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Add New URL
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => { setNewUrl(e.target.value); setAddError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                  placeholder="https://example.com/products"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={handleAddUrl}
                  disabled={!newUrl.trim() || addLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
              </div>
              {addError && (
                <p className="text-xs text-red-500 mt-1">{addError}</p>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* URL List */}
            {catalogUrls.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No catalog URLs yet. Add one above.
              </div>
            ) : (
              <>
                {/* Select All */}
                <div className="pb-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeUrls.length > 0 && selectedUrls.size === activeUrls.length}
                      onChange={handleSelectAllUrls}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      Select All Active URLs
                    </span>
                  </label>
                </div>

                <div className="space-y-2">
                  {catalogUrls.map((url) => (
                    <div
                      key={url.id}
                      className={`flex items-center gap-3 p-3 rounded-md border ${
                        url.is_active
                          ? "border-gray-200 bg-white"
                          : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      {/* Scraping checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedUrls.has(url.id)}
                        onChange={() => handleUrlSelect(url.id)}
                        disabled={!url.is_active}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                      />

                      {/* URL + badge */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${
                            url.is_active ? "text-gray-900" : "text-gray-400"
                          }`}
                          title={url.product_catalog_website}
                        >
                          {url.product_catalog_website}
                        </p>
                      </div>

                      {/* Active badge */}
                      <span
                        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          url.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {url.is_active ? "Active" : "Inactive"}
                      </span>

                      {/* Toggle active button */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(url)}
                        disabled={togglingId === url.id}
                        title={url.is_active ? "Set inactive" : "Set active"}
                        className="shrink-0 text-gray-400 hover:text-blue-600 disabled:opacity-40 transition-colors"
                      >
                        {togglingId === url.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : url.is_active ? (
                          <ToggleRight className="w-5 h-5 text-blue-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteUrl(url.id)}
                        disabled={deletingId === url.id}
                        title="Delete URL"
                        className="shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                      >
                        {deletingId === url.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 shrink-0">
            <div className="text-sm text-gray-600">
              {selectedUrls.size} URL{selectedUrls.size !== 1 ? "s" : ""} selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartScraping}
                disabled={selectedUrls.size === 0 || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
