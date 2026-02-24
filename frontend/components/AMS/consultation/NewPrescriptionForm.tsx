"use client";

import { useState, useCallback } from "react";

interface NewPrescriptionFormProps {
  ensureSession: () => Promise<string>;
}

interface SupplementResult {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form: string;
  supplement_status: string;
  description?: string;
  serving_size?: string;
  notes?: string;
}

interface BatchOption {
  id: string;
  supplement_id: string;
  batch_number: string;
  batch_initial_quantity: number;
  available: number;
  batch_expiration_date: string | null;
  batch_price: number | null;
}

interface PrescriptionEntry {
  supplementId: string | null;
  batchId: string | null;
  batchCurrentQty: number | null;
  // Supplement fields
  name: string;
  brand: string;
  type: string;
  serving_size: string;
  description: string;
  additional_notes: string;
  // Batch / prescription fields
  batch_number: string;
  quantity: string;
  price: string;
  expiration_date: string;
  testing_organisation: string;
  classification: string;
  dosage: string;
  dosage_unit: string;
  dosage_frequency: string;
}

const emptyEntry = (): PrescriptionEntry => ({
  supplementId: null,
  batchId: null,
  batchCurrentQty: null,
  name: "",
  brand: "",
  type: "",
  serving_size: "",
  description: "",
  additional_notes: "",
  batch_number: "",
  quantity: "",
  price: "",
  expiration_date: "",
  testing_organisation: "",
  classification: "",
  dosage: "",
  dosage_unit: "",
  dosage_frequency: "",
});

// ─── Per-entry card (owns its own search/batch state) ────────────────────────

