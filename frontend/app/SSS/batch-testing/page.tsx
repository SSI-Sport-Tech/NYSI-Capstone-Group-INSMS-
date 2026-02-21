"use client";

import { useState } from "react";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import ViewTabs from "@/components/SSS/ViewTabs";
import {
  Upload,
  Loader,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
} from "lucide-react";

interface OCRAnalysisResult {
  supplement_name?: string;
  supplement_brand?: string;
  supplement_ingredient?: string[];
  nutritional_info_per_serving?: Record<string, string>;
  nutritional_info_per_100g?: Record<string, string>;
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
  quick_links: any[];
}

interface BatchTestResult {
  id: string;
  fileName: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: OCRAnalysisResult;
  verification?: VerificationResult;
  error?: string;
  uploadTime: Date;
  processingTime?: number;
}

const tabs = [
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
    id: "library",
    label: "Supplement Library",
    icon: "library",
    href: "/SSS/library",
  },
  {
    id: "batch-testing",
    label: "Batch OCR Testing",
    icon: "batch",
    href: "/SSS/batch-testing",
  },
];

export default function BatchTesting() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [testResults, setTestResults] = useState<BatchTestResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    setUploadedFiles((prev) => [...prev, ...imageFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setTestResults([]);
    setProcessingProgress(0);
  };

  const runBatchTest = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    const initialResults: BatchTestResult[] = uploadedFiles.map(
      (file, index) => ({
        id: `${Date.now()}-${index}`,
        fileName: file.name,
        status: "pending",
        uploadTime: new Date(),
      }),
    );

    setTestResults(initialResults);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const resultId = initialResults[i].id;

      // Update status to processing
      setTestResults((prev) =>
        prev.map((result) =>
          result.id === resultId
            ? { ...result, status: "processing" as const }
            : result,
        ),
      );

      try {
        const startTime = Date.now();

        // Step 1: Extract supplement information from the image
        const formData = new FormData();
        formData.append("brand_image", file);

        const extractResponse = await axios.post("/api/ocr/extract", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 120000,
        });

        if (
          !extractResponse.data?.success ||
          !extractResponse.data?.extracted
        ) {
          const processingTime = Date.now() - startTime;
          setTestResults((prev) =>
            prev.map((result) =>
              result.id === resultId
                ? {
                    ...result,
                    status: "failed" as const,
                    error: "Failed to extract supplement information",
                    processingTime,
                  }
                : result,
            ),
          );
          continue;
        }

        const extractedData = extractResponse.data.extracted;

        // Step 2: Verify batch testing status with extracted information
        const verifyResponse = await axios.post(
          "/api/ocr/verify",
          {
            supplement_brand: extractedData.supplement_brand || "Unknown",
            supplement_name: extractedData.supplement_name || "Unknown",
            batch_id: extractedData.batch_id || "",
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 30000,
          },
        );

        const processingTime = Date.now() - startTime;

        if (verifyResponse.data?.success) {
          setTestResults((prev) =>
            prev.map((result) =>
              result.id === resultId
                ? {
                    ...result,
                    status: "completed" as const,
                    result: extractedData,
                    verification: verifyResponse.data.verification,
                    processingTime,
                  }
                : result,
            ),
          );
        } else {
          setTestResults((prev) =>
            prev.map((result) =>
              result.id === resultId
                ? {
                    ...result,
                    status: "failed" as const,
                    error: "Failed to verify batch testing status",
                    processingTime,
                  }
                : result,
            ),
          );
        }
      } catch (error: any) {
        const processingTime = Date.now() - Date.now();
        setTestResults((prev) =>
          prev.map((result) =>
            result.id === resultId
              ? {
                  ...result,
                  status: "failed" as const,
                  error: error?.response?.data?.error || "OCR analysis failed",
                  processingTime,
                }
              : result,
          ),
        );
      }

      setProcessingProgress(((i + 1) / uploadedFiles.length) * 100);
    }

    setIsProcessing(false);
  };

  const downloadResults = () => {
    const results = {
      testDate: new Date().toISOString(),
      totalFiles: uploadedFiles.length,
      successfulAnalyses: testResults.filter((r) => r.status === "completed")
        .length,
      failedAnalyses: testResults.filter((r) => r.status === "failed").length,
      averageProcessingTime:
        testResults
          .filter((r) => r.processingTime)
          .reduce((sum, r) => sum + (r.processingTime || 0), 0) /
          testResults.filter((r) => r.processingTime).length || 0,
      results: testResults,
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-ocr-test-results-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: BatchTestResult["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "processing":
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
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
              Test OCR analysis capabilities on multiple supplement label images
            </p>
          </div>

          {/* Tabs */}
          <ViewTabs tabs={tabs} />

          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            {/* Header with icon and title */}
            <div className="flex items-center gap-3 p-6 pb-4">
              <div className="bg-blue-100 rounded-xl p-2.5">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Upload Images for Batch Testing
                </h2>
                <p className="text-gray-500 text-sm">
                  Select multiple supplement label images to analyze with OCR
                </p>
              </div>
            </div>

            {/* Main upload area */}
            <div className="px-6 pb-6">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                <label className="flex flex-col items-center cursor-pointer">
                  <div className="bg-gray-100 rounded-full p-4 mb-6">
                    <Upload className="w-8 h-8 text-gray-500" />
                  </div>
                  <span className="text-lg font-medium text-gray-900 mb-2">
                    Drop images here or click to browse
                  </span>
                  <span className="text-sm text-gray-500">
                    PNG, JPG, GIF up to 10MB each
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium text-gray-900">
                      Uploaded Files ({uploadedFiles.length})
                    </h3>
                    <button
                      onClick={clearAll}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <span className="text-sm text-gray-700 truncate flex-1">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFile(index)}
                          className="ml-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom section with status and button */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {uploadedFiles.length === 0
                    ? "No files selected"
                    : `${uploadedFiles.length} files selected`}
                </span>
                {testResults.length > 0 && (
                  <button
                    onClick={downloadResults}
                    className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download Results
                  </button>
                )}
              </div>

              <button
                onClick={runBatchTest}
                disabled={uploadedFiles.length === 0 || isProcessing}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Run Batch Test"
                )}
              </button>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="px-6 pb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Processing images...</span>
                  <span>{Math.round(processingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          {testResults.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Test Results
              </h2>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {testResults.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Files</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.filter((r) => r.status === "completed").length}
                  </div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter((r) => r.status === "failed").length}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {
                      testResults.filter(
                        (r) =>
                          r.status === "processing" || r.status === "pending",
                      ).length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        File Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Processing Time
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Supplement Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Brand
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Batch ID
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Verified
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Batch Tested
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Found Count
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((result) => (
                      <tr
                        key={result.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <span className="capitalize text-sm">
                              {result.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-900 max-w-xs truncate">
                          {result.fileName}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {result.processingTime
                            ? `${(result.processingTime / 1000).toFixed(1)}s`
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {result.verification?.supplement_name ||
                            result.result?.supplement_name ||
                            "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {result.verification?.supplement_brand ||
                            result.result?.supplement_brand ||
                            "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {result.verification?.batch_id || "-"}
                        </td>
                        <td className="py-3 px-4">
                          {result.verification ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                result.verification.is_verified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {result.verification.is_verified
                                ? "Verified"
                                : "Not Verified"}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {result.verification ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                result.verification.is_batch_tested
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {result.verification.is_batch_tested
                                ? "Batch Tested"
                                : "Not Batch Tested"}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {result.verification?.found_count ?? "-"}
                        </td>
                        <td className="py-3 px-4 text-red-600 text-xs max-w-xs truncate">
                          {result.error || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
