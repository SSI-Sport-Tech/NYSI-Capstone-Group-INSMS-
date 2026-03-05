"use client";

import { useState, useRef } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import ViewTabs from "@/components/SSS/ViewTabs";
import {
  Upload,
  Loader,
  CheckCircle,
  XCircle,
  ImageIcon,
  X,
} from "lucide-react";

interface ExtractedForm {
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
  results: any[];
  quick_links: string[];
}

const tabs = [
  {
    id: "library",
    label: "Supplement Library",
    icon: "library",
    href: "/SSS/library",
  },
  {
    id: "inventory",
    label: "Current Inventory View",
    icon: "inventory",
    href: "/SSS/inventory",
  },
  {
    id: "scraper",
    label: "Web Scraper View",
    icon: "scraper",
    href: "/SSS/web-scraper",
  },
  {
    id: "batch-testing",
    label: "Batch OCR Testing",
    icon: "batch",
    href: "/SSS/batch-testing",
  },
];

export default function BatchTesting() {
  const [brandImage, setBrandImage] = useState<File | null>(null);
  const [batchImage, setBatchImage] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [extractedForm, setExtractedForm] = useState<ExtractedForm | null>(
    null
  );
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const brandInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const handleBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrandImage(file);
      setExtractedForm(null);
      setVerificationResult(null);
      setExtractError(null);
      setVerifyError(null);
    }
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBatchImage(file);
  };

  const removeBrandImage = () => {
    setBrandImage(null);
    setExtractedForm(null);
    setVerificationResult(null);
    setExtractError(null);
    setVerifyError(null);
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
    setExtractedForm(null);
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append("brand_image", brandImage);
      if (batchImage) formData.append("batch_image", batchImage);

      const response = await axios.post("/api/ocr/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });

      if (response.data?.success && response.data?.extracted) {
        const { supplement_name, supplement_brand, batch_id } =
          response.data.extracted;
        setExtractedForm({
          supplement_name: supplement_name || "",
          supplement_brand: supplement_brand || "",
          batch_id: batch_id || "",
        });
      } else {
        setExtractError(
          "Failed to extract supplement information from the image."
        );
      }
    } catch (err: any) {
      setExtractError(
        err?.response?.data?.error || "An error occurred during extraction."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const runVerify = async () => {
    if (
      !extractedForm ||
      !extractedForm.supplement_name.trim() ||
      !extractedForm.supplement_brand.trim()
    )
      return;

    setIsVerifying(true);
    setVerifyError(null);
    setVerificationResult(null);

    try {
      const response = await axios.post(
        "/api/ocr/verify",
        {
          supplement_brand: extractedForm.supplement_brand,
          supplement_name: extractedForm.supplement_name,
          ...(extractedForm.batch_id
            ? { batch_id: extractedForm.batch_id }
            : {}),
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 120000,
        }
      );

      if (response.data?.success) {
        setVerificationResult(response.data.verification);
      } else {
        setVerifyError("Verification failed. Please try again.");
      }
    } catch (err: any) {
      setVerifyError(
        err?.response?.data?.error || "An error occurred during verification."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const resetAll = () => {
    setBrandImage(null);
    setBatchImage(null);
    setExtractedForm(null);
    setVerificationResult(null);
    setExtractError(null);
    setVerifyError(null);
    if (brandInputRef.current) brandInputRef.current.value = "";
    if (batchInputRef.current) batchInputRef.current.value = "";
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-5">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
              Batch OCR Testing
            </h1>
            <p className="text-gray-600">
              Upload supplement label images to extract and verify batch testing
              status
            </p>
          </div>

          {/* Tabs */}
          <ViewTabs tabs={tabs} />

          {/* Step 1: Upload Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            <div className="flex items-center gap-3 p-6 pb-5 border-b border-gray-100">
              <div className="bg-blue-100 rounded-xl p-2.5">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Upload Images
                </h2>
                <p className="text-sm text-gray-500">
                  Upload a supplement label to extract product information
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supplement Label Upload */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Supplement Label{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {brandImage ? (
                    <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                          <ImageIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {brandImage.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(brandImage.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeBrandImage}
                        className="ml-3 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => brandInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200 cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG, WEBP up to 10MB
                      </p>
                      <input
                        ref={brandInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBrandChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Batch Number Label Upload */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Batch Number Label{" "}
                    <span className="text-gray-400 font-normal">
                      (Optional)
                    </span>
                  </label>
                  {batchImage ? (
                    <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                          <ImageIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {batchImage.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(batchImage.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeBatchImage}
                        className="ml-3 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => batchInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200 cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG, WEBP up to 10MB
                      </p>
                      <input
                        ref={batchInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBatchChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Extraction error */}
              {extractError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{extractError}</p>
                </div>
              )}

              {/* Run Batch Test button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={runExtract}
                  disabled={!brandImage || isExtracting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  {isExtracting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    "Run Batch Test"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Extracted Info Form */}
          {extractedForm && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
              <div className="flex items-center gap-3 p-6 pb-5 border-b border-gray-100">
                <div className="bg-green-100 rounded-xl p-2.5">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Extracted Information
                  </h2>
                  <p className="text-sm text-gray-500">
                    Review and edit the extracted data before verifying
                  </p>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Supplement Name */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Supplement Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={extractedForm.supplement_name}
                      onChange={(e) =>
                        setExtractedForm({
                          ...extractedForm,
                          supplement_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter supplement name"
                    />
                  </div>

                  {/* Supplement Brand */}
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Supplement Brand <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={extractedForm.supplement_brand}
                      onChange={(e) =>
                        setExtractedForm({
                          ...extractedForm,
                          supplement_brand: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter supplement brand"
                    />
                  </div>

                  {/* Batch Number — full width */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-black mb-2">
                      Batch Number{" "}
                      <span className="text-gray-400 font-normal">
                        (Optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={extractedForm.batch_id}
                      onChange={(e) =>
                        setExtractedForm({
                          ...extractedForm,
                          batch_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter batch number (if available)"
                    />
                  </div>
                </div>

                {/* Verify error */}
                {verifyError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{verifyError}</p>
                  </div>
                )}

                {/* Footer buttons */}
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={resetAll}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={runVerify}
                    disabled={
                      !extractedForm.supplement_name.trim() ||
                      !extractedForm.supplement_brand.trim() ||
                      isVerifying
                    }
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  >
                    {isVerifying ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Check Batch Tested"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Verification Results */}
          {verificationResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 p-6 pb-5 border-b border-gray-100">
                <div
                  className={`rounded-xl p-2.5 ${
                    verificationResult.is_verified
                      ? "bg-green-100"
                      : "bg-red-100"
                  }`}
                >
                  {verificationResult.is_verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Verification Results
                  </h2>
                  <p className="text-sm text-gray-500">
                    {verificationResult.supplement_name} by{" "}
                    {verificationResult.supplement_brand}
                    {verificationResult.batch_id
                      ? ` — Batch: ${verificationResult.batch_id}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                      verificationResult.is_verified
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {verificationResult.is_verified ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {verificationResult.is_verified
                      ? "Verified"
                      : "Not Verified"}
                  </span>

                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                      verificationResult.is_batch_tested
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {verificationResult.is_batch_tested
                      ? "Batch Tested"
                      : "Not Batch Tested"}
                  </span>

                  {verificationResult.batch_id && (
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                        verificationResult.batch_id_verified
                          ? "bg-purple-100 text-purple-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {verificationResult.batch_id_verified
                        ? "Batch ID Confirmed"
                        : "Batch ID Not Found"}
                    </span>
                  )}

                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                    Found on {verificationResult.found_count} site
                    {verificationResult.found_count !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Certified by */}
                {verificationResult.found_websites?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-black mb-3">
                      Certified By
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {verificationResult.found_websites.map((site, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"
                        >
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
                    <h3 className="text-sm font-medium text-black mb-3">
                      Certification Links
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {verificationResult.quick_links.map((url, i) => {
                        let label = url;
                        try {
                          label = new URL(url).hostname.replace(/^www\./, "");
                        } catch {}
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors group"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors truncate">
                              {label}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No results */}
                {verificationResult.found_count === 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-sm text-gray-600">
                      No certifications found for this supplement.
                    </p>
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
