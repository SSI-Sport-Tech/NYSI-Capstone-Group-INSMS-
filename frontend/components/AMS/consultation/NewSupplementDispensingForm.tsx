"use client";

import { useState, useEffect, useRef } from "react";
import { getBackendUrl } from "@/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

interface NewSupplementDispensingFormProps {
  ensureSession: () => Promise<string>;
  prevSessionId?: string;
  onStepStatusChange?: (status: "default" | "dirty" | "saved") => void;
}

interface PrevPrescription {
  id: string;
  supplement_name: string;
  prescriber: string;
  batch_number: string;
  dosage: number;
  dosage_unit: string;
  dosage_frequency: string;
  prescription_date: string;
  intervention_status: string;
}

interface SupplementResult {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form: string;
}

interface BatchOption {
  id: string;
  supplement_id: string;
  batch_number: string;
  batch_initial_quantity: number;
  available: number;
  batch_expiration_date: string | null;
  batch_price: number | null;
  batch_status: string;
  supplement_packaging_form: string | null;
}

interface DispensingEntry {
  supplementId: string | null;
  batchId: string | null;
  batchCurrentQty: number | null;
  supplementName: string;
  batchNumber: string;
  quantity: string;
  dosage: string;
  dosage_unit: string;
  dosage_frequency: string;
  start_date: string;
  projected_end_date: string;
  follow_up_required: boolean;
  other_remarks: string;
}

const emptyEntry = (): DispensingEntry => ({
  supplementId: null,
  batchId: null,
  batchCurrentQty: null,
  supplementName: "",
  batchNumber: "",
  quantity: "",
  dosage: "",
  dosage_unit: "",
  dosage_frequency: "",
  start_date: "",
  projected_end_date: "",
  follow_up_required: false,
  other_remarks: "",
});

// ─── Per-entry card ───────────────────────────────────────────────────────────

