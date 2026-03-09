import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Trash2,
  Settings,
  Upload,
  Camera,
  Plus,
  MoreVertical,
} from "lucide-react";
import axios from "axios";
import AddSupplementModal from "./AddSupplementModal";
import { useAuth } from "@/contexts/AuthContext";

interface Batch {
  id: number;
  batch_number: string;
  supplement_id: string;
  supplement_name: string;
  supplement_brand: string;
  batch_status: string;
  batch_initial_quantity: number;
  booked: number;
  available: number;
  batch_expiration_date: string;
  batch_price: number;
  date_added: string;
  inv_batch_testing_org: string | null;
}

interface BatchTableProps {
  batches: Batch[];
  total: number;
  loading: boolean;
  searchQuery?: string;
  onRefresh?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onOpenOCR?: () => void;
}

const getStatusBadgeClass = (status: string) => {
  const normalizedStatus = status?.toLowerCase().trim();

  if (normalizedStatus === "in stock") {
    return "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800";
  } else if (normalizedStatus === "low stock") {
    return "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800";
  } else if (
    normalizedStatus === "no stock" ||
    normalizedStatus === "out of stock"
  ) {
    return "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600";
  } else {
    return "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600";
  }
};

const BatchTable: React.FC<BatchTableProps> = ({
  batches,
  total,
  loading,
  searchQuery,
  onRefresh,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onOpenOCR,
}) => {
  const { token } = useAuth();
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showAddModal, setShowAddModal] = useState(false);

  // Handle checkbox selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBatches(batches.map((batch) => batch.id));
    } else {
      setSelectedBatches([]);
    }
  };

  const handleSelectBatch = (batchId: number, checked: boolean) => {
    if (checked) {
      setSelectedBatches((prev) => [...prev, batchId]);
    } else {
      setSelectedBatches((prev) => prev.filter((id) => id !== batchId));
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (selectedBatches.length === 0) {
      alert("Please select batches to delete");
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete ${selectedBatches.length} batch(es)?`,
      )
    ) {
      try {
        await axios.delete("/api/SSS/batches", {
          data: { ids: selectedBatches },
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedBatches([]);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Error deleting batches:", error);
        alert("Failed to delete batches");
      }
    }
  };

  // Handle export
  const handleExport = () => {
    // Convert batches to CSV
    const headers = [
      "Batch #",
      "Supplement Name",
      "Brand",
      "Status",
      "Initial Quantity",
      "Booked",
      "Available",
      "Expiration",
      "Price",
      "Date Added",
      "Testing Org",
    ];
    const csvContent = [
      headers.join(","),
      ...batches.map((batch) =>
        [
          batch.batch_number,
          batch.supplement_name,
          batch.supplement_brand,
          batch.batch_status,
          batch.batch_initial_quantity,
          batch.booked,
          batch.available,
          batch.batch_expiration_date
            ? new Date(batch.batch_expiration_date).toLocaleDateString()
            : "-",
          batch.batch_price
            ? `$${Number(batch.batch_price).toFixed(2)}`
            : "N/A",
          batch.date_added
            ? new Date(batch.date_added).toLocaleDateString()
            : "-",
          batch.inv_batch_testing_org || "-",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `batches-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3" />;
    return sortDirection === "asc"
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const sortedBatches = [...batches].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: string | number = (a[sortColumn as keyof Batch] ?? "") as string | number;
    let bVal: string | number = (b[sortColumn as keyof Batch] ?? "") as string | number;
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            All Inventory Batches ({total})
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and view supplements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={selectedBatches.length === 0}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg px-3.5 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
            {selectedBatches.length > 0 && (
              <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                {selectedBatches.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg px-3.5 py-2 transition-colors hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg px-3.5 py-2 transition-colors hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={onOpenOCR}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg px-3.5 py-2 transition-colors hover:bg-gray-50"
          >
            <Camera className="w-4 h-4" />
            <span>Label OCR</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Inventory</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-5">
        <div className="overflow-hidden rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={
                      selectedBatches.length === batches.length &&
                      batches.length > 0
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th
                  onClick={() => handleSort("batch_number")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Batch #</span>
                    <SortIcon column="batch_number" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("supplement_name")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Supplement Name</span>
                    <SortIcon column="supplement_name" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("supplement_brand")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Brand</span>
                    <SortIcon column="supplement_brand" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                  <span className="whitespace-nowrap">Testing Org</span>
                </th>
                <th
                  onClick={() => handleSort("batch_status")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Stock Status</span>
                    <SortIcon column="batch_status" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("batch_initial_quantity")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Batch Size</span>
                    <SortIcon column="batch_initial_quantity" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("booked")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Booked</span>
                    <SortIcon column="booked" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("available")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Available</span>
                    <SortIcon column="available" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("batch_expiration_date")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Expiration</span>
                    <SortIcon column="batch_expiration_date" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("batch_price")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Batch Price</span>
                    <SortIcon column="batch_price" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("date_added")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Date Added</span>
                    <SortIcon column="date_added" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={13}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading batches...
                  </td>
                </tr>
              ) : sortedBatches.length > 0 ? (
                sortedBatches.map((batch, index) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selectedBatches.includes(batch.id)}
                        onChange={(e) =>
                          handleSelectBatch(batch.id, e.target.checked)
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                      {batch.batch_number}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <Link
                        href={`/SSS/supplements/${batch.supplement_id}`}
                        className="font-medium text-blue-600 underline cursor-pointer hover:text-blue-800"
                        onClick={() =>
                          console.log(
                            "Clicking supplement link with ID:",
                            batch.supplement_id,
                            "Full batch:",
                            batch,
                          )
                        }
                      >
                        {batch.supplement_name || "Unknown Supplement"}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.supplement_brand}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.inv_batch_testing_org || "-"}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={getStatusBadgeClass(
                          batch.batch_status || "",
                        )}
                      >
                        {batch.batch_status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 text-center">
                      {batch.batch_initial_quantity}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 text-center">
                      {batch.booked}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 text-center">
                      {batch.available}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.batch_expiration_date
                        ? new Date(
                            batch.batch_expiration_date,
                          ).toLocaleDateString("en-US")
                        : "-"}
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                      $
                      {batch.batch_price
                        ? Number(batch.batch_price).toFixed(2)
                        : "N/A"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.date_added
                        ? new Date(batch.date_added).toLocaleDateString("en-US")
                        : "-"}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={13}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {searchQuery
                      ? "No batches found matching your search."
                      : "No batches available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-3 py-4 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-lg">
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {(currentPage - 1) * 10 + 1}
                </span>
                {" - "}
                <span className="font-medium text-gray-900">
                  {Math.min(currentPage * 10, total)}
                </span>
                {" of "}
                <span className="font-medium text-gray-900">{total}</span>{" "}
                results
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange && onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange && onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Supplement Modal */}
      <AddSupplementModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          if (onRefresh) onRefresh();
        }}
        title="Add Batch to Inventory"
      />
    </div>
  );
};

export default BatchTable;
