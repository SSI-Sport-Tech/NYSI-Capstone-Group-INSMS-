"use client";

import { useState, useEffect } from "react";
import axios from "axios";

const OCR_SESSION_KEY = "ocr_modal_state";
import { upsertTab } from "@/utils/supplementTabs";
import { X, Upload, Loader, HelpCircle, CheckCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NutritionalRow {
  nutrient: string;
  amount: string;
}

interface SimilarSupplement {
  supplement_id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_status: string;
  supplement_packaging_form: string;
  batch_testing_org: string | null;
  similarity_score: string;
  matched_vector: string;
}

type Step = "upload" | "extracting" | "verify" | "searching" | "result";

// ─────────────────────────────────────────────────────────────────────────────
// Data conversion helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert supplement_ingredient from the LLM response to a plain string[].
 * The Python schema returns List[Ingredient] where Ingredient = { name: str },
 * but the field is typed as Any so it may also arrive as a plain string[].
 */
function parseIngredients(raw: unknown): string[] {
  if (!raw) return [""];

  if (Array.isArray(raw)) {
    if (raw.length === 0) return [""];
    const strings = raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          // SupplementStagingSchema Ingredient shape: { name: str }
          const val =
            obj.name ??
            obj.ingredient ??
            obj.value ??
            Object.values(obj).find((v) => typeof v === "string");
          return typeof val === "string" ? val.trim() : "";
        }
        return String(item).trim();
      })
      .filter(Boolean);
    return strings.length > 0 ? strings : [""];
  }

  // Fallback: comma-separated string
  if (typeof raw === "string") {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [""];
  }

  return [""];
}

/**
 * Convert the LLM's nutritional_info field into editable NutritionalRow[].
 * Handles two formats the LLM may return:
 *   { nutrients: [{ name, amount, daily_value }] }   (structured)
 *   { "Protein": "25g", ... }                        (flat object)
 */
function parseNutritionalInfo(info: unknown): NutritionalRow[] {
  if (!info || typeof info !== "object") return [{ nutrient: "", amount: "" }];
  const obj = info as Record<string, unknown>;

  if (Array.isArray(obj.nutrients)) {
    const rows = (obj.nutrients as Array<Record<string, string>>)
      .filter((n) => n?.name)
      .map((n) => ({ nutrient: n.name ?? "", amount: n.amount ?? "" }));
    return rows.length > 0 ? rows : [{ nutrient: "", amount: "" }];
  }

  const entries = Object.entries(obj).filter(([, v]) => typeof v !== "object");
  if (entries.length > 0) {
    return entries.map(([k, v]) => ({ nutrient: k, amount: String(v ?? "") }));
  }

  return [{ nutrient: "", amount: "" }];
}

/**
 * Convert editable rows back to the { name, amount }[] shape that
 * POST /api/ocr/find-alternatives expects.
 */
function rowsToNutrients(rows: NutritionalRow[]) {
  return rows
    .filter((r) => r.nutrient.trim())
    .map((r) => ({ name: r.nutrient.trim(), amount: r.amount.trim() }));
}

// ─────────────────────────────────────────────────────────────────────────────
// NutritionalTable sub-component (Mx2 + delete column)
// Matches the exact table pattern used in AddSupplementModal.tsx
// ─────────────────────────────────────────────────────────────────────────────

