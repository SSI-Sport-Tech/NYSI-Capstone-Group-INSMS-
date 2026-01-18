import React from "react";
import { ArrowUpDown, ChevronDown, Trash2, Settings, Upload, Plus, MoreVertical } from "lucide-react";

interface Batch {
  id: number;
  batch_number: string;
  supplement_name: string;
  supplement_brand: string;
  batch_status: string;
  batch_initial_quantity: number;
  booked: number;
  available: number;
  batch_expiration_date: string;
  batch_price: number;
}

interface BatchTableProps {
  batches: Batch[];
  total: number;
  loading: boolean;
  searchQuery?: string;
}

const getStatusBadgeClass = (status: string) => {
  if (status === "In Stock") {
    return "bg-green-100 text-green-800";
  } else if (status === "Low Stock") {
    return "bg-orange-100 text-orange-800";
  } else if (status === "No Stock") {
    return "bg-red-100 text-red-800";
  } else {
    return "bg-gray-100 text-gray-800";
  }
};

const BatchTable: React.FC<BatchTableProps> = ({
  batches,
  total,
  loading,
  searchQuery,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            All Supplements ({total})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage and view supplements
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5">
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
          <button className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5">
            <Settings className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <button className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5">
            <Upload className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button className="bg-black text-white px-4 py-1.5 rounded text-sm flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add to Inventory</span>
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
                  <span>Batch #</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
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
                  <span>Stock Status</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                <div className="flex items-center space-x-1">
                  <span>Batch Size</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                <div className="flex items-center space-x-1">
                  <span>Booked</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                <div className="flex items-center space-x-1">
                  <span>Available</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                <div className="flex items-center space-x-1">
                  <span>Expiration</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
                <div className="flex items-center space-x-1">
                  <span>Batch Price</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-3 text-left w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  Loading batches...
                </td>
              </tr>
            ) : batches.length > 0 ? (
              batches.map((batch, index) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      defaultChecked={index < 6}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {batch.batch_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="font-semibold underline">
                      Bold text column
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {batch.supplement_brand}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                        batch.batch_status || ""
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 bg-current rounded-full mr-1.5"></span>
                      {batch.batch_status || "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {batch.batch_initial_quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {batch.booked}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {batch.available}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {batch.batch_expiration_date
                      ? new Date(
                          batch.batch_expiration_date
                        ).toLocaleDateString("en-US")
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    $
                    {batch.batch_price
                      ? Number(batch.batch_price).toFixed(2)
                      : "N/A"}
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
                <td
                  colSpan={11}
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
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">1 - 10 of {total} items</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
            disabled
          >
            Previous
          </button>
          <button className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900">
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchTable;
