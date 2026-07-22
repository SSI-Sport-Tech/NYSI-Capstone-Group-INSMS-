import React, { useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  Camera,
  MoreVertical,
} from "lucide-react";
import BatchDetailModal from "./BatchDetailModal";
import axios from "axios";

interface Batch {
  id: string;
  product_id: string;
  product_name: string;
  brand: string | null;
  batch_number: string;
  category: string,
  description: string,
  barcode_sku: string;
  quantity_on_hand: number;
  original_stock_amount: number;
  expiry_date: string;
  unit_cost: number;
  supplier: string | null;
  received_date: string | null;
  notes: string | null;
  batch_status: string; // always "-" for now
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
  onSortChange?: (column: string, direction: "asc" | "desc") => void;
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

const getExpiryInfo = (expirationDate: string | null) => {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  const oneMonth = new Date(today);
  oneMonth.setMonth(oneMonth.getMonth() + 1);
  const threeMonths = new Date(today);
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  if (exp < today) return { dot: "bg-red-500", badge: "bg-red-100 text-red-700 border border-red-200" };
  if (exp < oneMonth) return { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border border-orange-200" };
  if (exp < threeMonths) return { dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700 border border-yellow-200" };
  return { dot: "bg-green-500", badge: "bg-green-100 text-green-700 border border-green-200" };
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
  onSortChange,
}) => {
  const [detailBatch, setDetailBatch] = useState<Batch | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Handle export
  const handleExport = async () => {
    try {
      const response = await axios.get("/api/SSS/batches/export", {
        params: {
          sortBy: sortColumn || "product_name",
          sortDirection: sortDirection,
        },
      });

      const allBatches: Batch[] = response.data.data;

      // Convert batches to CSV
      const headers = [
        "Product",
        "Brand",
        "Batch Number",
        "Category",
        "Description",
        "Barcode SKU",
        "Quantity On Hand",
        "Original Quantity",
        "Expiry Date",
        "Unit Cost",
        "Supplier",
        "Received Date",
        "Notes",
      ];
      const csvContent = [
        headers.join(","),
        ...allBatches.map((batch) =>
          [
            batch.product_name,
            batch.brand ?? "",
            batch.batch_number,
            batch.category ?? "",
            batch.description ?? "",
            `="${batch.barcode_sku ?? ""}"`,
            batch.quantity_on_hand,
            batch.original_stock_amount,
            batch.expiry_date
              ? new Date(batch.expiry_date).toLocaleDateString("en-GB")
              : "",
            batch.unit_cost,
            batch.supplier ?? "",
            batch.received_date
              ? new Date(batch.received_date).toLocaleDateString("en-GB")
              : "",
            batch.notes ?? "",
          ].map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;", });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to export inventory.");
  }
};

  const handleSort = (column: string) => {
    let direction: "asc" | "desc";

    if (sortColumn === column) {
      direction = sortDirection === "asc" ? "desc" : "asc";
    } else {
      direction = "asc";
    }

    setSortColumn(column);
    setSortDirection(direction);
    onSortChange?.(column, direction);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3" />;
    return sortDirection === "asc"
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            All Inventory Batches ({total})
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            View inventory batches synced from ICS
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Table */}
      <div className="px-5">
        <div className="overflow-hidden rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  onClick={() => handleSort("product_name")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Supplement Name</span>
                    <SortIcon column="product_name" />
                  </div>
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
                  onClick={() => handleSort("brand")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Brand</span>
                    <SortIcon column="brand" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("category")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Category</span>
                    <SortIcon column="category" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("description")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Description</span>
                    <SortIcon column="description" />
                  </div>
                </th>
                {/* <th
                  onClick={() => handleSort("batch_status")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Stock Status</span>
                    <SortIcon column="batch_status" />
                  </div>
                </th> */}
                <th
                  onClick={() => handleSort("quantity_on_hand")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Available</span>
                    <SortIcon column="quantity_on_hand" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("unit_cost")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Unit Cost</span>
                    <SortIcon column="unit_cost" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("expiry_date")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">Expiry Date</span>
                    <SortIcon column="expiry_date" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("barcode_sku")}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span className="whitespace-nowrap">SKU</span>
                    <SortIcon column="barcode_sku" />
                  </div>
                </th>
                <th className="px-3 py-3 text-left w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading batches...
                  </td>
                </tr>
              ) : batches.length > 0 ? (
                batches.map((batch, index) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.product_name}
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                      {batch.batch_number}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.brand || "-"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.category || "-"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.description || "-"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 text-center">
                      {batch.quantity_on_hand}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      ${Number(batch.unit_cost).toFixed(2)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.expiry_date ? (() => {
                        const info = getExpiryInfo(batch.expiry_date);
                        return (
                          <span className={info ? `px-1.5 py-0.5 rounded text-xs font-medium ${info.badge}` : ""}>
                            {new Date(batch.expiry_date).toLocaleDateString("en-GB")}
                          </span>
                        );
                      })() : "-"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {batch.barcode_sku || "-"}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <button
                        onClick={() => setDetailBatch(batch)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="View Details"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
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

      {detailBatch && (
        <BatchDetailModal
          isOpen={!!detailBatch}
          batch={detailBatch}
          onClose={() => setDetailBatch(null)}
          onSaved={() => {
            setDetailBatch(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default BatchTable;
