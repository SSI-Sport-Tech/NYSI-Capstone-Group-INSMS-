"use client";

import React, { useState, useEffect } from "react";
import { X, Edit2, Save, XCircle, ExternalLink, BookmarkCheck, AlertTriangle, Trash2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StagingDetail {
  id: string;
  supplement_name: string;
  supplement_brand: string | null;
  supplement_description: string | null;
  supplement_packaging_form: string | null;
  supplement_packaging_form_id: string | null;
  supplement_status: string | null;
  supplement_status_id: string | null;
  supplement_ingredient: string[] | null;
  nutritional_info_per_100g: Record<string, unknown> | null;
  nutritional_info_per_serving: Record<string, unknown> | null;
  nutritional_info_per_serving_definition: string | null;
  supplement_warning_label: string | null;
  supplement_certifications: string | null;
  supplement_additional_information: string | null;
  batch_testing_org: string | null;
  product_source_url: string | string[] | null;
  scraper_version: string | null;
  is_reviewed: boolean;
}

interface LookupOption {
  id: string;
  label: string;
}

interface NutritionalRow {
  nutrient: string;
  amount: string;
}

interface EditForm {
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form_id: string;
  supplement_status_id: string;
  supplement_description: string;
  supplement_warning_label: string;
  supplement_certifications: string;
  supplement_additional_information: string;
  batch_testing_org: string;
  product_source_url: string;
  nutritional_info_per_serving_definition: string;
  // Ingredient list as editable rows
  supplement_ingredient: string[];
  // Nutritional info as editable rows
  nutritional_info_per_100g: NutritionalRow[];
  nutritional_info_per_serving: NutritionalRow[];
}

interface StagingDetailModalProps {
  supplementId: string | null;
  onClose: () => void;
  /** Called after a successful save so the parent table can update its row */
  onUpdated: (id: string, changes: Partial<StagingDetail>) => void;
  /** Called after the entry is approved and promoted to the library */
  onApproved: (id: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDisplay(url: string | string[] | null | undefined): string {
  if (!url) return "";
  return Array.isArray(url) ? url[0] ?? "" : url;
}

function jsonStr(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return fallback;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function ReadonlyText({ value }: { value: string | null | undefined }) {
  return (
    <p className="text-sm text-gray-900 break-words">{value || "-"}</p>
  );
}

function TextInput({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
    />
  );
}

function TextareaInput({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-y"
    />
  );
}

function JsonTextarea({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className={`w-full px-3 py-2 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-y ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
        spellCheck={false}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: LookupOption[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
    >
      <option value="">{placeholder ?? "— Select —"}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function JsonDisplay({ value }: { value: unknown }) {
  const text = value != null ? jsonStr(value) : null;
  if (!text) return <p className="text-sm text-gray-400">-</p>;
  return (
    <pre className="text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto whitespace-pre-wrap font-mono">
      {text}
    </pre>
  );
}

// Convert a stored record to editable rows
function recordToRows(record: Record<string, unknown> | null | undefined): NutritionalRow[] {
  if (!record || Object.keys(record).length === 0)
    return [{ nutrient: "", amount: "" }];
  return Object.entries(record).map(([nutrient, amount]) => ({
    nutrient,
    amount: String(amount ?? ""),
  }));
}

// Convert editable rows back to a record for the API
function rowsToRecord(rows: NutritionalRow[]): Record<string, string> | null {
  const entries = rows
    .filter((r) => r.nutrient.trim())
    .map((r) => [r.nutrient.trim(), r.amount.trim()] as [string, string]);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

// View-mode nutritional table
function NutritionalTableView({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0)
    return <p className="text-sm text-gray-400">-</p>;
  return (
    <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">Nutrient</th>
          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {Object.entries(value).map(([nutrient, amount]) => (
          <tr key={nutrient}>
            <td className="px-3 py-2 text-gray-700">{nutrient}</td>
            <td className="px-3 py-2 text-gray-900">{String(amount ?? "-")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Edit-mode nutritional table
function NutritionalTableEdit({
  rows,
  onChange,
}: {
  rows: NutritionalRow[];
  onChange: (rows: NutritionalRow[]) => void;
}) {
  return (
    <div>
      <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">Nutrient</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">Amount</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="px-2 py-1">
                <input
                  type="text"
                  value={row.nutrient}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], nutrient: e.target.value };
                    onChange(next);
                  }}
                  placeholder="e.g. Protein"
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400 text-sm"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="text"
                  value={row.amount}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], amount: e.target.value };
                    onChange(next);
                  }}
                  placeholder="e.g. 10g"
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400 text-sm"
                />
              </td>
              <td className="px-1 py-1 text-center">
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                  disabled={rows.length === 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => onChange([...rows, { nutrient: "", amount: "" }])}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        + Add Row
      </button>
    </div>
  );
}

// View-mode ingredient list
function IngredientListView({ value }: { value: string[] | null }) {
  if (!value || value.length === 0)
    return <p className="text-sm text-gray-400">-</p>;
  return (
    <ul className="text-sm text-gray-800 space-y-0.5 list-disc list-inside">
      {value.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// Edit-mode ingredient table (Nx1)
function IngredientTableEdit({
  rows,
  onChange,
}: {
  rows: string[];
  onChange: (rows: string[]) => void;
}) {
  return (
    <div>
      <div className="space-y-1">
        {rows.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...rows];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder="e.g. Vitamin D3"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              disabled={rows.length === 1}
              className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, ""])}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        + Add Row
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const StagingDetailModal: React.FC<StagingDetailModalProps> = ({
  supplementId,
  onClose,
  onUpdated,
  onApproved,
}) => {
  const { token } = useAuth();

  const [detail, setDetail] = useState<StagingDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [packagingOptions, setPackagingOptions] = useState<LookupOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<LookupOption[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    name: string;
    brand: string | null;
    similarity: string | null;
  } | null>(null);
  const [deletingDuplicate, setDeletingDuplicate] = useState(false);

  const isOpen = supplementId !== null;

  // Load lookup options once
  useEffect(() => {
    axios.get("/api/SSS/staging-lookups").then((res) => {
      setPackagingOptions(
        (res.data.packagingForms ?? []).map(
          (r: { id: string; supplement_packaging_form: string }) => ({
            id: r.id,
            label: r.supplement_packaging_form,
          }),
        ),
      );
      setStatusOptions(
        (res.data.statuses ?? []).map(
          (r: { id: string; supplement_status: string }) => ({
            id: r.id,
            label: r.supplement_status,
          }),
        ),
      );
    });
  }, []);

  // Load detail whenever the modal opens for a given id
  useEffect(() => {
    if (!supplementId) {
      setDetail(null);
      setIsEditing(false);
      setEditForm(null);
      return;
    }
    setLoadingDetail(true);
    axios
      .get(`/api/SSS/staging-supplements/${supplementId}`)
      .then((res) => setDetail(res.data))
      .catch((err) => console.error("Error loading staging detail:", err))
      .finally(() => setLoadingDetail(false));
  }, [supplementId]);

  // ── Edit helpers ──────────────────────────────────────────────────────────

  const enterEditMode = () => {
    if (!detail) return;
    setEditForm({
      supplement_name: detail.supplement_name ?? "",
      supplement_brand: detail.supplement_brand ?? "",
      supplement_packaging_form_id: detail.supplement_packaging_form_id ?? "",
      supplement_status_id: detail.supplement_status_id ?? "",
      supplement_description: detail.supplement_description ?? "",
      supplement_warning_label: detail.supplement_warning_label ?? "",
      supplement_certifications: detail.supplement_certifications ?? "",
      supplement_additional_information:
        detail.supplement_additional_information ?? "",
      batch_testing_org: detail.batch_testing_org ?? "",
      product_source_url: toDisplay(detail.product_source_url),
      nutritional_info_per_serving_definition:
        detail.nutritional_info_per_serving_definition ?? "",
      supplement_ingredient: [...(detail.supplement_ingredient ?? [])],
      nutritional_info_per_100g: recordToRows(detail.nutritional_info_per_100g),
      nutritional_info_per_serving: recordToRows(detail.nutritional_info_per_serving),
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  const setField = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setEditForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSave = async () => {
    if (!detail || !editForm) return;

    // Convert nutritional rows to records
    const newPer100g = rowsToRecord(editForm.nutritional_info_per_100g);
    const newPerServing = rowsToRecord(editForm.nutritional_info_per_serving);

    // ── Build payload (only changed fields) ─────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {};

    const textField = (
      key: keyof typeof payload,
      formVal: string,
      detailVal: string | null | undefined,
    ) => {
      const original = detailVal ?? "";
      if (formVal !== original) payload[key] = formVal || null;
    };

    textField("supplement_name", editForm.supplement_name, detail.supplement_name);
    textField("supplement_brand", editForm.supplement_brand, detail.supplement_brand);
    textField("supplement_description", editForm.supplement_description, detail.supplement_description);
    textField("supplement_warning_label", editForm.supplement_warning_label, detail.supplement_warning_label);
    textField("supplement_certifications", editForm.supplement_certifications, detail.supplement_certifications);
    textField("supplement_additional_information", editForm.supplement_additional_information, detail.supplement_additional_information);
    textField("batch_testing_org", editForm.batch_testing_org, detail.batch_testing_org);
    textField("product_source_url", editForm.product_source_url, toDisplay(detail.product_source_url));
    textField("nutritional_info_per_serving_definition", editForm.nutritional_info_per_serving_definition, detail.nutritional_info_per_serving_definition);

    if (editForm.supplement_packaging_form_id !== (detail.supplement_packaging_form_id ?? ""))
      payload.supplement_packaging_form_id = editForm.supplement_packaging_form_id || null;

    if (editForm.supplement_status_id !== (detail.supplement_status_id ?? ""))
      payload.supplement_status_id = editForm.supplement_status_id || null;

    // Ingredients — filter empty rows, compare with original
    const filteredIngredients = editForm.supplement_ingredient.filter((s) => s.trim());
    if (JSON.stringify(filteredIngredients) !== JSON.stringify(detail.supplement_ingredient ?? []))
      payload.supplement_ingredient = filteredIngredients;

    if (JSON.stringify(newPer100g) !== JSON.stringify(detail.nutritional_info_per_100g ?? null))
      payload.nutritional_info_per_100g = newPer100g;

    if (JSON.stringify(newPerServing) !== JSON.stringify(detail.nutritional_info_per_serving ?? null))
      payload.nutritional_info_per_serving = newPerServing;

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    // ── Send PATCH ───────────────────────────────────────────────────────────
    setSaving(true);
    try {
      await axios.patch(`/api/SSS/staging-supplements/${detail.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Merge changes into local detail (resolve lookup labels for dropdowns)
      const updatedDetail: StagingDetail = { ...detail };
      Object.assign(updatedDetail, payload);

      if (payload.supplement_packaging_form_id !== undefined) {
        const match = packagingOptions.find(
          (o) => o.id === payload.supplement_packaging_form_id,
        );
        updatedDetail.supplement_packaging_form = match?.label ?? null;
      }
      if (payload.supplement_status_id !== undefined) {
        const match = statusOptions.find(
          (o) => o.id === payload.supplement_status_id,
        );
        updatedDetail.supplement_status = match?.label ?? null;
      }

      setDetail(updatedDetail);
      onUpdated(detail.id, updatedDetail);
      setIsEditing(false);
      setEditForm(null);
    } catch (err) {
      console.error("Error saving staging supplement:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!detail) return;
    setApproving(true);
    try {
      const response = await axios.post(
        "/api/SSS/staging-supplements/approve",
        { ids: [detail.id] },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const result = response.data.results?.[0];
      if (result?.status === "duplicate") {
        // Don't close — show the duplicate prompt instead
        setDuplicateInfo({
          name: result.duplicate_of?.name ?? "Unknown",
          brand: result.duplicate_of?.brand ?? null,
          similarity: result.duplicate_of?.similarity_100g ?? result.duplicate_of?.similarity_perserving ?? null,
        });
        return;
      }

      onApproved(detail.id);
      onClose();
    } catch (err) {
      console.error("Error approving staging supplement:", err);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        alert(`Could not save to library: ${err.response.data.message}`);
      } else {
        alert("Failed to save to library. Please try again.");
      }
    } finally {
      setApproving(false);
    }
  };

  const handleDeleteDuplicate = async () => {
    if (!detail) return;
    setDeletingDuplicate(true);
    try {
      await axios.delete("/api/SSS/staging-supplements", {
        data: { ids: [detail.id] },
        headers: { Authorization: `Bearer ${token}` },
      });
      onApproved(detail.id); // removes it from the parent list
      onClose();
    } catch (err) {
      console.error("Error deleting staging entry:", err);
      alert("Failed to delete staging entry. Please try again.");
    } finally {
      setDeletingDuplicate(false);
    }
  };

  // ── Render guard ──────────────────────────────────────────────────────────

  if (!isOpen) return null;

  // ── Layout helpers ────────────────────────────────────────────────────────

  const f = editForm; // shorthand

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      {/* Backdrop — clicking it closes only when not mid-edit */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={isEditing ? undefined : onClose}
      />

      {/* Panel */}
      <div className="relative min-h-screen flex items-start justify-center p-4 pt-10">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          {/* ── Duplicate Banner ─────────────────────────────────────── */}
          {duplicateInfo && (
            <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    Duplicate detected
                  </p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    This supplement already exists in the library as{" "}
                    <span className="font-medium">
                      {duplicateInfo.name}
                      {duplicateInfo.brand ? ` by ${duplicateInfo.brand}` : ""}
                    </span>
                    {duplicateInfo.similarity
                      ? ` (${duplicateInfo.similarity} similarity)`
                      : ""}
                    . Would you like to delete this staging entry?
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={handleDeleteDuplicate}
                      disabled={deletingDuplicate}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingDuplicate ? "Deleting..." : "Yes, delete it"}
                    </button>
                    <button
                      onClick={() => setDuplicateInfo(null)}
                      className="px-3 py-1.5 text-sm font-medium text-amber-800 bg-white border border-amber-300 rounded-md hover:bg-amber-50"
                    >
                      No, keep editing
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Supplement Details
              </h2>
              {detail && (
                <p className="text-sm text-gray-500 mt-0.5 truncate max-w-sm">
                  {detail.supplement_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={enterEditMode}
                    disabled={loadingDetail || !detail}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit2 className="w-4 h-4 mr-1.5" />
                    Edit
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={loadingDetail || !detail || approving}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BookmarkCheck className="w-4 h-4 mr-1.5" />
                    {approving ? "Saving..." : "Save to Library"}
                  </button>
                </>
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
                disabled={saving || approving}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-1 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1 p-6 space-y-8">
            {loadingDetail ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : !detail ? (
              <div className="text-center py-16 text-gray-500">
                Failed to load supplement details.
              </div>
            ) : (
              <>
                {/* ── Section: Core ─────────────────────────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Core Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow label="Supplement Name">
                      {isEditing && f ? (
                        <TextInput
                          value={f.supplement_name}
                          onChange={(v) => setField("supplement_name", v)}
                        />
                      ) : (
                        <ReadonlyText value={detail.supplement_name} />
                      )}
                    </FieldRow>

                    <FieldRow label="Brand">
                      {isEditing && f ? (
                        <TextInput
                          value={f.supplement_brand}
                          onChange={(v) => setField("supplement_brand", v)}
                        />
                      ) : (
                        <ReadonlyText value={detail.supplement_brand} />
                      )}
                    </FieldRow>

                    <FieldRow label="Packaging Form">
                      {isEditing && f ? (
                        <SelectInput
                          value={f.supplement_packaging_form_id}
                          onChange={(v) =>
                            setField("supplement_packaging_form_id", v)
                          }
                          options={packagingOptions}
                          placeholder="— Select packaging form —"
                        />
                      ) : (
                        <ReadonlyText value={detail.supplement_packaging_form} />
                      )}
                    </FieldRow>

                    <FieldRow label="Status">
                      {isEditing && f ? (
                        <SelectInput
                          value={f.supplement_status_id}
                          onChange={(v) => setField("supplement_status_id", v)}
                          options={statusOptions}
                          placeholder="— Select status —"
                        />
                      ) : (
                        <ReadonlyText value={detail.supplement_status} />
                      )}
                    </FieldRow>

                    <FieldRow label="Batch Testing Org">
                      {isEditing && f ? (
                        <TextInput
                          value={f.batch_testing_org}
                          onChange={(v) => setField("batch_testing_org", v)}
                        />
                      ) : (
                        <ReadonlyText value={detail.batch_testing_org} />
                      )}
                    </FieldRow>

                    <FieldRow label="Scraper Version">
                      <ReadonlyText value={detail.scraper_version} />
                    </FieldRow>

                    <div className="col-span-2">
                      <FieldRow label="Product Source URL">
                        {isEditing && f ? (
                          <TextInput
                            type="url"
                            value={f.product_source_url}
                            onChange={(v) => setField("product_source_url", v)}
                          />
                        ) : (() => {
                          const urls = Array.isArray(detail.product_source_url)
                            ? detail.product_source_url.filter(Boolean)
                            : detail.product_source_url
                            ? [detail.product_source_url]
                            : [];
                          if (urls.length === 0)
                            return <p className="text-sm text-gray-400">-</p>;
                          return (
                            <ul className="space-y-1">
                              {urls.map((url, i) => (
                                <li key={i}>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1 break-all"
                                  >
                                    {url}
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </FieldRow>
                    </div>
                  </div>
                </section>

                {/* ── Section: Description & Labels ─────────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Description & Labels
                  </h3>
                  <div className="space-y-4">
                    <FieldRow label="Description">
                      {isEditing && f ? (
                        <TextareaInput
                          value={f.supplement_description}
                          onChange={(v) => setField("supplement_description", v)}
                        />
                      ) : (
                        <ReadonlyText value={detail.supplement_description} />
                      )}
                    </FieldRow>

                    <FieldRow label="Warning Label">
                      {isEditing && f ? (
                        <TextareaInput
                          value={f.supplement_warning_label}
                          onChange={(v) =>
                            setField("supplement_warning_label", v)
                          }
                        />
                      ) : (
                        <ReadonlyText value={detail.supplement_warning_label} />
                      )}
                    </FieldRow>

                    <FieldRow label="Certifications">
                      {isEditing && f ? (
                        <TextareaInput
                          value={f.supplement_certifications}
                          onChange={(v) =>
                            setField("supplement_certifications", v)
                          }
                        />
                      ) : (
                        <ReadonlyText value={detail.supplement_certifications} />
                      )}
                    </FieldRow>

                    <FieldRow label="Additional Information">
                      {isEditing && f ? (
                        <TextareaInput
                          value={f.supplement_additional_information}
                          onChange={(v) =>
                            setField("supplement_additional_information", v)
                          }
                          rows={4}
                        />
                      ) : (
                        <ReadonlyText
                          value={detail.supplement_additional_information}
                        />
                      )}
                    </FieldRow>
                  </div>
                </section>

                {/* ── Section: Nutritional & Ingredients ────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Nutritional & Ingredients
                  </h3>
                  <div className="space-y-4">
                    <FieldRow label="Serving Size Definition">
                      {isEditing && f ? (
                        <TextInput
                          value={f.nutritional_info_per_serving_definition}
                          onChange={(v) =>
                            setField(
                              "nutritional_info_per_serving_definition",
                              v,
                            )
                          }
                        />
                      ) : (
                        <ReadonlyText
                          value={
                            detail.nutritional_info_per_serving_definition
                          }
                        />
                      )}
                    </FieldRow>

                    <FieldRow label="Ingredients">
                      {isEditing && f ? (
                        <IngredientTableEdit
                          rows={f.supplement_ingredient}
                          onChange={(rows) =>
                            setField("supplement_ingredient", rows)
                          }
                        />
                      ) : (
                        <IngredientListView value={detail.supplement_ingredient} />
                      )}
                    </FieldRow>

                    <FieldRow label="Nutritional Info Per Serving">
                      {isEditing && f ? (
                        <NutritionalTableEdit
                          rows={f.nutritional_info_per_serving}
                          onChange={(rows) =>
                            setField("nutritional_info_per_serving", rows)
                          }
                        />
                      ) : (
                        <NutritionalTableView
                          value={detail.nutritional_info_per_serving}
                        />
                      )}
                    </FieldRow>

                    <FieldRow label="Nutritional Info Per 100g">
                      {isEditing && f ? (
                        <NutritionalTableEdit
                          rows={f.nutritional_info_per_100g}
                          onChange={(rows) =>
                            setField("nutritional_info_per_100g", rows)
                          }
                        />
                      ) : (
                        <NutritionalTableView
                          value={detail.nutritional_info_per_100g}
                        />
                      )}
                    </FieldRow>
                  </div>
                </section>

                {/* ── Section: Review Status ─────────────────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Review Status
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      detail.is_reviewed
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {detail.is_reviewed ? "Reviewed" : "Pending Review"}
                  </span>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StagingDetailModal;
