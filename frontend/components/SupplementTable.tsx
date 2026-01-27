import React, { useState } from "react";
import {
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  Plus,
  Upload,
} from "lucide-react";
import axios from "axios";

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
}) => {
  console.log("SupplementTable props:", {
    supplements,
    total,
    loading,
    searchQuery,
  });
  const [selectedSupplements, setSelectedSupplements] = useState<number[]>([]);

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
    // Navigate to add supplement form or open modal
    window.location.href = "/supplements/add";
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
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Export</span>
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
                <tr key={supplement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="font-medium">
                      {supplement.supplement_name || "N/A"}
                    </span>
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
