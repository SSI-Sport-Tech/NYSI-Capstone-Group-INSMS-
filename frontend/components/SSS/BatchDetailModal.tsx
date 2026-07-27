"use client";

import { useState, useEffect } from "react";
import { X, Save, XCircle } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

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

// interface LookupOption {
//   id: string;
//   label: string;
// }

interface BatchDetailModalProps {
  isOpen: boolean;
  batch: Batch;
  onClose: () => void;
  onSaved: () => void;
}

// const ensureHttps = (url: string | null | undefined) => {
//   if (!url || !url.trim()) return null;
//   return /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
// };

// ── Helpers ──────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function ReadonlyText({ value }: { value: string | number | null | undefined }) {
  return <p className="text-sm text-gray-900 break-words">{value || "-"}</p>;
}

function TextInput({ value, onChange, type = "text", placeholder }: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
    />
  );
}

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

const getStatusBadgeClass = (status: string) => {
  const s = status?.toLowerCase().trim();
  if (s === "in stock") return "bg-green-100 text-green-800";
  if (s === "low stock") return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-600";
};

// ── Main component ────────────────────────────────────────────────────────────

export default function BatchDetailModal({ isOpen, batch, onClose, onSaved }: BatchDetailModalProps) {
  const { token } = useAuth();
  // const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // const [batchTestingOrgOptions, setBatchTestingOrgOptions] = useState<LookupOption[]>([]);

  // useEffect(() => {
  //   axios.get("/api/SSS/lookups/batch-testing-orgs").then((res) => {
  //     setBatchTestingOrgOptions(
  //       (res.data.data ?? []).map((r: { id: string; label: string }) => ({
  //         id: r.id,
  //         label: r.label,
  //       })),
  //     );
  //   });
  // }, []);

  const [notes, setNotes] = useState(batch.notes ?? "");

  if (!isOpen) return null;

  useEffect(() => {
    setNotes(batch.notes ?? "");
  }, [batch]);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      await axios.patch(
        `/api/SSS/batches/${batch.id}/notes`,
        {
          notes,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error;

      setError(msg || "Failed to save notes.");
    } finally {
      setSaving(false);
    }
  };

  const expiryBadge = getExpiryInfo(batch.expiry_date);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      {/* <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={isEditing ? undefined : onClose}
      /> */}

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Inventory Batch Details</h2>
              <p className="text-sm text-gray-500 mt-0.5 truncate max-w-sm">
                {batch.product_name}{batch.brand ? ` · ${batch.brand}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {saving ? "Saving..." : "Save Notes"}
              </button> */}
              <button
                onClick={onClose}
                disabled={saving}
                className="text-gray-400 hover:text-gray-600 ml-1 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1 p-6 space-y-8">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
            )}

            {/* ── Section: Inventory Batch Information ──────────────────────────── */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Inventory Batch Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldRow label="Supplement Name">
                    <ReadonlyText value={batch.product_name} />
                  </FieldRow>
                </div>

                <FieldRow label="Brand">
                  <ReadonlyText value={batch.brand} />
                </FieldRow>

                <FieldRow label="Category">
                  <ReadonlyText value={batch.category} />
                </FieldRow>

                <FieldRow label="Description">
                  <ReadonlyText value={batch.description} />
                </FieldRow>

                <FieldRow label="Batch Number">
                  <ReadonlyText value={batch.batch_number} />
                </FieldRow>

                <FieldRow label="SKU">
                  <ReadonlyText value={batch.barcode_sku} />
                </FieldRow>

                <FieldRow label="Quantity Available">
                  <ReadonlyText value={batch.quantity_on_hand} />
                </FieldRow>

                <FieldRow label="Original Quantity">
                  <ReadonlyText value={batch.original_stock_amount} />
                </FieldRow>

                <FieldRow label="Expiry Date">
                  {batch.expiry_date ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${expiryBadge}`}>
                      {new Date(batch.expiry_date).toLocaleDateString("en-US")}
                    </span>
                  ) : (
                    <ReadonlyText value={null} />
                  )}
                </FieldRow>

                <FieldRow label="Unit Cost">
                  <ReadonlyText value={`$${Number(batch.unit_cost).toFixed(2)}`} />
                </FieldRow>

                <FieldRow label="Supplier">
                  <ReadonlyText value={batch.supplier} />
                </FieldRow>

                <FieldRow label="Received Date">
                  <ReadonlyText
                    value={
                      batch.received_date
                        ? new Date(batch.received_date).toLocaleDateString("en-US")
                        : null
                    }
                  />
                </FieldRow>

                <FieldRow label="Notes">
                  <ReadonlyText value={batch.notes ? batch.notes : "-"} />
                </FieldRow>
              </div>
            </section>

            {/* ── Section: Stock Information (read-only) ──────────────── */}
            {/* <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Stock Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="Stock Status">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(batch.batch_status)}`}>
                    {batch.batch_status || "-"}
                  </span>
                </FieldRow>

                <FieldRow label="Date Added">
                  <ReadonlyText
                    value={batch.date_added ? new Date(batch.date_added).toLocaleDateString("en-US") : null}
                  />
                </FieldRow>

                <FieldRow label="Booked">
                  <ReadonlyText value={String(batch.booked)} />
                </FieldRow>

                <FieldRow label="Available">
                  <ReadonlyText value={String(batch.available)} />
                </FieldRow>
              </div>
            </section> */}
          </div>
        </div>
      </div>
    </div>
  );
}
