import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  Plus,
  Upload,
  Camera,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

interface Supplement {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form: string;
  supplement_status: string;
  batch_testing_org: string | null;
  product_source_url: string[] | string | null;
}

interface SupplementTableProps {
  supplements: Supplement[];
  total: number;
  loading: boolean;
  searchQuery?: string;
  onRefresh?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowSelect?: (supplement: Supplement) => void;
  selectedSupplementId?: string;
  onOpenOCR?: () => void;
  onAddSupplement?: () => void;
}

const getStatusBadgeClass = (status: string) => {
  if (status === "Active" || status === "Available") {
    return "bg-green-100 text-green-800";
  } else if (status === "Pending" || status === "Review") {
    return "bg-yellow-100 text-yellow-800";
  } else if (status === "Inactive" || status === "Discontinued") {
    return "bg-red-100 text-red-800";
  } else {
    return "bg-gray-100 text-gray-800";
  }
};

const SupplementTable: React.FC<SupplementTableProps> = ({
  supplements,
  total,
  loading,
  searchQuery,
  onRefresh,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onRowSelect,
  selectedSupplementId,
  onOpenOCR,
  onAddSupplement,
}) => {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "IT_ADMIN";
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSupplements(supplements.map((s) => s.id));
    } else {
      setSelectedSupplements([]);
    }
  };

  const handleSelectSupplement = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSupplements((prev) => [...prev, id]);
    } else {
      setSelectedSupplements((prev) => prev.filter((sid) => sid !== id));
    }
  };

  const handleDelete = async () => {
    if (selectedSupplements.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedSupplements.length} supplement(s)? This cannot be undone.`,
      )
    )
      return;

    try {
      await axios.delete("/api/SSS/supplements", {
        data: { ids: selectedSupplements },
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedSupplements([]);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting supplements:", error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Failed to delete supplements");
      }
    }
  };

  // Handle export
  const handleExport = () => {
    const headers = [
      "Name",
      "Brand",
      "Form",
      "Status",
      "Testing Org",
      "Website",
    ];
    const csvContent = [
      headers.join(","),
      ...supplements.map((supplement) =>
        [
          supplement.supplement_name || "N/A",
          supplement.supplement_brand || "N/A",
          supplement.supplement_packaging_form || "Unknown",
          supplement.supplement_status || "Unknown",
          supplement.batch_testing_org || "-",
          Array.isArray(supplement.product_source_url)
            ? supplement.product_source_url[0] || "-"
            : supplement.product_source_url || "-",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `supplements-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle add supplement
  const handleAddSupplement = () => {
    onAddSupplement?.();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            All Supplements ({total})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage and view supplement library
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={selectedSupplements.length === 0}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
              {selectedSupplements.length > 0 && (
                <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                  {selectedSupplements.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={onOpenOCR}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5"
          >
            <Camera className="w-4 h-4" />
            <span>Label OCR</span>
          </button>
          <button
            onClick={handleAddSupplement}
            className="bg-black text-white px-4 py-1.5 rounded text-sm flex items-center space-x-2 hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplement</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={
                    selectedSupplements.length === supplements.length &&
                    supplements.length > 0
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                <div className="flex items-center space-x-1">
                  <span>Supplement Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                <div className="flex items-center space-x-1">
                  <span>Brand</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                <div className="flex items-center space-x-1">
                  <span>Form</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                Testing Org
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                Source URL
              </th>
              <th className="px-6 py-3 text-left w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Loading supplements...
                </td>
              </tr>
            ) : supplements.length > 0 ? (
              supplements.map((supplement, index) => (
                <tr
                  key={supplement.id}
                  onClick={() => onRowSelect?.(supplement)}
                  className={`${onRowSelect ? "cursor-pointer" : ""} ${
                    selectedSupplementId === supplement.id
                      ? "bg-blue-50 border-l-2 border-l-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedSupplements.includes(supplement.id)}
                      onChange={(e) =>
                        handleSelectSupplement(supplement.id, e.target.checked)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <Link
                      href={`/SSS/supplements/${supplement.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {supplement.supplement_name || "N/A"}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {supplement.supplement_brand || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {supplement.supplement_packaging_form || "Unknown"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                        supplement.supplement_status || "Unknown",
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 bg-current rounded-full mr-1.5"></span>
                      {supplement.supplement_status || "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {supplement.batch_testing_org || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {(() => {
                      const url = Array.isArray(supplement.product_source_url)
                        ? supplement.product_source_url[0]
                        : supplement.product_source_url;
                      return url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <span>Visit</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        "-"
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 text-center">
                    <button className="text-gray-400 hover:text-gray-600 p-1">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  {searchQuery
                    ? "No supplements found matching your search."
                    : "No supplements available."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} ({total} total items)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplementTable;
