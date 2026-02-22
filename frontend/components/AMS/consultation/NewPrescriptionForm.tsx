import { useState } from "react";

interface NewPrescriptionFormProps {
  sessionId: string;
}

interface PrescriptionEntry {
  // Quick search
  searchQuery: string;
  // Supplement Information
  name: string;
  brand: string;
  type: string;
  serving_size: string;
  description: string;
  additional_notes: string;
  // Batch Information
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
  searchQuery: "",
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

export default function NewPrescriptionForm({
  sessionId,
}: NewPrescriptionFormProps) {
  const [entries, setEntries] = useState<PrescriptionEntry[]>([emptyEntry()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const updateEntry = (
    index: number,
    field: keyof PrescriptionEntry,
    value: string,
  ) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, emptyEntry()]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!sessionId) return;
    setSaving(true);
    setSaveError("");
    setSaved(false);

    try {
      const token = localStorage.getItem("token");

      for (const entry of entries) {
        if (!entry.name) continue; // skip empty entries

        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Consultation/prescription`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              session_id: sessionId,
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
    <section id="prescription-new" className="bg-white rounded-xl shadow-lg p-6">
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
          <div key={index} className="border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-800">
                Prescription #{index + 1}
              </h3>
              {entries.length > 1 && (
                <button
                  onClick={() => removeEntry(index)}
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={entry.searchQuery}
                  onChange={(e) =>
                    updateEntry(index, "searchQuery", e.target.value)
                  }
                  placeholder="Quick Search (supplement name)..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 border border-green-200 rounded">
                  autofilled
                </span>
              </div>
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
                      value={entry[field]}
                      onChange={(e) => updateEntry(index, field, e.target.value)}
                      placeholder={label}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
                    onChange={(e) =>
                      updateEntry(index, "description", e.target.value)
                    }
                    placeholder="Description..."
                    className="w-full h-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={entry.additional_notes}
                    onChange={(e) =>
                      updateEntry(index, "additional_notes", e.target.value)
                    }
                    placeholder="Additional notes..."
                    className="w-full h-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Batch Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Batch Information
              </h4>
              <div className="grid grid-cols-4 gap-3 text-sm">
                {(
                  [
                    { label: "Batch Number", field: "batch_number" as const, type: "text" },
                    { label: "Quantity", field: "quantity" as const, type: "number" },
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
                    { label: "Dosage Unit", field: "dosage_unit" as const, type: "text" },
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
                      value={entry[field]}
                      onChange={(e) => updateEntry(index, field, e.target.value)}
                      placeholder={label}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
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