function NutritionalTable({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: NutritionalRow[];
  onChange: React.Dispatch<React.SetStateAction<NutritionalRow[]>>;
}) {
  const update = (i: number, field: keyof NutritionalRow, val: string) =>
    onChange((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      return next;
    });

  const remove = (i: number) =>
    onChange((prev) => prev.filter((_, idx) => idx !== i));

  const add = () => onChange((prev) => [...prev, { nutrient: "", amount: "" }]);

  return (
    <div>
      <label className="block text-sm text-gray-700 mb-2">{label}</label>
      <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">
              Nutrient
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">
              Amount
            </th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="px-2 py-1">
                <input
                  type="text"
                  value={row.nutrient}
                  onChange={(e) => update(i, "nutrient", e.target.value)}
                  placeholder="e.g. Protein"
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400 text-sm"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="text"
                  value={row.amount}
                  onChange={(e) => update(i, "amount", e.target.value)}
                  placeholder="e.g. 25g"
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400 text-sm"
                />
              </td>
              <td className="px-1 py-1 text-center">
                <button
                  type="button"
                  onClick={() => remove(i)}
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
        onClick={add}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        + Add Row
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal component
// ─────────────────────────────────────────────────────────────────────────────

const OCRModal: React.FC<OCRModalProps> = ({ isOpen, onClose }) => {
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Help note
  const [showNote, setShowNote] = useState(false);

  // Step machine
  const [step, setStep] = useState<Step>("upload");
  const [subMessage, setSubMessage] = useState(""); // shown below spinner during extraction
  const [error, setError] = useState("");

  // Editable form state (verify step)
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [nutPerServing, setNutPerServing] = useState<NutritionalRow[]>([
    { nutrient: "", amount: "" },
  ]);
  const [nutPer100g, setNutPer100g] = useState<NutritionalRow[]>([
    { nutrient: "", amount: "" },
  ]);
  const [servingSizeGrams, setServingSizeGrams] = useState<number | null>(null);

  // Results state
  const [results, setResults] = useState<{
    data: SimilarSupplement[];
    total: number;
  }>({ data: [], total: 0 });

  // Track which results have been opened as tabs
  const [openedTabs, setOpenedTabs] = useState<Set<string>>(new Set());

  // ── Persist state to sessionStorage (verify + result steps only) ──────────

  useEffect(() => {
    if (step === "verify" || step === "result") {
      sessionStorage.setItem(
        OCR_SESSION_KEY,
        JSON.stringify({
          step,
          ingredients,
          nutPerServing,
          nutPer100g,
          servingSizeGrams,
          results,
          openedTabs: [...openedTabs],
        }),
      );
    }
  }, [step, ingredients, nutPerServing, nutPer100g, servingSizeGrams, results, openedTabs]);

  // ── Restore state when modal opens ────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const saved = sessionStorage.getItem(OCR_SESSION_KEY);
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      if (s.step === "verify" || s.step === "result") {
        setStep(s.step);
        setIngredients(s.ingredients ?? [""]);
        setNutPerServing(s.nutPerServing ?? [{ nutrient: "", amount: "" }]);
        setNutPer100g(s.nutPer100g ?? [{ nutrient: "", amount: "" }]);
        setServingSizeGrams(s.servingSizeGrams ?? null);
        setResults(s.results ?? { data: [], total: 0 });
        setOpenedTabs(new Set(s.openedTabs ?? []));
      }
    } catch {
      // ignore corrupt session data
    }
  }, [isOpen]);

  // ── File upload ───────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, or WebP)");
      return;
    }
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  // ── Step 1: Upload → OCR-only → analyze-text ─────────────────────────────

  const handleExtract = async () => {
    if (!uploadedFile) return;
    setStep("extracting");
    setError("");

    try {
      setSubMessage("Extracting text from image…");
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const ocrRes = await axios.post("/api/ocr/ocr-only", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });

      if (!ocrRes.data?.success) {
        throw new Error(ocrRes.data?.error || "OCR extraction failed");
      }

      setSubMessage("Structuring nutritional data…");

      const analyzeRes = await axios.post(
        "/api/ocr/analyze-text",
        { raw_text: ocrRes.data.raw_text, generate_vectors: false },
        { timeout: 120000 },
      );

      if (!analyzeRes.data?.success) {
        throw new Error(analyzeRes.data?.error || "Structuring failed");
      }

      const data = analyzeRes.data.data || {};

      setIngredients(parseIngredients(data.supplement_ingredient));
      setNutPerServing(parseNutritionalInfo(data.nutritional_info_per_serving));
      setNutPer100g(parseNutritionalInfo(data.nutritional_info_per_100g));
      setServingSizeGrams(
        typeof data.serving_size_grams === "number"
          ? data.serving_size_grams
          : null,
      );

      setStep("verify");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to process image. Please try again.",
      );
      setStep("upload");
    }
  };

  // ── Step 2: Verified data → vectorize → DB search ────────────────────────

  const handleFindAlternatives = async () => {
    setStep("searching");
    setError("");

    try {
      const res = await axios.post(
        "/api/ocr/find-alternatives",
        {
          ingredients: ingredients.filter((i) => i.trim()),
          nutritional_per_serving: rowsToNutrients(nutPerServing),
          nutritional_per_100g: rowsToNutrients(nutPer100g),
          serving_size_grams: servingSizeGrams,
        },
        { timeout: 60000 },
      );

      if (!res.data?.success) {
        throw new Error(res.data?.error || "Search failed");
      }

      setResults({
        data: res.data.similar_supplements?.data || [],
        total: res.data.similar_supplements?.pagination?.total ?? 0,
      });
      setStep("result");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err.message ||
          "Failed to find alternatives. Please try again.",
      );
      setStep("verify");
    }
  };

  // ── Reset / close ─────────────────────────────────────────────────────────

  const handleReset = () => {
    sessionStorage.removeItem(OCR_SESSION_KEY);
    setUploadedFile(null);
    setPreviewUrl("");
    setStep("upload");
    setError("");
    setSubMessage("");
    setIngredients([""]);
    setNutPerServing([{ nutrient: "", amount: "" }]);
    setNutPer100g([{ nutrient: "", amount: "" }]);
    setServingSizeGrams(null);
    setResults({ data: [], total: 0 });
    setOpenedTabs(new Set());
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  const HEADER: Record<Step, string> = {
    upload: "Upload Nutritional Label",
    extracting: "Analysing Label…",
    verify: "Verify Extracted Data",
    searching: "Finding Alternatives…",
    result: "Similar Supplements Found",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-gray-900">{HEADER[step]}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNote((v) => !v)}
              className={`transition-colors ${showNote ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              aria-label="How alternatives work"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ── Help note (dismissible) ── */}
        {showNote && (
          <div className="shrink-0 mx-6 mt-4 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="flex-1 text-sm text-blue-800">
              Alternatives are determined using either Nutritional Content per
              serving or Nutritional Content per 100g. Similarity score
              reflected is based on whichever is higher when comparing (Per
              Serving vs Per Serving, Per 100g vs Per 100g).
            </p>
            <button
              onClick={() => setShowNote(false)}
              className="shrink-0 text-blue-400 hover:text-blue-600 transition-colors mt-0.5"
              aria-label="Dismiss note"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 p-6">
          {/* ─── Upload step ─── */}
          {step === "upload" && (
            <div className="space-y-4">
              {previewUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </p>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-64 rounded-lg border border-gray-200 mx-auto object-contain"
                  />
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PNG, JPG, WebP up to 10 MB
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {uploadedFile && (
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleExtract}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Analyse Label
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── Extracting spinner ─── */}
          {step === "extracting" && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-700 font-medium">
                Analysing your label
              </p>
              <p className="text-gray-500 text-sm mt-1">{subMessage}</p>
              <p className="text-gray-400 text-xs mt-3">
                This may take a minute
              </p>
            </div>
          )}

          {/* ─── Verify step ─── */}
          {step === "verify" && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                The label has been extracted and structured. Review and correct
                the data below, then click{" "}
                <span className="font-medium">Find Alternatives</span>.
              </p>

              {/* Ingredients (Nx1) */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Ingredients
                </label>
                <div className="space-y-1">
                  {ingredients.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) =>
                          setIngredients((prev) => {
                            const next = [...prev];
                            next[i] = e.target.value;
                            return next;
                          })
                        }
                        placeholder="e.g. Vitamin D3"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setIngredients((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        disabled={ingredients.length === 1}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIngredients((prev) => [...prev, ""])}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add Row
                </button>
              </div>

              {/* Nutritional Info per Serving (Mx2) */}
              <NutritionalTable
                label="Nutritional Info per Serving"
                rows={nutPerServing}
                onChange={setNutPerServing}
              />

              {/* Nutritional Info per 100g (Mx2) */}
              <NutritionalTable
                label="Nutritional Info per 100g"
                rows={nutPer100g}
                onChange={setNutPer100g}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Start Over
                </button>
                <button
                  onClick={handleFindAlternatives}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Find Alternatives
                </button>
              </div>
            </div>
          )}

          {/* ─── Searching spinner ─── */}
          {step === "searching" && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-700 font-medium">
                Searching the supplement database
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Comparing nutritional profiles…
              </p>
            </div>
          )}

          {/* ─── Result step ─── */}
          {step === "result" && (
            <div className="space-y-4">
              {results.data.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    Found{" "}
                    <span className="font-semibold text-gray-900">
                      {results.total}
                    </span>{" "}
                    supplement{results.total !== 1 ? "s" : ""} with a similar
                    nutritional profile. Click a row to open it as a tab above.
                  </p>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {results.data.map((s) => {
                      const isOpened = openedTabs.has(s.supplement_id);
                      return (
                        <div
                          key={s.supplement_id}
                          onClick={() => {
                            upsertTab({
                              id: s.supplement_id,
                              name: s.supplement_name,
                              brand: s.supplement_brand,
                            });
                            setOpenedTabs((prev) => new Set([...prev, s.supplement_id]));
                          }}
                          className={`flex items-center justify-between rounded-lg px-4 py-3 cursor-pointer transition-colors border ${
                            isOpened
                              ? "bg-green-50 border-green-200 hover:bg-green-100"
                              : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isOpened && (
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">
                                {s.supplement_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {s.supplement_brand}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-sm font-semibold text-blue-600">
                              {Math.round(parseFloat(s.similarity_score) * 100)}%
                              match
                            </p>
                            <p className="text-xs text-gray-500">
                              {s.supplement_status}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 font-medium">
                    No matching supplements found
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    No supplements in the library match this nutritional
                    profile.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Scan Another
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRModal;
