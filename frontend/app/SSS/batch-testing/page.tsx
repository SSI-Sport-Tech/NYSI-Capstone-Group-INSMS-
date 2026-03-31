"use client";

import { useState, useRef } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import SupplementTabBar from "@/components/SSS/SupplementTabBar";
import {
  Upload,
  Loader,
  CheckCircle,
  XCircle,
  ImageIcon,
  X,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

interface SearchForm {
  supplement_name: string;
  supplement_brand: string;
  batch_id: string;
}

interface VerificationResult {
  supplement_brand: string;
  supplement_name: string;
  batch_id: string;
  is_verified: boolean;
  is_batch_tested: boolean;
  batch_id_verified: boolean;
  found_count: number;
  found_websites: string[];
  results: unknown[];
  quick_links: string[];
}

export default function BatchTesting() {
  // Manual search form — always visible
  const [searchForm, setSearchForm] = useState<SearchForm>({
    supplement_name: "",
    supplement_brand: "",
    batch_id: "",
  });

  // OCR section
  const [showOcr, setShowOcr] = useState(false);
  const [brandImage, setBrandImage] = useState<File | null>(null);
  const [batchImage, setBatchImage] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const brandInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  // Verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const setField = (field: keyof SearchForm, value: string) =>
    setSearchForm((prev) => ({ ...prev, [field]: value }));

  // ── OCR handlers ────────────────────────────────────────────────────────────

  const handleBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setBrandImage(file); setExtractError(null); }
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBatchImage(file);
  };

  const removeBrandImage = () => {
    setBrandImage(null);
    setExtractError(null);
    if (brandInputRef.current) brandInputRef.current.value = "";
  };

  const removeBatchImage = () => {
    setBatchImage(null);
    if (batchInputRef.current) batchInputRef.current.value = "";
  };

  const runExtract = async () => {
    if (!brandImage) return;
    setIsExtracting(true);
    setExtractError(null);

    try {
      const formData = new FormData();
      formData.append("brand_image", brandImage);
      if (batchImage) formData.append("batch_image", batchImage);

      const response = await axios.post("/api/ocr/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });

      if (response.data?.success && response.data?.extracted) {
        const { supplement_name, supplement_brand, batch_id } = response.data.extracted;
        setSearchForm({
          supplement_name: supplement_name || "",
          supplement_brand: supplement_brand || "",
          batch_id: batch_id || "",
        });
        // Collapse OCR section after successful extraction
        setShowOcr(false);
      } else {
        setExtractError("Failed to extract supplement information from the image.");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setExtractError(e?.response?.data?.error || "An error occurred during extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Verify ──────────────────────────────────────────────────────────────────

  const runVerify = async () => {
    setIsVerifying(true);
    setVerifyError(null);
    setVerificationResult(null);

    try {
      const response = await axios.post(
        "/api/ocr/verify",
        {
          supplement_brand: searchForm.supplement_brand.trim() || undefined,
          supplement_name: searchForm.supplement_name.trim() || undefined,
          ...(searchForm.batch_id.trim() ? { batch_id: searchForm.batch_id.trim() } : {}),
        },
        { headers: { "Content-Type": "application/json" }, timeout: 360000 }
      );

      if (response.data?.success) {
        setVerificationResult(response.data.verification);
      } else {
        setVerifyError("Verification failed. Please try again.");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setVerifyError(e?.response?.data?.error || "An error occurred during verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  const resetAll = () => {
    setSearchForm({ supplement_name: "", supplement_brand: "", batch_id: "" });
    setBrandImage(null);
    setBatchImage(null);
    setVerificationResult(null);
    setVerifyError(null);
    setExtractError(null);
    if (brandInputRef.current) brandInputRef.current.value = "";
    if (batchInputRef.current) batchInputRef.current.value = "";
  };

  const canSearch =
    (searchForm.supplement_name.trim() && searchForm.supplement_brand.trim()) ||
    searchForm.batch_id.trim();

  return (
    <DashboardLayout>
      <SupplementTabBar activeId="batch-testing" />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-5">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
              Batch Verification
            </h1>
            <p className="text-gray-600">
              Search supplements by name, brand, or batch number to verify batch testing status
            </p>
          </div>

          {/* ── Step 1: Search Form (always visible) ────────────────────── */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-4">
            <div className="flex items-center gap-3 p-6 pb-5 border-b border-gray-100">
              <div className="bg-blue-100 rounded-xl p-2.5">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Search Supplement</h2>
                <p className="text-sm text-gray-500">
                  Enter name + brand, or search by batch number alone
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Supplement Name
                  </label>
                  <input
                    type="text"
                    value={searchForm.supplement_name}
                    onChange={(e) => setField("supplement_name", e.target.value)}
                    className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Whey Protein"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Supplement Brand
                  </label>
                  <input
                    type="text"
                    value={searchForm.supplement_brand}
                    onChange={(e) => setField("supplement_brand", e.target.value)}
                    className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Optimum Nutrition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Batch Number{" "}
                    <span className="text-gray-400 font-normal">(search by batch number alone)</span>
                  </label>
                  <input
                    type="text"
                    value={searchForm.batch_id}
                    onChange={(e) => setField("batch_id", e.target.value)}
                    className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. FC145"
                  />
                </div>
              </div>

              {verifyError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{verifyError}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={resetAll}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={runVerify}
                  disabled={!canSearch || isVerifying}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {isVerifying ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Check Batch Tested
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Optional: OCR Image Upload ───────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            {/* Collapsible header */}
            <button
              onClick={() => setShowOcr((v) => !v)}
              className="w-full flex items-center justify-between gap-3 p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-xl p-2.5">
                  <Upload className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Extract from Label Image{" "}
                    <span className="text-sm font-normal text-gray-400">(optional)</span>
                  </h2>
                  <p className="text-sm text-gray-500">
                    Upload a supplement label photo to auto-fill the search fields above
                  </p>
                </div>
              </div>
              {showOcr ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>

            {showOcr && (
              <div className="border-t border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Supplement Label */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplement Label <span className="text-red-500">*</span>
                    </label>
                    {brandImage ? (
                      <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{brandImage.name}</p>
                            <p className="text-xs text-gray-500">{(brandImage.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button onClick={removeBrandImage} className="ml-3 text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => brandInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer"
                      >
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Click to upload</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 10MB</p>
                        <input ref={brandInputRef} type="file" accept="image/*" onChange={handleBrandChange} className="hidden" />
                      </div>
                    )}
                  </div>

                  {/* Batch Number Label */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number Label{" "}
                      <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    {batchImage ? (
                      <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{batchImage.name}</p>
                            <p className="text-xs text-gray-500">{(batchImage.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button onClick={removeBatchImage} className="ml-3 text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => batchInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer"
                      >
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Click to upload</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 10MB</p>
                        <input ref={batchInputRef} type="file" accept="image/*" onChange={handleBatchChange} className="hidden" />
                      </div>
                    )}
                  </div>
                </div>

                {extractError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{extractError}</p>
                  </div>
                )}

                <div className="flex justify-end mt-5">
                  <button
                    onClick={runExtract}
                    disabled={!brandImage || isExtracting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    {isExtracting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        Extract & Fill Fields
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Step 3: Verification Results ────────────────────────────── */}
          {verificationResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-5 border-b border-gray-100">
                <div className={`rounded-xl p-2.5 ${verificationResult.is_verified ? "bg-green-100" : "bg-red-100"}`}>
                  {verificationResult.is_verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Verification Results</h2>
                  <p className="text-sm text-gray-500">
                    {verificationResult.supplement_name}
                    {verificationResult.supplement_brand ? ` by ${verificationResult.supplement_brand}` : ""}
                    {verificationResult.batch_id ? ` — Batch: ${verificationResult.batch_id}` : ""}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${verificationResult.is_verified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {verificationResult.is_verified ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {verificationResult.is_verified ? "Verified" : "Not Verified"}
                  </span>

                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${verificationResult.is_batch_tested ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>
                    {verificationResult.is_batch_tested ? "Batch Tested" : "Not Batch Tested"}
                  </span>

                  {verificationResult.batch_id && (
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${verificationResult.batch_id_verified ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"}`}>
                      {verificationResult.batch_id_verified ? "Batch ID Confirmed" : "Batch ID Not Found"}
                    </span>
                  )}

                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                    Found on {verificationResult.found_count} site{verificationResult.found_count !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Certified by */}
                {verificationResult.found_websites?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Certified By</h3>
                    <div className="flex flex-wrap gap-2">
                      {verificationResult.found_websites.map((site, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {site}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certification links */}
                {verificationResult.quick_links?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Certification Links</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {verificationResult.quick_links.map((url, i) => {
                        let label = url;
                        try { label = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep raw url */ }
                        return (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors group"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 group-hover:text-blue-600 truncate">{label}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {verificationResult.found_count === 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-sm text-gray-600">No certifications found for this supplement.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
