import { useState, useEffect, useCallback, useRef } from "react";
import { getBackendUrl } from "@/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

interface SupplementDispensingProps {
  athleteId: string;
  sessionId: string;
  readOnly?: boolean;
  isNewConsultation?: boolean;
  prevSessionId?: string;
}

interface DispensingItem {
  id: string;
  supplement_name: string;
  prescriber: string;
  batch_number: string;
  prescribed_quantity: number | null;
  dosage: number;
  dosage_unit: string;
  dosage_frequency: string;
  prescription_date: string;
  intervention_status: string;
  start_date: string | null;
  projected_end_date: string | null;
  follow_up_required: boolean;
  other_remarks: string | null;
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
  batch_status: string;
  supplement_packaging_form: string | null;
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
  start_date: string;
  projected_end_date: string;
  follow_up_required: boolean;
  other_remarks: string;
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
  start_date: "",
  projected_end_date: "",
  follow_up_required: false,
  other_remarks: "",
});

export default function SupplementDispensing({
  athleteId,
  sessionId,
  readOnly,
  isNewConsultation,
  prevSessionId,
}: SupplementDispensingProps) {
  const [prescriptions, setPrescriptions] = useState<DispensingItem[]>([]);
  const [prevPrescriptions, setPrevPrescriptions] = useState<DispensingItem[]>([]);
  const [activeTab, setActiveTab] = useState<"current" | "previous">("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [entry, setEntry] = useState<NewEntry>(emptyEntry());
  const [selectedBatch, setSelectedBatch] = useState<BatchOption | null>(null);

  // Supplement search
  const [suppQuery, setSuppQuery] = useState("");
  const [suppResults, setSuppResults] = useState<{ id: string; supplement_name: string; supplement_brand: string; supplement_packaging_form: string }[]>([]);
  const [showSuppDropdown, setShowSuppDropdown] = useState(false);
  const [suppLoading, setSuppLoading] = useState(false);

  // Batches for selected supplement (auto-loaded)
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

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
        `${BACKEND_URL}/api/Consultation/supplement-dispensing/session/${sessionId}`,
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
      setError("Failed to load dispensing");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  useEffect(() => {
    if (!prevSessionId) return;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${BACKEND_URL}/api/Consultation/supplement-dispensing/session/${prevSessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        if (!res.ok) return;
        const data = await res.json();
        setPrevPrescriptions(data.data || []);
      } catch {
        // non-critical
      }
    })();
  }, [prevSessionId]);

  // Debounced supplement search
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

  const handleSupplementSelect = async (supp: { id: string; supplement_name: string; supplement_brand: string }) => {
    setSuppQuery(`${supp.supplement_brand} ${supp.supplement_name}`);
    setShowSuppDropdown(false);
    setSuppResults([]);
    setSelectedBatch(null);
    setEntry((prev) => ({
      ...prev,
      supplementId: supp.id,
      supplementName: supp.supplement_name,
      batchId: null,
      batchNumber: "",
    }));

    setBatches([]);
    setBatchesLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/SSS/batches?search=${encodeURIComponent(supp.supplement_name)}&page=1`,
      );
      const data = await res.json();
      const all: BatchOption[] = data.data || [];
      setBatches(all.filter((b) => b.supplement_id === supp.id));
    } catch {
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  const handleBatchSelect = (batch: BatchOption) => {
    setSelectedBatch(batch);
    setEntry((prev) => ({
      ...prev,
      batchId: batch.id,
      batchNumber: batch.batch_number,
    }));
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
        `${BACKEND_URL}/api/Consultation/supplement-dispensing`,
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
            start_date: entry.start_date || undefined,
            projected_end_date: entry.projected_end_date || undefined,
            follow_up_required: entry.follow_up_required,
            other_remarks: entry.other_remarks || undefined,
          }),
        },
      );
      if (!prescRes.ok) {
        const errData = await prescRes.json().catch(() => ({}));
        throw new Error(errData?.details?.[0]?.message || errData?.message || `Save failed: ${prescRes.status}`);
      }

      // Reset and refresh
      setEntry(emptyEntry());
      setSelectedBatch(null);
      setSuppQuery("");
      setSuppResults([]);
      setBatches([]);
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
    setSelectedBatch(null);
    setSuppQuery("");
    setSuppResults([]);
    setBatches([]);
    setSaveError("");
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BACKEND_URL}/api/Consultation/supplement-dispensing/${id}`,
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
      <section id="supplement-dispensing" className="bg-white rounded-xl shadow-lg p-6">
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
      <section id="supplement-dispensing" className="bg-white rounded-xl shadow-lg p-6">
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

  const displayPrescriptions = activeTab === "previous" ? prevPrescriptions : prescriptions;

  return (
    <section id="supplement-dispensing" className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Supplement Dispensing</h2>
        <div className="flex items-center gap-2">
          {!readOnly && activeTab === "current" && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Add New Dispensing
            </button>
          )}
          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
            Print All
          </button>
        </div>
      </div>

      {/* Tab bar */}
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

      {/* Add prescription inline form */}
      {activeTab === "current" && showAddForm && (
        <div className="border border-blue-200 rounded-lg p-5 mb-6 bg-blue-50">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">New Dispensing</h3>

          {/* Step 1: Supplement Search */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white placeholder-gray-400"
              />
              {suppLoading && (
                <div className="absolute right-3 top-2.5">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {showSuppDropdown && (
                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {suppLoading ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">Searching...</div>
                  ) : suppResults.length > 0 ? (
                    suppResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => handleSupplementSelect(s)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="text-sm font-medium text-gray-900">{s.supplement_name}</div>
                        <div className="text-xs text-gray-500">{s.supplement_brand} · {s.supplement_packaging_form}</div>
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

          {/* Step 2: Batch Selection (auto-loaded after supplement selected) */}
          {entry.supplementId && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.available <= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
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
                <p className="text-xs text-gray-500 italic py-1">No inventory batches found for this supplement.</p>
              )}
              {entry.batchId && (
                <p className="text-xs text-green-600 mt-1.5">
                  ✓ Batch <span className="font-medium">{entry.batchNumber}</span> selected — inventory will be updated on save.
                </p>
              )}
            </div>
          )}

          {/* Batch Info Panel */}
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

          {/* Dosage fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
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
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={entry.start_date}
                onChange={(e) => setEntry((prev) => ({ ...prev, start_date: e.target.value }))}
                style={{ color: "#111827" }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Projected End Date</label>
              <input
                type="date"
                value={entry.projected_end_date}
                onChange={(e) => setEntry((prev) => ({ ...prev, projected_end_date: e.target.value }))}
                style={{ color: "#111827" }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Other Remarks</label>
            <textarea
              value={entry.other_remarks}
              onChange={(e) => setEntry((prev) => ({ ...prev, other_remarks: e.target.value }))}
              placeholder="Any additional notes..."
              rows={2}
              style={{ color: "#111827" }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white placeholder-gray-400 resize-none"
            />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="follow-up-edit"
              checked={entry.follow_up_required}
              onChange={(e) => setEntry((prev) => ({ ...prev, follow_up_required: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="follow-up-edit" className="text-xs text-gray-700">Follow-up required</label>
          </div>

          {saveError && <p className="text-red-600 text-sm mb-3">{saveError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Dispensing"}
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
        {displayPrescriptions.length === 0 ? (
          <div className="text-center py-8">
            {isNewConsultation && prevPrescriptions.length > 0 && (
              <p className="text-sm text-gray-400 italic mb-3">
                Previous consultation had {prevPrescriptions.length} prescription{prevPrescriptions.length !== 1 ? "s" : ""}
              </p>
            )}
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {activeTab === "previous" ? "No dispensing from previous session" : "No dispensing"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === "previous" ? "The previous session had no dispensing." : "No dispensing has been made for this consultation session."}
            </p>
          </div>
        ) : (
          displayPrescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="border-b border-gray-200 pb-6 last:border-b-0"
            >
              {/* Delete confirmation row */}
              {!readOnly && activeTab === "current" && confirmDeleteId === prescription.id ? (
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
                  <span className="text-gray-600">Quantity Prescribed:</span>
                  <span className="text-gray-900">{prescription.prescribed_quantity ?? "—"}</span>
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
                {prescription.start_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Start Date:</span>
                    <span className="text-gray-900">{new Date(prescription.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {prescription.projected_end_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Projected End:</span>
                    <span className="text-gray-900">{new Date(prescription.projected_end_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Follow-up Required:</span>
                  <span className={`font-medium ${prescription.follow_up_required ? "text-orange-600" : "text-gray-900"}`}>
                    {prescription.follow_up_required ? "Yes" : "No"}
                  </span>
                </div>
                {prescription.other_remarks && (
                  <div className="flex justify-between items-center col-span-2">
                    <span className="text-gray-600">Remarks:</span>
                    <span className="text-gray-900">{prescription.other_remarks}</span>
                  </div>
                )}
              </div>

              {!readOnly && activeTab === "current" && confirmDeleteId !== prescription.id && (
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
    </section>
  );
}