function PrescriptionEntryCard({
  index,
  entry,
  onChange,
  onRemove,
  showRemove,
}: {
  index: number;
  entry: PrescriptionEntry;
  onChange: (updated: PrescriptionEntry) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SupplementResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  // Debounced search — same pattern as AddSupplementModal
  const debouncedSearch = useCallback(
    (() => {
      let timeout: ReturnType<typeof setTimeout>;
      return (query: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => performSearch(query), 300);
      };
    })(),
    [],
  );

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/SSS/supplements?search=${encodeURIComponent(query)}&limit=10`,
      );
      const data = await res.json();
      setSearchResults(data.data || []);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setSearchLoading(true);
      setShowDropdown(true);
      debouncedSearch(value);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setSearchLoading(false);
    }
  };

  const handleSupplementSelect = async (supplement: SupplementResult) => {
    setSearchQuery(
      `${supplement.supplement_brand} ${supplement.supplement_name}`,
    );
    setShowDropdown(false);
    onChange({
      ...entry,
      supplementId: supplement.id,
      name: supplement.supplement_name,
      brand: supplement.supplement_brand,
      type: supplement.supplement_packaging_form,
      serving_size: supplement.serving_size || "",
      description: supplement.description || "",
      additional_notes: supplement.notes || "",
      // Reset batch selection
      batchId: null,
      batchCurrentQty: null,
      batch_number: "",
      price: "",
      expiration_date: "",
    });
    // Fetch batches for this supplement
    setBatches([]);
    setBatchesLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/SSS/batches?search=${encodeURIComponent(supplement.supplement_name)}&page=1`,
      );
      const data = await res.json();
      const all: BatchOption[] = data.data || [];
      // Filter client-side to only batches belonging to this supplement
      setBatches(all.filter((b) => b.supplement_id === supplement.id));
    } catch {
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  const handleBatchSelect = (batch: BatchOption) => {
    onChange({
      ...entry,
      batchId: batch.id,
      batchCurrentQty: batch.batch_initial_quantity,
      batch_number: batch.batch_number,
      price: batch.batch_price?.toString() ?? "",
      expiration_date: batch.batch_expiration_date
        ? new Date(batch.batch_expiration_date).toISOString().split("T")[0]
        : "",
    });
  };

  const update = (field: keyof PrescriptionEntry, value: string) => {
    onChange({ ...entry, [field]: value });
  };

  const isAutofilled = !!entry.supplementId;

  return (
    <div className="border border-gray-200 rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-800">
          Prescription #{index + 1}
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

      {/* Quick Search */}
      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Add Prescription
        </h4>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Quick Search (supplement name)..."
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm pr-8"
          />
          {searchLoading && (
            <div className="absolute right-3 top-2.5">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Dropdown results */}
          {showDropdown && (
            <div className="absolute z-20 w-full bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
              {searchLoading ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => handleSupplementSelect(s)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {s.supplement_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {s.supplement_brand} · {s.supplement_packaging_form}
                        {s.supplement_status && (
                          <span
                            className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                              s.supplement_status === "Active" ||
                              s.supplement_status === "Available"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {s.supplement_status}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                searchQuery.trim() && (
                  <div className="px-3 py-3 text-sm text-gray-500 text-center">
                    No supplements found for &quot;{searchQuery}&quot;
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {isAutofilled && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            ✓ Supplement details autofilled from existing record
          </div>
        )}
      </div>

      {/* Supplement Information */}
      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Supplement Information
        </h4>
        <div className="grid grid-cols-4 gap-3 text-sm mb-3">
          {(
            [
              { label: "Name", field: "name" as const },
              { label: "Brand", field: "brand" as const },
              { label: "Type", field: "type" as const },
              { label: "Serving Size", field: "serving_size" as const },
            ] as { label: string; field: keyof PrescriptionEntry }[]
          ).map(({ label, field }) => (
            <div key={field}>
              <label className="block text-xs text-gray-500 mb-1">
                {label}
              </label>
              <input
                type="text"
                value={entry[field] as string}
                onChange={(e) => update(field, e.target.value)}
                disabled={isAutofilled}
                placeholder={label}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Description
            </label>
            <textarea
              value={entry.description}
              onChange={(e) => update("description", e.target.value)}
              disabled={isAutofilled}
              placeholder="Description..."
              className="w-full h-16 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Additional Notes
            </label>
            <textarea
              value={entry.additional_notes}
              onChange={(e) => update("additional_notes", e.target.value)}
              disabled={isAutofilled}
              placeholder="Additional notes..."
              className="w-full h-16 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Batch Selector (shown after supplement is picked) */}
      {entry.supplementId && (
        <div className="mb-5">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Select Inventory Batch
          </h4>
          {batchesLoading ? (
            <p className="text-xs text-gray-500">Loading batches...</p>
          ) : batches.length > 0 ? (
            <div className="space-y-1 max-h-36 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
              {batches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBatchSelect(b)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    entry.batchId === b.id
                      ? "bg-blue-50 border border-blue-300 text-blue-900"
                      : "bg-white border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{b.batch_number}</span>
                  <span className="ml-3 text-xs text-gray-500">
                    Available:{" "}
                    <span
                      className={
                        b.available <= 0 ? "text-red-600 font-medium" : ""
                      }
                    >
                      {b.available}
                    </span>{" "}
                    units
                  </span>
                  {b.batch_expiration_date && (
                    <span className="ml-2 text-xs text-gray-400">
                      Exp:{" "}
                      {new Date(b.batch_expiration_date).toLocaleDateString()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">
              No inventory batches found for this supplement.
            </p>
          )}
          {entry.batchId && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Batch selected — inventory will be updated on save.
            </p>
          )}
        </div>
      )}

      {/* Batch / Prescription Details */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Batch Information
        </h4>
        <div className="grid grid-cols-4 gap-3 text-sm">
          {(
            [
              {
                label: "Batch Number",
                field: "batch_number" as const,
                type: "text",
              },
              {
                label: "Qty to Prescribe",
                field: "quantity" as const,
                type: "number",
              },
              { label: "Price", field: "price" as const, type: "number" },
              {
                label: "Expiration Date",
                field: "expiration_date" as const,
                type: "date",
              },
              {
                label: "Testing Organisation",
                field: "testing_organisation" as const,
                type: "text",
              },
              {
                label: "Classification",
                field: "classification" as const,
                type: "text",
              },
              { label: "Dosage", field: "dosage" as const, type: "number" },
              {
                label: "Dosage Unit",
                field: "dosage_unit" as const,
                type: "text",
              },
              {
                label: "Dosage Frequency",
                field: "dosage_frequency" as const,
                type: "text",
              },
            ] as {
              label: string;
              field: keyof PrescriptionEntry;
              type: string;
            }[]
          ).map(({ label, field, type }) => (
            <div key={field}>
              <label className="block text-xs text-gray-500 mb-1">
                {label}
              </label>
              <input
                type={type}
                value={entry[field] as string}
                onChange={(e) => update(field, e.target.value)}
                placeholder={label}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Parent form ─────────────────────────────────────────────────────────────

export default function NewPrescriptionForm({
  ensureSession,
}: NewPrescriptionFormProps) {
  const [entries, setEntries] = useState<PrescriptionEntry[]>([emptyEntry()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const updateEntry = (index: number, updated: PrescriptionEntry) => {
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
        if (!entry.name) continue; // skip empty entries

        // 1. POST prescription record
        const prescRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/prescription`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              session_id: id,
              supplement_name: entry.name,
              brand: entry.brand,
              type: entry.type,
              serving_size: entry.serving_size,
              description: entry.description,
              additional_notes: entry.additional_notes,
              batch_number: entry.batch_number,
              quantity: entry.quantity ? parseFloat(entry.quantity) : null,
              price: entry.price ? parseFloat(entry.price) : null,
              expiration_date: entry.expiration_date || null,
              testing_organisation: entry.testing_organisation,
              classification: entry.classification,
              dosage: entry.dosage ? parseFloat(entry.dosage) : null,
              dosage_unit: entry.dosage_unit,
              dosage_frequency: entry.dosage_frequency,
            }),
          },
        );
        if (!prescRes.ok)
          throw new Error(`Prescription save failed: ${prescRes.status}`);

        // 2. Deduct from batch inventory if a batch was selected
        if (
          entry.batchId &&
          entry.quantity &&
          entry.batchCurrentQty !== null
        ) {
          const prescribed = parseFloat(entry.quantity);
          if (prescribed > 0) {
            const newQty = Math.max(0, entry.batchCurrentQty - prescribed);
            await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/SSS/batches/${entry.batchId}`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ batch_initial_quantity: newQty }),
              },
            );
          }
        }
      }

      setSaved(true);
    } catch (err) {
      console.error("Error saving prescription:", err);
      setSaveError("Failed to save prescription. Please try again.");
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
          <h2 className="text-xl font-semibold text-gray-900">Prescription</h2>
          <span className="text-sm text-gray-500">{today}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}
      {saved && (
        <p className="text-green-600 text-sm mb-4">
          Prescription saved successfully.
        </p>
      )}

      <div className="space-y-8">
        {entries.map((entry, index) => (
          <PrescriptionEntryCard
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
          + Add More Prescriptions
        </button>
      </div>
    </section>
  );
}
