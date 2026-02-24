"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ViewTabs from "@/components/SSS/ViewTabs";
import PageHeader from "@/components/PageHeader";
import UrlSelectionModal from "@/components/SSS/UrlSelectionModal";
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
  serving_size: string;
  product_source_url: string;
  price: number;
  description?: string;
  ingredients?: string;
  created_at?: string;
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
  const { token } = useAuth();
  const [stagingSupplements, setStagingSupplements] = useState<
    StagingSupplement[]
  >([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState({
    lastRun: "Today at 9:14 PM",
    scheduled: "Weekly on Mondays",
    nextRun: "Nov 18, 2025",
  });

  // Load staging supplements
  const loadStagingSupplements = async () => {
    try {
      const response = await axios.get("/api/SSS/staging-supplements");
      setStagingSupplements(response.data.data || []);
    } catch (error) {
      console.error("Error loading staging supplements:", error);
    }
  };

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
    setLoading(true);
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
      setLoading(false);
    }
  };

  // Delete selected items
  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    setLoading(true);
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
      setLoading(false);
    }
  };

  // Approve and save to library
  const handleSaveToLibrary = async () => {
    if (selectedItems.size === 0) return;

    setLoading(true);
    try {
      console.log(
        "Sending approval request with IDs:",
        Array.from(selectedItems),
      );
      const response = await axios.post(
        "/api/SSS/staging-supplements/approve",
        { ids: Array.from(selectedItems) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      console.log("Approval response:", response.data);
      await loadStagingSupplements();
      setSelectedItems(new Set());
      alert("Supplements saved to inventory successfully!");
    } catch (error) {
      console.error("Error saving to inventory:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);

        // Handle partial success/failure
        const responseData = error.response.data;
        if (responseData.results && Array.isArray(responseData.results)) {
          console.error("Detailed results:", responseData.results);
          alert(
            `Processing completed with issues:\n${responseData.message}\n\nCheck console for details.`,
          );
        } else {
          alert(
            `Failed to save supplements: ${responseData?.message || responseData || "Unknown error"}`,
          );
        }
      } else {
        alert("Failed to save supplements to inventory. Please try again.");
      }
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
            className="w-full bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Play className="w-4 h-4 mr-2" />
            {loading ? "Starting Scraper..." : "Manually Run Scraper Now"}
          </button>

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
                Supplement Findings
              </h2>
              <p className="text-sm text-gray-600">
                Manage Supplement Findings
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteSelected}
                disabled={selectedItems.size === 0 || loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={selectedItems.size === 0 || loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                Save to Library
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
                      Serving Size <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                    <div className="flex items-center">
                      Product Link <ChevronDown className="w-4 h-4 ml-1" />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                    <div className="flex items-center">
                      Price <ChevronDown className="w-4 h-4 ml-1" />
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
                    <td colSpan={8} className="p-8 text-center text-gray-500">
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
                        {supplement.supplement_packaging_form}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900">
                        {supplement.serving_size || "-"}
                      </td>
                      <td className="p-4">
                        {supplement.product_source_url ? (
                          <a
                            href={supplement.product_source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm font-medium hover:text-blue-800 underline flex items-center"
                          >
                            bodybuilding.com
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-4 text-gray-900">
                        {supplement.price
                          ? `$${supplement.price.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="p-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with pagination if needed */}
          {stagingSupplements.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-700">
              {stagingSupplements.length} supplement
              {stagingSupplements.length !== 1 ? "s" : ""} found
            </div>
          )}
        </div>

        {/* URL Selection Modal */}
        <UrlSelectionModal
          isOpen={showUrlModal}
          onClose={() => setShowUrlModal(false)}
          onStartScraping={handleStartScraping}
          loading={loading}
        />
      </div>
    </DashboardLayout>
  );
}
