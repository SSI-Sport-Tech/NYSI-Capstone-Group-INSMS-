"use client";

import { useState } from "react";
import { X } from "lucide-react";
import axios from "axios";
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
  batch_unit?: string | null;
}

interface BatchDetailModalProps {
  isOpen: boolean;
  batch: Batch;
  onClose: () => void;
  onSaved: () => void;
}

export default function BatchDetailModal({ isOpen, batch, onClose, onSaved }: BatchDetailModalProps) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    batch_number: batch.batch_number ?? "",
    batch_initial_quantity: batch.batch_initial_quantity ?? 0,
    batch_unit: batch.batch_unit ?? "",
    batch_price: batch.batch_price != null ? String(batch.batch_price) : "",
    batch_expiration_date: batch.batch_expiration_date
      ? new Date(batch.batch_expiration_date).toISOString().split("T")[0]
      : "",
    inv_batch_testing_org: batch.inv_batch_testing_org ?? "",
  });

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.batch_number.trim()) {
      setError("Batch number is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await axios.patch(
        `/api/SSS/batches/${batch.id}`,
        {
          batch_number: form.batch_number.trim(),
          batch_initial_quantity: Number(form.batch_initial_quantity),
          batch_unit: form.batch_unit.trim() || null,
          batch_price: form.batch_price !== "" ? Number(form.batch_price) : null,
          batch_expiration_date: form.batch_expiration_date || null,
          inv_batch_testing_org: form.inv_batch_testing_org.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Batch Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">{batch.supplement_name} · {batch.supplement_brand}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            {/* Batch Number */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.batch_number}
                onChange={(e) => handleChange("batch_number", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.batch_initial_quantity}
                onChange={(e) => handleChange("batch_initial_quantity", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={form.batch_unit}
                onChange={(e) => handleChange("batch_unit", e.target.value)}
                placeholder="e.g. capsules, tablets, g"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.batch_price}
                onChange={(e) => handleChange("batch_price", e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
              <input
                type="date"
                value={form.batch_expiration_date}
                onChange={(e) => handleChange("batch_expiration_date", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Testing Organisation */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Testing Organisation</label>
              <input
                type="text"
                value={form.inv_batch_testing_org}
                onChange={(e) => handleChange("inv_batch_testing_org", e.target.value)}
                placeholder="e.g. Informed Sport"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Read-only info */}
          <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-xs text-gray-600">
            <div>
              <span className="block font-medium text-gray-500 mb-0.5">Booked</span>
              {batch.booked}
            </div>
            <div>
              <span className="block font-medium text-gray-500 mb-0.5">Available</span>
              {batch.available}
            </div>
            <div>
              <span className="block font-medium text-gray-500 mb-0.5">Date Added</span>
              {batch.date_added ? new Date(batch.date_added).toLocaleDateString("en-US") : "-"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
