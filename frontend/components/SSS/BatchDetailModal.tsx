"use client";

import { useState, useEffect } from "react";
import { X, Edit2, Save, XCircle } from "lucide-react";
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
  inv_batch_testing_org_id?: string | null;
  inv_batch_testing_org_url?: string | null;
  batch_manufacture_date?: string | null;
  batch_unit?: string | null;
}

interface LookupOption {
  id: string;
  label: string;
}

interface BatchDetailModalProps {
  isOpen: boolean;
  batch: Batch;
  onClose: () => void;
  onSaved: () => void;
}

const ensureHttps = (url: string | null | undefined) => {
  if (!url || !url.trim()) return null;
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function ReadonlyText({ value }: { value: string | null | undefined }) {
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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [batchTestingOrgOptions, setBatchTestingOrgOptions] = useState<LookupOption[]>([]);

  useEffect(() => {
    axios.get("/api/SSS/lookups/batch-testing-orgs").then((res) => {
      setBatchTestingOrgOptions(
        (res.data.data ?? []).map((r: { id: string; label: string }) => ({
          id: r.id,
          label: r.label,
        })),
      );
    });
  }, []);

  const [form, setForm] = useState({
    batch_number: batch.batch_number ?? "",
    batch_initial_quantity: String(batch.batch_initial_quantity ?? ""),
    batch_unit: batch.batch_unit ?? "",
    batch_price: batch.batch_price != null ? String(batch.batch_price) : "",
    batch_expiration_date: batch.batch_expiration_date
      ? new Date(batch.batch_expiration_date).toISOString().split("T")[0]
      : "",
    inv_batch_testing_org_id: batch.inv_batch_testing_org_id ?? "",
    inv_batch_testing_org_url: batch.inv_batch_testing_org_url ?? "",
    batch_manufacture_date: batch.batch_manufacture_date
      ? new Date(batch.batch_manufacture_date).toISOString().split("T")[0]
      : "",
  });

  if (!isOpen) return null;

  const setField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const cancelEdit = () => {
    setForm({
      batch_number: batch.batch_number ?? "",
      batch_initial_quantity: String(batch.batch_initial_quantity ?? ""),
      batch_unit: batch.batch_unit ?? "",
      batch_price: batch.batch_price != null ? String(batch.batch_price) : "",
      batch_expiration_date: batch.batch_expiration_date
        ? new Date(batch.batch_expiration_date).toISOString().split("T")[0]
        : "",
      inv_batch_testing_org_id: batch.inv_batch_testing_org_id ?? "",
      inv_batch_testing_org_url: batch.inv_batch_testing_org_url ?? "",
      batch_manufacture_date: batch.batch_manufacture_date
        ? new Date(batch.batch_manufacture_date).toISOString().split("T")[0]
        : "",
    });
    setError("");
    setIsEditing(false);
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
          batch_manufacture_date: form.batch_manufacture_date || null,
          inv_batch_testing_org_id: form.inv_batch_testing_org_id || null,
          inv_batch_testing_org_url: ensureHttps(form.inv_batch_testing_org_url),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsEditing(false);
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const expiryBadge = getExpiryInfo(batch.batch_expiration_date);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={isEditing ? undefined : onClose}
      />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Batch Details</h2>
              <p className="text-sm text-gray-500 mt-0.5 truncate max-w-sm">
                {batch.supplement_name}{batch.supplement_brand ? ` · ${batch.supplement_brand}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Edit2 className="w-4 h-4 mr-1.5" />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
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

            {/* ── Section: Batch Information ──────────────────────────── */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Batch Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldRow label="Batch Number">
                    {isEditing ? (
                      <TextInput value={form.batch_number} onChange={(v) => setField("batch_number", v)} />
                    ) : (
                      <ReadonlyText value={batch.batch_number} />
                    )}
                  </FieldRow>
                </div>

                <FieldRow label="Quantity">
                  {isEditing ? (
                    <TextInput
                      type="number"
                      value={form.batch_initial_quantity}
                      onChange={(v) => setField("batch_initial_quantity", v)}
                    />
                  ) : (
                    <ReadonlyText value={String(batch.batch_initial_quantity)} />
                  )}
                </FieldRow>

                <FieldRow label="Unit">
                  {isEditing ? (
                    <TextInput
                      value={form.batch_unit}
                      onChange={(v) => setField("batch_unit", v)}
                      placeholder="e.g. capsules, g"
                    />
                  ) : (
                    <ReadonlyText value={batch.batch_unit} />
                  )}
                </FieldRow>

                <FieldRow label="Price (SGD)">
                  {isEditing ? (
                    <TextInput
                      type="number"
                      value={form.batch_price}
                      onChange={(v) => setField("batch_price", v)}
                      placeholder="0.00"
                    />
                  ) : (
                    <ReadonlyText
                      value={batch.batch_price != null ? `$${Number(batch.batch_price).toFixed(2)}` : null}
                    />
                  )}
                </FieldRow>

                <FieldRow label="Expiration Date">
                  {isEditing ? (
                    <TextInput
                      type="date"
                      value={form.batch_expiration_date}
                      onChange={(v) => setField("batch_expiration_date", v)}
                    />
                  ) : batch.batch_expiration_date ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${expiryBadge ?? ""}`}>
                      {new Date(batch.batch_expiration_date).toLocaleDateString("en-US")}
                    </span>
                  ) : (
                    <ReadonlyText value={null} />
                  )}
                </FieldRow>

                <FieldRow label="Manufacture Date">
                  {isEditing ? (
                    <TextInput
                      type="date"
                      value={form.batch_manufacture_date}
                      onChange={(v) => setField("batch_manufacture_date", v)}
                    />
                  ) : (
                    <ReadonlyText
                      value={batch.batch_manufacture_date
                        ? new Date(batch.batch_manufacture_date).toLocaleDateString("en-US")
                        : null}
                    />
                  )}
                </FieldRow>

                <div className="col-span-2">
                  <FieldRow label="Batch Testing Organisation">
                    {isEditing ? (
                      <select
                        value={form.inv_batch_testing_org_id}
                        onChange={(e) => setField("inv_batch_testing_org_id", e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      >
                        <option value="">— Select testing organisation —</option>
                        {batchTestingOrgOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <ReadonlyText value={batch.inv_batch_testing_org} />
                    )}
                  </FieldRow>
                </div>

                <div className="col-span-2">
                  <FieldRow label="Batch Certificate">
                    {isEditing ? (
                      <TextInput
                        type="url"
                        value={form.inv_batch_testing_org_url}
                        onChange={(v) => setField("inv_batch_testing_org_url", v)}
                        placeholder="https://example.com/certificate"
                      />
                    ) : batch.inv_batch_testing_org_url ? (
                      <a
                        href={batch.inv_batch_testing_org_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {batch.inv_batch_testing_org_url}
                      </a>
                    ) : (
                      <ReadonlyText value={null} />
                    )}
                  </FieldRow>
                </div>
              </div>
            </section>

            {/* ── Section: Stock Information (read-only) ──────────────── */}
            <section>
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
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
