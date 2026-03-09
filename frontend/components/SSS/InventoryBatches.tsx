import React, { useState } from "react";
import { Trash2, Plus, MoreVertical } from "lucide-react";
import AddSupplementModal from "./AddSupplementModal";
import BatchDetailModal from "./BatchDetailModal";

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
  batch_unit?: string | null;
}

interface InventoryBatchesProps {
  batches: Batch[];
  supplementId: string;
  supplementName: string;
  supplementBrand: string;
  onRefresh?: () => void;
}

const getStatusBadgeClass = (status: string) => {
  const s = status?.toLowerCase().trim();
  if (s === "in stock") return "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800";
  if (s === "low stock") return "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800";
  return "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600";
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

  if (exp < today) return "bg-red-100 text-red-700 border border-red-200";
  if (exp < oneMonth) return "bg-orange-100 text-orange-700 border border-orange-200";
  if (exp < threeMonths) return "bg-yellow-100 text-yellow-700 border border-yellow-200";
  return "bg-green-100 text-green-700 border border-green-200";
};

const InventoryBatches: React.FC<InventoryBatchesProps> = ({
  batches,
  supplementId,
  supplementName,
  supplementBrand,
  onRefresh,
}) => {
  const [selectedBatches, setSelectedBatches] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailBatch, setDetailBatch] = useState<Batch | null>(null);

  const handleSelectAll = (checked: boolean) => {
    setSelectedBatches(checked ? batches.map((b) => b.id) : []);
  };

  const handleSelectBatch = (batchId: number, checked: boolean) => {
    setSelectedBatches((prev) =>
      checked ? [...prev, batchId] : prev.filter((id) => id !== batchId)
    );
  };

  const handleDelete = () => {
    if (selectedBatches.length === 0) {
      alert("Please select batches to delete");
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedBatches.length} batch(es)?`)) {
      console.log("Deleting batches:", selectedBatches);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Inventory Batches</h3>
          <p className="text-sm text-gray-500 mt-0.5">Manage batches for this supplement</p>
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
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Batch</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-b-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedBatches.length === batches.length && batches.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Batch #</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Stock Status</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Available</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Expiration</th>
              <th className="px-3 py-3 text-left w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {batches.length > 0 ? (
              batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedBatches.includes(batch.id)}
                      onChange={(e) => handleSelectBatch(batch.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-4 text-sm font-medium text-gray-900">
                    {batch.batch_number}
                  </td>
                  <td className="px-3 py-4">
                    <span className={getStatusBadgeClass(batch.batch_status)}>
                      {batch.batch_status}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 text-center">
                    {batch.available}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900">
                    {batch.batch_expiration_date ? (() => {
                      const badge = getExpiryInfo(batch.batch_expiration_date);
                      return (
                        <span className={badge ? `px-1.5 py-0.5 rounded text-xs font-medium ${badge}` : ""}>
                          {new Date(batch.batch_expiration_date).toLocaleDateString("en-US")}
                        </span>
                      );
                    })() : "-"}
                  </td>
                  <td className="px-3 py-4 text-center">
                    <button
                      onClick={() => setDetailBatch(batch)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="View / Edit batch"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No batches available for this supplement
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddSupplementModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          if (onRefresh) onRefresh();
        }}
        preselectedSupplement={{
          id: supplementId,
          name: supplementName,
          brand: supplementBrand,
        }}
      />

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

export default InventoryBatches;