function DispensingEntryCard({
  index,
  entry,
  onChange,
  onRemove,
  showRemove,
}: {
  index: number;
  entry: DispensingEntry;
  onChange: (updated: DispensingEntry) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  // Supplement search state
  const [suppQuery, setSuppQuery] = useState("");
  const [suppResults, setSuppResults] = useState<SupplementResult[]>([]);
  const [showSuppDropdown, setShowSuppDropdown] = useState(false);
  const [suppLoading, setSuppLoading] = useState(false);

  // Batches for selected supplement (auto-loaded)
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchOption | null>(null);

  const suppTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSuppSearchChange = (value: string) => {
    setSuppQuery(value);
    if (suppTimeoutRef.current) clearTimeout(suppTimeoutRef.current);

    if (!value.trim()) {
      setSuppResults([]);
      setShowSuppDropdown(false);
      setSuppLoading(false);
      return;
    }

    setSuppLoading(true);
    setShowSuppDropdown(true);
    suppTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/SSS/supplements?search=${encodeURIComponent(value)}&limit=10`,
        );
        const data = await res.json();
        setSuppResults(data.data || []);
      } catch {
        setSuppResults([]);
      } finally {
        setSuppLoading(false);
      }
    }, 300);
  };

  const handleSupplementSelect = async (supp: SupplementResult) => {
    setSuppQuery(`${supp.supplement_brand} ${supp.supplement_name}`);
    setShowSuppDropdown(false);
    setSuppResults([]);

    // Reset batch selection
    setSelectedBatch(null);
    onChange({
      ...entry,
      supplementId: supp.id,
      supplementName: supp.supplement_name,
      batchId: null,
      batchCurrentQty: null,
      batchNumber: "",
    });

    // Auto-load batches for this supplement
    setBatches([]);
    setBatchesLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/SSS/batches?search=${encodeURIComponent(supp.supplement_name)}&page=1`,
      );
      const data = await res.json();
      const all: BatchOption[] = data.data || [];
      // Only batches belonging to this supplement
      setBatches(all.filter((b) => b.supplement_id === supp.id));
    } catch {
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  const handleBatchSelect = (batch: BatchOption) => {
    setSelectedBatch(batch);
    onChange({
      ...entry,
      batchId: batch.id,
      batchCurrentQty: batch.batch_initial_quantity,
      batchNumber: batch.batch_number,
    });
  };

  const stockStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("out")) return "bg-red-100 text-red-700";
    if (s.includes("low")) return "bg-orange-100 text-orange-700";
    return "bg-green-100 text-green-700";
  };

  const expiryStyle = (dateStr: string | null): string => {
    if (!dateStr) return "text-gray-500";
    const exp = new Date(dateStr);
    const now = new Date();
    if (exp <= now) return "text-black font-semibold";
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 30) return "text-red-600 font-medium";
    if (diffDays < 90) return "text-orange-500 font-medium";
    return "text-green-600";
  };

  const expiryLabel = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    const exp = new Date(dateStr);
    const now = new Date();
    const formatted = exp.toLocaleDateString();
    if (exp <= now) return `${formatted} (Expired)`;
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 30) return `${formatted} (< 1 month)`;
    if (diffDays < 90) return `${formatted} (< 3 months)`;
    return formatted;
  };

  const update = (field: keyof DispensingEntry, value: string) => {
    onChange({ ...entry, [field]: value });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-5 text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Dispensing #{index + 1}
        </h3>
        {showRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>

      {/* Step 1: Supplement Search */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Supplement <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={suppQuery}
            onChange={(e) => handleSuppSearchChange(e.target.value)}
            onFocus={() => suppResults.length > 0 && setShowSuppDropdown(true)}
            onBlur={() => setTimeout(() => setShowSuppDropdown(false), 150)}
            placeholder="Type to search supplement..."
            style={{ color: "#111827" }}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm placeholder-gray-400 bg-white"
          />
          {suppLoading && (
            <div className="absolute right-3 top-2.5">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {showSuppDropdown && (
            <div className="absolute z-20 w-full bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
              {suppLoading ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  Searching...
                </div>
              ) : suppResults.length > 0 ? (
                suppResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => handleSupplementSelect(s)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {s.supplement_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.supplement_brand} · {s.supplement_packaging_form}
                    </div>
                  </button>
                ))
              ) : (
                suppQuery.trim() && (
                  <div className="px-3 py-3 text-sm text-gray-500 text-center">
                    No supplements found for &quot;{suppQuery}&quot;
                  </div>
                )
              )}
            </div>
          )}
        </div>
        {entry.supplementId && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-green-600">✓ {entry.supplementName} selected</p>
            <a
              href={`/SSS/supplements/${entry.supplementId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              View Details ↗
            </a>
          </div>
        )}
      </div>

      {/* Step 2: Available Batches (auto-loaded after supplement selected) */}
      {entry.supplementId && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Select Batch <span className="text-red-500">*</span>
          </label>
          {batchesLoading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500">Loading batches...</span>
            </div>
          ) : batches.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
              {batches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBatchSelect(b)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors border ${
                    entry.batchId === b.id
                      ? "bg-blue-50 border-blue-400 text-blue-900"
                      : "bg-white border-gray-200 hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{b.batch_number}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.available <= 0
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {b.available} available
                    </span>
                  </div>
                  {b.batch_expiration_date && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      Exp: {new Date(b.batch_expiration_date).toLocaleDateString()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic py-1">
              No inventory batches found for this supplement.
            </p>
          )}
          {entry.batchId && (
            <p className="text-xs text-green-600 mt-1.5">
              ✓ Batch <span className="font-medium">{entry.batchNumber}</span> selected — inventory will be updated on save.
            </p>
          )}
        </div>
      )}

      {/* Batch Info Panel (shown after batch is selected) */}
      {selectedBatch && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Batch Details</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 shrink-0">Packaging Form:</span>
              <span className="font-medium text-gray-900">{selectedBatch.supplement_packaging_form || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 shrink-0">Stock Status:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockStatusStyle(selectedBatch.batch_status)}`}>
                {selectedBatch.batch_status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 shrink-0">Available:</span>
              <span className="font-medium text-gray-900">
                {selectedBatch.available} / {selectedBatch.batch_initial_quantity}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 shrink-0">Expiry:</span>
              <span className={expiryStyle(selectedBatch.batch_expiration_date)}>
                {expiryLabel(selectedBatch.batch_expiration_date)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Dispensing Details */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Dispensing Details
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {(
            [
              { label: "Qty to Prescribe", field: "quantity" as const, type: "number", placeholder: "e.g. 2" },
              { label: "Dosage", field: "dosage" as const, type: "number", placeholder: "e.g. 500" },
              { label: "Dosage Unit", field: "dosage_unit" as const, type: "text", placeholder: "e.g. mg, capsule, g" },
              { label: "Dosage Frequency", field: "dosage_frequency" as const, type: "text", placeholder: "e.g. once daily" },
            ] as { label: string; field: keyof DispensingEntry; type: string; placeholder: string }[]
          ).map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input
                type={type}
                value={entry[field] as string}
                onChange={(e) => update(field, e.target.value)}
                placeholder={placeholder}
                style={{ color: "#111827" }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm placeholder-gray-400 bg-white"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={entry.start_date}
              onChange={(e) => update("start_date", e.target.value)}
              style={{ color: "#111827" }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Projected End Date</label>
            <input
              type="date"
              value={entry.projected_end_date}
              onChange={(e) => update("projected_end_date", e.target.value)}
              style={{ color: "#111827" }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Other Remarks</label>
          <textarea
            value={entry.other_remarks}
            onChange={(e) => update("other_remarks", e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            style={{ color: "#111827" }}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm placeholder-gray-400 bg-white resize-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`follow-up-${index}`}
            checked={entry.follow_up_required}
            onChange={(e) => onChange({ ...entry, follow_up_required: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor={`follow-up-${index}`} className="text-xs text-gray-700">Follow-up required</label>
        </div>
      </div>
    </div>
  );
}

// ─── Parent form ─────────────────────────────────────────────────────────────

export default function NewSupplementDispensingForm({
  ensureSession,
  prevSessionId,
  onStepStatusChange,
}: NewSupplementDispensingFormProps) {
  const [entries, setEntries] = useState<DispensingEntry[]>([emptyEntry()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");
  const [prevPrescriptions, setPrevPrescriptions] = useState<PrevPrescription[]>([]);

  useEffect(() => {
    setSaved(false);
  }, [entries]);

  useEffect(() => {
    onStepStatusChange?.(saved ? "saved" : "dirty");
  }, [onStepStatusChange, saved]);

  useEffect(() => {
    if (!prevSessionId) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${BACKEND_URL}/api/Consultation/supplement-dispensing/session/${prevSessionId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        setPrevPrescriptions(data.data || []);
      } catch {
        // non-critical
      }
    })();
  }, [prevSessionId]);

  const updateEntry = (index: number, updated: DispensingEntry) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? updated : e)));
  };

  const addEntry = () => setEntries((prev) => [...prev, emptyEntry()]);

  const removeEntry = (index: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);

    try {
      const id = await ensureSession();
      const token = localStorage.getItem("token");

      for (const entry of entries) {
        if (!entry.batchId) continue; // skip incomplete entries

        const prescRes = await fetch(
          `${BACKEND_URL}/api/Consultation/supplement-dispensing`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessions_id: id,
              batch_id: entry.batchId,
              prescribed_quantity: entry.quantity ? parseInt(entry.quantity, 10) : 1,
              dosage: entry.dosage ? parseInt(entry.dosage, 10) : undefined,
              dosage_unit: entry.dosage_unit || undefined,
              dosage_frequency: entry.dosage_frequency || undefined,
              start_date: entry.start_date || undefined,
              projected_end_date: entry.projected_end_date || undefined,
              follow_up_required: entry.follow_up_required,
              other_remarks: entry.other_remarks || undefined,
            }),
          },
        );
        if (!prescRes.ok)
          throw new Error(`Dispensing save failed: ${prescRes.status}`);

      }

      setSaved(true);
    } catch (err) {
      console.error("Error saving dispensing:", err);
      setSaveError("Failed to save dispensing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toLocaleDateString();

  return (
    <section
      id="prescription-new"
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Supplement Dispensing</h2>
          <span className="text-sm text-gray-500">{today}</span>
        </div>
      </div>

      {prevSessionId && (
        <div className="flex border-b border-gray-200 mb-6">
          {(["current", "previous"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-gray-800 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "current" ? "Current Session" : "Previous Session"}
            </button>
          ))}
        </div>
      )}

      {activeTab === "previous" ? (
        <div>
          {prevPrescriptions.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-sm font-medium text-gray-900">No dispensing from previous session</h3>
              <p className="mt-1 text-sm text-gray-500">The previous session had no dispensing.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {prevPrescriptions.map((p) => (
                <div key={p.id} className="border border-gray-200 rounded-lg p-4 text-sm text-gray-900">
                  <div className="font-medium text-base mb-2">{p.supplement_name}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Batch:</span> <span className="font-medium">{p.batch_number || "—"}</span></div>
                    <div><span className="text-gray-500">Dosage:</span> <span className="font-medium">{p.dosage ? `${p.dosage} ${p.dosage_unit}` : "—"}</span></div>
                    <div><span className="text-gray-500">Frequency:</span> <span className="font-medium">{p.dosage_frequency || "—"}</span></div>
                    <div><span className="text-gray-500">Status:</span> <span className="font-medium">{p.intervention_status || "—"}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {entries.map((entry, index) => (
              <DispensingEntryCard
                key={index}
                index={index}
                entry={entry}
                onChange={(updated) => updateEntry(index, updated)}
                onRemove={() => removeEntry(index)}
                showRemove={entries.length > 1}
              />
            ))}

            <button
              onClick={addEntry}
              className="w-full py-2 border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 rounded-lg transition-colors"
            >
              + Add More Dispensing
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 text-white text-sm rounded disabled:opacity-50 ${saved ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-700"}`}
              >
                {saving ? "Saving..." : saved ? "Draft Saved" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
