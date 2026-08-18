"use client";


import { useState } from "react";
import { consultationApi } from "@/utils/consultationApi";


const SKINFOLD_ROWS = [
  "Tricep",
  "Subscapular",
  "Bicep",
  "Iliac Crest/Suprailiac",
  "Supraspinale",
  "Abdominal",
  "Front Thigh",
  "Medial Calf",
];


const CIRCUMFERENCE_ROWS = [
  "Relaxed Mid Upper Arm",
  "Flexed Arm",
  "Waist",
  "Hips",
  "Thigh",
  "Calf",
];


const TRIAL_COLUMNS = ["Trial #1", "Trial #2", "Trial #3"] as const;
type TrialColumn = (typeof TRIAL_COLUMNS)[number];
type RowValues = Record<TrialColumn | "Mean/Median", string | number>;
type MeasurementTable = Record<string, RowValues>;


function createTable(rows: string[]): MeasurementTable {
  return Object.fromEntries(
    rows.map((row) => [
      row,
      { "Trial #1": "", "Trial #2": "", "Trial #3": "", "Mean/Median": "" },
    ]),
  );
}


function calculateSummary(values: RowValues, method: "mean" | "median") {
  const trials = TRIAL_COLUMNS.map((column) => {
    const raw = values[column];
    return raw === "" ? null : Number(raw);
  }).filter((value): value is number => value !== null && Number.isFinite(value));
  if (!trials.length) return "";
  if (method === "median") {
    const sorted = [...trials].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    return Number(value.toFixed(2));
  }
  return Number((trials.reduce((sum, value) => sum + value, 0) / trials.length).toFixed(2));
}


interface Props {
  athleteId: string;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}


export default function AdexAnthropometryForm({ athleteId, onCancel, onSaved }: Props) {
  const [formData, setFormData] = useState({
    height: "",
    weight: "",
    test_date: "",
    time_of_test: "",
    tester: "",
    caliper_set: "",
  });
  const [skinfoldTable, setSkinfoldTable] = useState(() => createTable(SKINFOLD_ROWS));
  const [circumTable, setCircumTable] = useState(() => createTable(CIRCUMFERENCE_ROWS));
  const [summaryMethod, setSummaryMethod] = useState<"mean" | "median">("mean");
  const [calculatedData, setCalculatedData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");


  const updateTable = (
    setter: React.Dispatch<React.SetStateAction<MeasurementTable>>,
    row: string,
    column: TrialColumn,
    value: string,
  ) => {
    setCalculatedData(null);
    setter((current) => ({
      ...current,
      [row]: { ...current[row], [column]: value },
    }));
  };


  const withSummaries = (table: MeasurementTable) =>
    Object.fromEntries(
      Object.entries(table).map(([row, values]) => [
        row,
        { ...values, "Mean/Median": calculateSummary(values, summaryMethod) },
      ]),
    );


  const buildPayload = () => ({
    formData: { ...formData, mean_median_method: summaryMethod },
    skinfoldTable: withSummaries(skinfoldTable),
    circumTable: withSummaries(circumTable),
  });


  const handleCalculate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = (await consultationApi.calculateAdexAnthropometry(
        athleteId,
        buildPayload(),
      )) as { data: Record<string, unknown> };
      setCalculatedData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate anthropometry data");
    } finally {
      setBusy(false);
    }
  };


  const handleSave = async () => {
    if (!calculatedData) return;
    setBusy(true);
    setError("");
    try {
      await consultationApi.createAdexAnthropometry(athleteId, {
        ...buildPayload(),
        calculatedData,
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save anthropometry data");
    } finally {
      setBusy(false);
    }
  };


  const renderMeasurementTable = (
    title: string,
    rows: string[],
    table: MeasurementTable,
    setter: React.Dispatch<React.SetStateAction<MeasurementTable>>,
    unit: string,
  ) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <button
          type="button"
          onClick={() => {
            setCalculatedData(null);
            setSummaryMethod((value) => value === "mean" ? "median" : "mean");
          }}
          className="rounded border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
        >
          Summary: {summaryMethod === "mean" ? "Mean" : "Median"}
        </button>
      </div>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-white">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Site</th>
            {TRIAL_COLUMNS.map((column) => (
              <th key={column} className="px-3 py-3 text-left font-medium text-gray-600">{column}</th>
            ))}
            <th className="px-3 py-3 text-left font-medium text-gray-600">{summaryMethod}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{row}</td>
              {TRIAL_COLUMNS.map((column) => (
                <td key={column} className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    aria-label={`${row} ${column}`}
                    value={table[row][column]}
                    onChange={(event) => updateTable(setter, row, column, event.target.value)}
                    placeholder={unit}
                    className="w-24 rounded border border-gray-300 px-2 py-1.5 text-gray-900"
                  />
                </td>
              ))}
              <td className="px-3 py-2 font-medium text-gray-700">
                {calculateSummary(table[row], summaryMethod) || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );


  return (
    <form onSubmit={handleCalculate} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Add ADEX Anthropometry Data</h3>
        <p className="mt-1 text-sm text-gray-500">Athlete UUID: {athleteId}</p>
      </div>


      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
        {[
          ["Height (cm)", "height", "number", true],
          ["Weight (kg)", "weight", "number", true],
          ["Test Date", "test_date", "date", true],
          ["Time of Test", "time_of_test", "time", true],
          ["Tester Name", "tester", "text", false],
          ["Caliper Set", "caliper_set", "text", false],
        ].map(([label, field, type, required]) => (
          <label key={String(field)} className="text-sm font-medium text-gray-700">
            {label}
            <input
              type={String(type)}
              required={Boolean(required)}
              min={type === "number" ? "0.01" : undefined}
              step={type === "number" ? "0.01" : undefined}
              value={formData[field as keyof typeof formData]}
              onChange={(event) => {
                setCalculatedData(null);
                setFormData((current) => ({ ...current, [String(field)]: event.target.value }));
              }}
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
            />
          </label>
        ))}
      </div>


      {renderMeasurementTable("Skinfold Measurements", SKINFOLD_ROWS, skinfoldTable, setSkinfoldTable, "mm")}
      {renderMeasurementTable("Circumference Measurements", CIRCUMFERENCE_ROWS, circumTable, setCircumTable, "cm")}


      {calculatedData && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="mb-3 font-semibold text-gray-900">Calculated Data</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(calculatedData).map(([field, value]) => (
              <div key={field}>
                <div className="text-xs uppercase tracking-wide text-gray-500">{field.replaceAll("_", " ")}</div>
                <div className="font-medium text-gray-900">{value == null ? "—" : String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}


      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}


      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <button type="button" onClick={onCancel} className="rounded bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
          Cancel
        </button>
        {!calculatedData ? (
          <button type="submit" disabled={busy} className="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50">
            {busy ? "Calculating…" : "Calculate"}
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={busy} className="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50">
            {busy ? "Saving…" : "Save to ADEX"}
          </button>
        )}
      </div>
    </form>
  );
}

