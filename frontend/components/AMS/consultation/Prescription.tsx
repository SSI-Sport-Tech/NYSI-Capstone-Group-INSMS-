import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface PrescriptionProps {
  athleteId: string;
  sessionId: string;
  readOnly?: boolean;
}

interface PrescriptionItem {
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

interface BatchOption {
  id: string;
  supplement_id: string;
  batch_number: string;
  supplement_name: string;
  supplement_brand: string;
  batch_initial_quantity: number;
  available: number;
  batch_expiration_date: string | null;
  batch_price: number | null;
}

interface NewEntry {
  batchId: string | null;
  supplementId: string | null;
  supplementName: string;
  batchNumber: string;
  quantity: string;
  dosage: string;
  dosage_unit: string;
  dosage_frequency: string;
}

const emptyEntry = (): NewEntry => ({
  batchId: null,
  supplementId: null,
  supplementName: "",
  batchNumber: "",
  quantity: "",
  dosage: "",
  dosage_unit: "",
  dosage_frequency: "",
});

export default function Prescription({
  athleteId,
  sessionId,
  readOnly,
}: PrescriptionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [entry, setEntry] = useState<NewEntry>(emptyEntry());

  // Batch search
  const [batchSearchQuery, setBatchSearchQuery] = useState("");
  const [batchResults, setBatchResults] = useState<BatchOption[]>([]);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [batchSearchLoading, setBatchSearchLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Suppress unused variable warning
  void athleteId;

  const fetchPrescriptions = useCallback(async () => {
    if (!sessionId) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/prescription/session/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setPrescriptions(data.data || []);
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
      setError("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  // Debounced batch search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBatchSearchChange = (value: string) => {
    setBatchSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!value.trim()) {
      setBatchResults([]);
      setShowBatchDropdown(false);
      setBatchSearchLoading(false);
      return;
    }

    setBatchSearchLoading(true);
    setShowBatchDropdown(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/SSS/batches?search=${encodeURIComponent(value)}&page=1`,
        );
        const data = await res.json();
        setBatchResults(data.data || []);
      } catch {
        setBatchResults([]);
      } finally {
        setBatchSearchLoading(false);
      }
    }, 300);
  };

  const handleBatchSelect = (batch: BatchOption) => {
    setEntry((prev) => ({
      ...prev,
      batchId: batch.id,
      supplementId: batch.supplement_id,
      supplementName: batch.supplement_name,
      batchNumber: batch.batch_number,
    }));
    setBatchSearchQuery(`${batch.supplement_name} — ${batch.batch_number}`);
    setShowBatchDropdown(false);
    setBatchResults([]);
  };

  const handleSave = async () => {
    if (!entry.batchId) {
      setSaveError("Please search and select a batch before saving.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const token = localStorage.getItem("token");
      const prescRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/prescription`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessions_id: sessionId,
            batch_id: entry.batchId,
            prescribed_quantity: entry.quantity ? parseInt(entry.quantity, 10) : 1,
            dosage: entry.dosage ? parseInt(entry.dosage, 10) : undefined,
            dosage_unit: entry.dosage_unit || undefined,
            dosage_frequency: entry.dosage_frequency || undefined,
          }),
        },
      );
      if (!prescRes.ok) {
        const errData = await prescRes.json().catch(() => ({}));
        throw new Error(errData?.details?.[0]?.message || errData?.message || `Save failed: ${prescRes.status}`);
      }

      // Reset and refresh
      setEntry(emptyEntry());
      setBatchSearchQuery("");
      setBatchResults([]);
      setShowAddForm(false);
      await fetchPrescriptions();
    } catch (err) {
      console.error("Error saving prescription:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save prescription.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setEntry(emptyEntry());
    setBatchSearchQuery("");
    setBatchResults([]);
    setSaveError("");
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/prescription/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || `Delete failed: ${res.status}`);
      }
      setConfirmDeleteId(null);
      await fetchPrescriptions();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete prescription.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <section id="prescription" className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="prescription" className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPrescriptions}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="prescription" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900">Prescription</h2>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        <div className="flex items-center gap-2">
          {!readOnly && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Add New Prescription
            </button>
          )}
          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
            Print All
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
      {/* Add prescription inline form */}
      {showAddForm && (
        <div className="border border-blue-200 rounded-lg p-5 mb-6 bg-blue-50">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">New Prescription</h3>

          {/* Batch Search */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search Batch <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={batchSearchQuery}
                onChange={(e) => handleBatchSearchChange(e.target.value)}
                onFocus={() => batchResults.length > 0 && setShowBatchDropdown(true)}
                onBlur={() => setTimeout(() => setShowBatchDropdown(false), 150)}
                placeholder="Search by supplement name or batch number..."
                style={{ color: "#111827" }}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white placeholder-gray-400"
              />
              {batchSearchLoading && (
                <div className="absolute right-3 top-2.5">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {showBatchDropdown && (
                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-64 overflow-y-auto">
                  {batchSearchLoading ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">Searching...</div>
                  ) : batchResults.length > 0 ? (
                    batchResults.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onMouseDown={() => handleBatchSelect(b)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{b.supplement_name}</span>
                            <span className="ml-2 text-xs text-gray-500">{b.supplement_brand}</span>
                          </div>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              b.available <= 0
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {b.available} left
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-600">
                            Batch: <span className="font-medium text-gray-800">{b.batch_number}</span>
                          </span>
                          {b.batch_expiration_date && (
                            <span className="text-xs text-gray-400">
                              Exp: {new Date(b.batch_expiration_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    batchSearchQuery.trim() && (
                      <div className="px-3 py-3 text-sm text-gray-500 text-center">
                        No batches found for &quot;{batchSearchQuery}&quot;
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {entry.batchId && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center justify-between">
                <span>✓ <span className="font-medium">{entry.supplementName}</span> — Batch {entry.batchNumber} selected</span>
                {entry.supplementId && (
                  <a
                    href={`/SSS/supplements/${entry.supplementId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                  >
                    View Details ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Dosage fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {([
              { label: "Qty to Prescribe", field: "quantity" as const, type: "number", placeholder: "e.g. 2" },
              { label: "Dosage", field: "dosage" as const, type: "number", placeholder: "e.g. 500" },
              { label: "Dosage Unit", field: "dosage_unit" as const, type: "text", placeholder: "e.g. mg, capsule, g" },
              { label: "Dosage Frequency", field: "dosage_frequency" as const, type: "text", placeholder: "e.g. once daily" },
            ] as { label: string; field: keyof NewEntry; type: string; placeholder: string }[]).map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={entry[field] as string}
                  onChange={(e) => setEntry((prev) => ({ ...prev, [field]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ color: "#111827" }}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white placeholder-gray-400"
                />
              </div>
            ))}
          </div>

          {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Prescription"}
            </button>
            <button
              onClick={handleCancelAdd}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteError && (
        <p className="text-red-600 text-sm mb-4">{deleteError}</p>
      )}

      {/* Existing prescriptions list */}
      <div className="space-y-6">
        {prescriptions.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No prescriptions</h3>
            <p className="mt-1 text-sm text-gray-500">
              No prescriptions have been made for this consultation session.
            </p>
          </div>
        ) : (
          prescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="border-b border-gray-200 pb-6 last:border-b-0"
            >
              {/* Delete confirmation row */}
              {!readOnly && confirmDeleteId === prescription.id ? (
                <div className="flex items-center gap-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                  <span className="text-red-700 flex-1">
                    Delete <span className="font-medium">{prescription.supplement_name}</span>? This will also release the inventory back to stock.
                  </span>
                  <button
                    onClick={() => handleDelete(prescription.id)}
                    disabled={deleting}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    onClick={() => { setConfirmDeleteId(null); setDeleteError(""); }}
                    disabled={deleting}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Supplement Name:</span>
                  <span className="text-gray-900">{prescription.supplement_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Prescriber:</span>
                  <span className="text-gray-900">{prescription.prescriber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Batch Number:</span>
                  <span className="text-gray-900">{prescription.batch_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Dosage:</span>
                  <span className="text-gray-900">
                    {prescription.dosage} {prescription.dosage_unit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Dosage Frequency:</span>
                  <span className="text-gray-900">{prescription.dosage_frequency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Prescription Date:</span>
                  <span className="text-gray-900">
                    {new Date(prescription.prescription_date).toLocaleDateString()}
                  </span>
                </div>
                {prescription.intervention_status && (
                  <div className="flex justify-between items-center col-span-2">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-gray-900">{prescription.intervention_status}</span>
                  </div>
                )}
              </div>

              {!readOnly && confirmDeleteId !== prescription.id && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => { setConfirmDeleteId(prescription.id); setDeleteError(""); }}
                    className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded border border-red-200 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
        </>
      )}
    </section>
  );
}
