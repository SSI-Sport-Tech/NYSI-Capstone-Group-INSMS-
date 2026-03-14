"use client";

import React, { useState, useEffect } from "react";
import { X, Play, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Settings, List } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

interface CatalogUrl {
  id: string;
  product_catalog_website: string;
  is_active: boolean;
}

interface ScheduleConfig {
  is_enabled: boolean;
  interval_days: number;
  is_running: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface UrlSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScraping: (selectedUrlIds: string[]) => void;
  loading: boolean;
  onScheduleSaved?: () => void;
}

type ActiveTab = "urls" | "scheduler";

const UrlSelectionModal: React.FC<UrlSelectionModalProps> = ({
  isOpen,
  onClose,
  onStartScraping,
  loading,
  onScheduleSaved,
}) => {
  const { token } = useAuth();

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>("urls");

  // ── URL tab state ─────────────────────────────────────────────────────────
  const [catalogUrls, setCatalogUrls] = useState<CatalogUrl[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [newUrl, setNewUrl] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Scheduler tab state ───────────────────────────────────────────────────
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleSaved, setScheduleSaved] = useState(false);
  // Local edit state for the scheduler form
  const [editEnabled, setEditEnabled] = useState(false);
  const [editIntervalDays, setEditIntervalDays] = useState(14);

  // ── Load data on open ─────────────────────────────────────────────────────

  const loadCatalogUrls = async () => {
    try {
      const response = await axios.get("/api/SSS/catalog-urls");
      setCatalogUrls(response.data.data || []);
    } catch (error) {
      console.error("Error loading catalog URLs:", error);
    }
  };

  const loadScheduleConfig = async () => {
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const res = await axios.get("/api/SSS/scraping/schedule");
      const cfg: ScheduleConfig = res.data;
      setScheduleConfig(cfg);
      setEditEnabled(cfg.is_enabled);
      setEditIntervalDays(cfg.interval_days);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 503) {
        setScheduleError("Scheduler service is unavailable. Ensure the Python service is running.");
      } else {
        setScheduleError("Failed to load scheduler configuration.");
      }
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCatalogUrls();
      loadScheduleConfig();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUrls(new Set());
      setNewUrl("");
      setAddError("");
      setActiveTab("urls");
      setScheduleSaved(false);
      setScheduleError("");
    }
  }, [isOpen]);

  // ── URL tab handlers ──────────────────────────────────────────────────────

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

  // ── Scheduler tab handlers ────────────────────────────────────────────────

  const handleSaveScheduler = async () => {
    setScheduleSaving(true);
    setScheduleError("");
    setScheduleSaved(false);
    try {
      const res = await axios.patch(
        "/api/SSS/scraping/schedule",
        { is_enabled: editEnabled, interval_days: editIntervalDays },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setScheduleConfig(res.data);
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 3000);
      onScheduleSaved?.();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setScheduleError(err.response?.data?.message || "Failed to save scheduler config.");
      } else {
        setScheduleError("Failed to save scheduler config.");
      }
    } finally {
      setScheduleSaving(false);
    }
  };

  const fmtDate = (val: string | null) => {
    if (!val) return "—";
    return new Date(val).toLocaleString();
  };

  // ── Render guard ──────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const activeUrls = catalogUrls.filter((u) => u.is_active);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">
              Run / Edit Scraper
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-gray-200 bg-white shrink-0">
            <button
              onClick={() => setActiveTab("urls")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "urls"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-4 h-4" />
              Scraper URLs
            </button>
            <button
              onClick={() => setActiveTab("scheduler")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "scheduler"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Settings className="w-4 h-4" />
              Scheduler Config
            </button>
          </div>

          {/* ── Scraper URLs tab ─────────────────────────────────────────── */}
          {activeTab === "urls" && (
            <>
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
                          <input
                            type="checkbox"
                            checked={selectedUrls.has(url.id)}
                            onChange={() => handleUrlSelect(url.id)}
                            disabled={!url.is_active}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                          />
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
                          <span
                            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              url.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {url.is_active ? "Active" : "Inactive"}
                          </span>
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

              {/* URLs tab footer */}
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
            </>
          )}

          {/* ── Scheduler Config tab ─────────────────────────────────────── */}
          {activeTab === "scheduler" && (
            <>
              <div className="flex-1 overflow-y-auto p-6">
                {scheduleLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading configuration...
                  </div>
                ) : (
                  <div className="space-y-6">

                    {/* Current status info */}
                    {scheduleConfig && (
                      <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium text-gray-700">Status: </span>
                          {scheduleConfig.is_running ? (
                            <span className="text-amber-600 font-medium">Running</span>
                          ) : scheduleConfig.is_enabled ? (
                            <span className="text-green-600 font-medium">Enabled</span>
                          ) : (
                            <span className="text-gray-500 font-medium">Disabled</span>
                          )}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">Last run: </span>
                          {fmtDate(scheduleConfig.last_run_at)}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">Next run: </span>
                          {fmtDate(scheduleConfig.next_run_at)}
                        </p>
                      </div>
                    )}

                    {/* Enable / disable toggle */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                        Scheduler Status
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditEnabled(!editEnabled)}
                          className="shrink-0 focus:outline-none"
                          title={editEnabled ? "Click to disable" : "Click to enable"}
                        >
                          {editEnabled ? (
                            <ToggleRight className="w-8 h-8 text-blue-500" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-400" />
                          )}
                        </button>
                        <span className="text-sm text-gray-700">
                          {editEnabled
                            ? "Scheduler is enabled — scraper will run automatically"
                            : "Scheduler is disabled — scraper will not run automatically"}
                        </span>
                      </div>
                    </div>

                    {/* Interval selector */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                        Scraping Interval
                      </p>
                      <div className="flex items-center gap-3">
                        <select
                          value={editIntervalDays}
                          onChange={(e) => setEditIntervalDays(Number(e.target.value))}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                        >
                          <option value={7}>Every 7 days (weekly)</option>
                          <option value={14}>Every 14 days (bi-weekly)</option>
                          <option value={30}>Every 30 days (monthly)</option>
                        </select>
                        <span className="text-sm text-gray-500">
                          Run the full scraping pipeline automatically
                        </span>
                      </div>
                    </div>

                    {/* Feedback messages */}
                    {scheduleError && (
                      <p className="text-sm text-red-600">{scheduleError}</p>
                    )}
                    {scheduleSaved && (
                      <p className="text-sm text-green-600">Configuration saved successfully.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Scheduler tab footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveScheduler}
                  disabled={scheduleSaving || scheduleLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {scheduleSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default UrlSelectionModal;
