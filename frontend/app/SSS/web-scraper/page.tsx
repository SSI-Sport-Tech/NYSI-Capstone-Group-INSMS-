"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ViewTabs from "@/components/SSS/ViewTabs";
import PageHeader from "@/components/PageHeader";
import UrlSelectionModal from "@/components/SSS/UrlSelectionModal";
import StagingDetailModal from "@/components/SSS/StagingDetailModal";
import {
  Play,
  Clock,
  Trash2,
  Save,
  ChevronDown,
  ExternalLink,
  X,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

interface StagingSupplement {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form: string;
  supplement_status: string;
  batch_testing_org: string | null;
  product_source_url: string | string[] | null;
}

interface CatalogUrl {
  id: string;
  product_catalog_website: string;
  is_active: boolean;
}

const tabs = [
  {
    id: "inventory",
    label: "Current Inventory View",
    icon: "inventory",
    href: "/SSS/inventory",
  },
  {
    id: "scraper",
    label: "Web Scraper View",
    icon: "scraper",
    href: "/SSS/web-scraper",
  },
  {
    id: "library",
    label: "Supplement Library",
    icon: "library",
    href: "/SSS/library",
  },
  {
    id: "batch-testing",
    label: "Batch OCR Testing",
    icon: "batch",
    href: "/SSS/batch-testing",
  },
];

export default function WebScraperPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "IT_ADMIN";
  const [stagingSupplements, setStagingSupplements] = useState<
    StagingSupplement[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [scraperLoading, setScraperLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  interface ApprovalResultItem {
    stagingId: string;
    stagingName: string;
    stagingBrand: string;
    status: "success" | "duplicate" | "failed";
    reason?: string;
    duplicateOf?: {
      name: string;
      brand: string | null;
      similarity_100g: string | null;
      similarity_perserving: string | null;
    };
  }
  const [approvalResults, setApprovalResults] = useState<ApprovalResultItem[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summarySelectedIds, setSummarySelectedIds] = useState<Set<string>>(new Set());
  const [summaryDeleteLoading, setSummaryDeleteLoading] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState({
    lastRun: "Today at 9:14 PM",
    scheduled: "Weekly on Mondays",
    nextRun: "Nov 18, 2025",
  });

  // Initial / refresh load — resets accumulated list back to page 1
  const loadStagingSupplements = async () => {
    try {
      const response = await axios.get("/api/SSS/staging-supplements?page=1");
      const { data, totalPages, totalCount: count } = response.data;
      setStagingSupplements(data || []);
      setTotalCount(count ?? 0);
      setHasMore((totalPages ?? 1) > 1);
      setPage(1);
    } catch (error) {
      console.error("Error loading staging supplements:", error);
    }
  };

  // Append next page to existing list
  const loadMoreSupplements = useCallback(async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await axios.get(
        `/api/SSS/staging-supplements?page=${nextPage}`,
      );
      const { data, totalPages } = response.data;
      setStagingSupplements((prev) => [...prev, ...(data || [])]);
      setHasMore(nextPage < (totalPages ?? 1));
      setPage(nextPage);
    } catch (error) {
      console.error("Error loading more supplements:", error);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [page]);

  // Watch sentinel div — fire loadMore when it scrolls into view
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreSupplements();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMoreSupplements]);

  useEffect(() => {
    loadStagingSupplements();
  }, []);

  // Handle checkbox selection
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.size === stagingSupplements.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(stagingSupplements.map((item) => item.id)));
    }
  };

  // Show URL selection modal
  const handleManualScraping = () => {
    setShowUrlModal(true);
  };

  // Start scraping with selected URLs
  const handleStartScraping = async (selectedUrlIds: string[]) => {
    setScraperLoading(true);
    try {
      await axios.post(
        "/api/SSS/scraping/start",
        { catalog_url_ids: selectedUrlIds },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert("Scraping started successfully!");
      setShowUrlModal(false);
      // Refresh staging supplements after a delay
      setTimeout(() => {
        loadStagingSupplements();
      }, 2000);
    } catch (error) {
      console.error("Error starting scraping:", error);
      alert("Failed to start scraping. Please try again.");
    } finally {
      setScraperLoading(false);
    }
  };

  // Delete selected items
  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    setDeleteLoading(true);
    try {
      await axios.delete("/api/SSS/staging-supplements", {
        data: { ids: Array.from(selectedItems) },
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadStagingSupplements();
      setSelectedItems(new Set());
      alert("Selected supplements deleted successfully!");
    } catch (error) {
      console.error("Error deleting supplements:", error);
      alert("Failed to delete supplements. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Approve and save to library
  const handleSaveToLibrary = async () => {
    if (selectedItems.size === 0) return;

    // Build a brand lookup from current staging list before we modify it
    const brandLookup = new Map(
      stagingSupplements.map((s) => [s.id, s.supplement_brand]),
    );

    setSaveLoading(true);
    try {
      const response = await axios.post(
        "/api/SSS/staging-supplements/approve",
        { ids: Array.from(selectedItems) },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const rawResults: Array<{
        staging_id: string;
        staging_name: string;
        status: string;
        reason?: string;
        duplicate_of?: {
          name: string;
          brand: string | null;
          similarity_100g: string | null;
          similarity_perserving: string | null;
        };
      }> = response.data.results ?? [];

      // Remove successfully approved items from the staging table
      const succeededIds = new Set(
        rawResults.filter((r) => r.status === "success").map((r) => r.staging_id),
      );
      if (succeededIds.size > 0) {
        setStagingSupplements((prev) => prev.filter((s) => !succeededIds.has(s.id)));
        setTotalCount((c) => c - succeededIds.size);
      }
      setSelectedItems(new Set());

      // Map raw results into typed summary items (attach brand from lookup)
      const summaryItems: ApprovalResultItem[] = rawResults.map((r) => ({
        stagingId: r.staging_id,
        stagingName: r.staging_name ?? r.staging_id,
        stagingBrand: brandLookup.get(r.staging_id) ?? "-",
        status: r.status as "success" | "duplicate" | "failed",
        reason: r.reason,
        duplicateOf: r.duplicate_of,
      }));

      setApprovalResults(summaryItems);
      setShowSummaryModal(true);
    } catch (error) {
      console.error("Error saving to inventory:", error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        alert(`Failed to save supplements: ${error.response.data.message}`);
      } else {
        alert("Failed to save supplements to inventory. Please try again.");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  // Toggle a row's selection in the summary modal
  const toggleSummaryItem = (id: string) => {
    setSummarySelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Select / deselect all deletable rows (duplicate + failed)
  const handleSelectAllDeletable = () => {
    const deletable = approvalResults
      .filter((r) => r.status !== "success")
      .map((r) => r.stagingId);
    const allSelected = deletable.every((id) => summarySelectedIds.has(id));
    setSummarySelectedIds(allSelected ? new Set() : new Set(deletable));
  };

  // Delete selected staging entries from within the summary modal
  const handleDeleteSummarySelected = async () => {
    if (summarySelectedIds.size === 0) return;
    setSummaryDeleteLoading(true);
    try {
      const idsToDelete = Array.from(summarySelectedIds);
      await axios.delete("/api/SSS/staging-supplements", {
        data: { ids: idsToDelete },
        headers: { Authorization: `Bearer ${token}` },
      });
      const deletedSet = new Set(idsToDelete);
      setApprovalResults((prev) => prev.filter((r) => !deletedSet.has(r.stagingId)));
      setStagingSupplements((prev) => prev.filter((s) => !deletedSet.has(s.id)));
      setTotalCount((c) => c - deletedSet.size);
      setSummarySelectedIds(new Set());
    } catch (error) {
      console.error("Error deleting staging entries:", error);
      alert("Failed to delete selected entries. Please try again.");
    } finally {
      setSummaryDeleteLoading(false);
    }
  };

  const handleCloseSummary = () => {
    setShowSummaryModal(false);
    setApprovalResults([]);
    setSummarySelectedIds(new Set());
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Page Title */}
        <PageHeader title="Supplements" />

        {/* Tabs */}
        <ViewTabs tabs={tabs} />

        {/* Scraper Status Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Scraper Status
          </h2>
          <div className="text-sm text-gray-600 mb-4">
            Last run: {scrapingStatus.lastRun} | Scheduled:{" "}
            {scrapingStatus.scheduled}
          </div>

          {/* Manual Run Button */}
          <button
            onClick={handleManualScraping}
            disabled={scraperLoading || !isAdmin}
            title={!isAdmin ? "Only admins can run the scraper" : undefined}
            className="w-full bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Play className="w-4 h-4 mr-2" />
            {scraperLoading ? "Starting Scraper..." : "Manually Run Scraper Now"}
          </button>
          {!isAdmin && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Admin access required to run the scraper.
            </p>
          )}

          <div className="flex items-center text-sm text-gray-500 mt-3">
            <Clock className="w-4 h-4 mr-2" />
            Next scheduled run: {scrapingStatus.nextRun}
          </div>
        </div>

        {/* Supplement Findings Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Supplement Findings ({totalCount})
              </h2>
              <p className="text-sm text-gray-600">
                Manage Supplement Findings
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteSelected}
                disabled={selectedItems.size === 0 || deleteLoading}
                className="flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={selectedItems.size === 0 || saveLoading}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveLoading ? "Saving..." : "Save to Library"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      checked={
                        stagingSupplements.length > 0 &&
                        selectedItems.size === stagingSupplements.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                    <div className="flex items-center">
                      Supplement Name <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                    <div className="flex items-center">
                      Brand <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                    <div className="flex items-center">
                      Type <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                    <div className="flex items-center">
                      Batch Testing Org <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                    <div className="flex items-center">
                      Product Link <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                    <div className="flex items-center">
                      Actions <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stagingSupplements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No supplement findings available. Run the scraper to
                      populate this table.
                    </td>
                  </tr>
                ) : (
                  stagingSupplements.map((supplement) => (
                    <tr key={supplement.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(supplement.id)}
                          onChange={() => handleSelectItem(supplement.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900">
                          {supplement.supplement_name}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900">
                        {supplement.supplement_brand}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900">
                        {supplement.supplement_packaging_form || "-"}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900">
                        {supplement.batch_testing_org || "-"}
                      </td>
                      <td className="p-4">
                        {(() => {
                          const firstUrl = Array.isArray(supplement.product_source_url)
                            ? supplement.product_source_url[0]
                            : supplement.product_source_url;
                          if (!firstUrl) return <span className="text-sm text-gray-400">-</span>;
                          let domain = firstUrl;
                          try { domain = new URL(firstUrl).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
                          return (
                            <a
                              href={firstUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-sm font-medium hover:text-blue-800 underline flex items-center"
                            >
                              {domain}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedDetailId(supplement.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sentinel — triggers next page load when scrolled into view */}
          <div ref={sentinelRef} />

          {/* Footer */}
          {(stagingSupplements.length > 0 || loadingMore) && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-700 flex items-center gap-2">
              {loadingMore ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Loading more...
                </>
              ) : (
                <>
                  Showing {stagingSupplements.length} of {totalCount} supplement
                  {totalCount !== 1 ? "s" : ""}
                </>
              )}
            </div>
          )}
        </div>

        {/* URL Selection Modal */}
        <UrlSelectionModal
          isOpen={showUrlModal}
          onClose={() => setShowUrlModal(false)}
          onStartScraping={handleStartScraping}
          loading={scraperLoading}
        />

        {/* Approval Summary Modal */}
        {showSummaryModal && (() => {
          const successCount = approvalResults.filter((r) => r.status === "success").length;
          const dupCount = approvalResults.filter((r) => r.status === "duplicate").length;
          const failCount = approvalResults.filter((r) => r.status === "failed").length;
          const deletable = approvalResults.filter((r) => r.status !== "success");
          const allDeletableSelected =
            deletable.length > 0 && deletable.every((r) => summarySelectedIds.has(r.stagingId));

          return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="fixed inset-0 bg-black bg-opacity-50" />
              <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                  {/* Header */}
                  <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Approval Summary
                      </h3>
                      <div className="flex gap-3 mt-1 text-sm">
                        {successCount > 0 && (
                          <span className="text-green-700 font-medium">
                            ✓ {successCount} added
                          </span>
                        )}
                        {dupCount > 0 && (
                          <span className="text-amber-600 font-medium">
                            ⚠ {dupCount} duplicate{dupCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {failCount > 0 && (
                          <span className="text-red-600 font-medium">
                            ✕ {failCount} error{failCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleCloseSummary}
                      className="text-gray-400 hover:text-gray-600 mt-0.5"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Table */}
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={allDeletableSelected}
                              onChange={handleSelectAllDeletable}
                              disabled={deletable.length === 0}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-30"
                              title="Select all duplicates and errors"
                            />
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Result
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {approvalResults.map((item) => {
                          const isDeletable = item.status !== "success";
                          const details =
                            item.status === "duplicate" && item.duplicateOf
                              ? `Matches "${item.duplicateOf.name}"${item.duplicateOf.brand ? ` by ${item.duplicateOf.brand}` : ""}${item.duplicateOf.similarity_100g ? ` · ${item.duplicateOf.similarity_100g} similarity` : item.duplicateOf.similarity_perserving ? ` · ${item.duplicateOf.similarity_perserving} similarity` : ""}`
                              : item.reason ?? "";

                          return (
                            <tr
                              key={item.stagingId}
                              className={isDeletable && summarySelectedIds.has(item.stagingId) ? "bg-red-50" : "hover:bg-gray-50"}
                            >
                              <td className="px-4 py-3">
                                {isDeletable && (
                                  <input
                                    type="checkbox"
                                    checked={summarySelectedIds.has(item.stagingId)}
                                    onChange={() => toggleSummaryItem(item.stagingId)}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                  />
                                )}
                              </td>
                              <td className="px-3 py-3 font-medium text-gray-900">
                                {item.stagingName}
                              </td>
                              <td className="px-3 py-3 text-gray-600">
                                {item.stagingBrand}
                              </td>
                              <td className="px-3 py-3">
                                {item.status === "success" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Added
                                  </span>
                                )}
                                {item.status === "duplicate" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    Duplicate
                                  </span>
                                )}
                                {item.status === "failed" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Error
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-gray-500 text-xs max-w-xs">
                                {details}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
                    <button
                      onClick={handleDeleteSummarySelected}
                      disabled={summarySelectedIds.size === 0 || summaryDeleteLoading}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      {summaryDeleteLoading
                        ? "Deleting..."
                        : `Delete Selected${summarySelectedIds.size > 0 ? ` (${summarySelectedIds.size})` : ""}`}
                    </button>
                    <button
                      onClick={handleCloseSummary}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Staging Detail / Edit Modal */}
        <StagingDetailModal
          supplementId={selectedDetailId}
          onClose={() => setSelectedDetailId(null)}
          onUpdated={(id, changes) => {
            setStagingSupplements((prev) =>
              prev.map((s) => (s.id === id ? { ...s, ...changes } : s)),
            );
          }}
          onApproved={(id) => {
            setStagingSupplements((prev) => prev.filter((s) => s.id !== id));
            setTotalCount((c) => c - 1);
            setSelectedItems((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            setSelectedDetailId(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
