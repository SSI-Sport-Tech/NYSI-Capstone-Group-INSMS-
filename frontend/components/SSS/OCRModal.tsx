"use client";

import { useState } from "react";
import axios from "axios";
import { X, Upload, Loader } from "lucide-react";

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (data: OCRAnalysisResult) => void;
}

interface OCRAnalysisResult {
  supplement_name?: string;
  supplement_brand?: string;
  supplement_ingredient?: string[];
  nutritional_info_per_serving?: Record<string, string>;
  nutritional_info_per_100g?: Record<string, string>;
}

const OCRModal: React.FC<OCRModalProps> = ({
  isOpen,
  onClose,
  onAnalysisComplete,
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisResult, setAnalysisResult] =
    useState<OCRAnalysisResult | null>(null);
  const [step, setStep] = useState<"upload" | "processing" | "result">(
    "upload",
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError("");
      setStep("upload");
    }
  };

  const handleAnalyzeOCR = async () => {
    if (!uploadedFile) {
      setError("Please upload an image first!");
      return;
    }

    setLoading(true);
    setError("");
    setStep("processing");

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await axios.post("/api/ocr/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000,
      });

      if (response.data?.success && response.data?.extracted) {
        setAnalysisResult(response.data.extracted);
        setStep("result");
        onAnalysisComplete?.(response.data.extracted);
      } else {
        setError("Failed to analyze OCR data");
        setStep("upload");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "OCR analysis failed. Please try again.",
      );
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleExtractData = async () => {
    if (!uploadedFile) {
      setError("Please upload an image first!");
      return;
    }

    setLoading(true);
    setError("");
    setStep("processing");

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await axios.post("/api/ocr/extract", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000,
      });

      if (response.data?.success && response.data?.extracted) {
        setAnalysisResult(response.data.extracted);
        setStep("result");
        onAnalysisComplete?.(response.data.extracted);
      } else {
        setError("Failed to extract data from image");
        setStep("upload");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Data extraction failed. Please try again.",
      );
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setPreviewUrl("");
    setError("");
    setAnalysisResult(null);
    setStep("upload");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {step === "upload" && "Upload Supplement Label"}
            {step === "processing" && "Analyzing Image..."}
            {step === "result" && "Analysis Results"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Step */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Image Preview */}
              {previewUrl && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </p>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-64 rounded-lg border border-gray-200 mx-auto"
                  />
                </div>
              )}

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF up to 10MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              {uploadedFile && (
                <div className="space-y-2">
                  <button
                    onClick={handleAnalyzeOCR}
                    className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Analyze Nutrition Label
                  </button>
                  <button
                    onClick={handleExtractData}
                    className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Extract Brand & Batch ID
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">
                Analyzing your supplement label...
              </p>
              <p className="text-gray-500 text-sm mt-2">
                This may take a minute or two
              </p>
            </div>
          )}

          {/* Result Step */}
          {step === "result" && analysisResult && (
            <div className="space-y-4">
              {/* Supplement Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Supplement Information
                </h3>
                <div className="space-y-2 text-sm">
                  {analysisResult.supplement_name && (
                    <p>
                      <span className="font-medium text-gray-700">Name:</span>{" "}
                      {analysisResult.supplement_name}
                    </p>
                  )}
                  {analysisResult.supplement_brand && (
                    <p>
                      <span className="font-medium text-gray-700">Brand:</span>{" "}
                      {analysisResult.supplement_brand}
                    </p>
                  )}
                  {analysisResult.supplement_ingredient && (
                    <p>
                      <span className="font-medium text-gray-700">
                        Ingredients:
                      </span>{" "}
                      {Array.isArray(analysisResult.supplement_ingredient)
                        ? analysisResult.supplement_ingredient.join(", ")
                        : analysisResult.supplement_ingredient}
                    </p>
                  )}
                </div>
              </div>

              {/* Nutritional Info */}
              {analysisResult.nutritional_info_per_serving && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Per Serving
                  </h3>
                  <div className="space-y-1 text-sm">
                    {Object.entries(
                      analysisResult.nutritional_info_per_serving,
                    ).map(([key, value]) => (
                      <p key={key}>
                        <span className="font-medium text-gray-700 capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>{" "}
                        {value}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.nutritional_info_per_100g && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Per 100g</h3>
                  <div className="space-y-1 text-sm">
                    {Object.entries(
                      analysisResult.nutritional_info_per_100g,
                    ).map(([key, value]) => (
                      <p key={key}>
                        <span className="font-medium text-gray-700 capitalize">
                          {key.replace(/_/g, " ")}:
                        </span>{" "}
                        {value}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-4">
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Analyze Another Image
                </button>
                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
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
