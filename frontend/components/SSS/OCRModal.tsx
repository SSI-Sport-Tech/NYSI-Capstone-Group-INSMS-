"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { X, Upload, Loader } from "lucide-react";

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
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

interface OCRAnalysisResult {
  similar_supplements: {
    data: SimilarSupplement[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
}

const OCRModal: React.FC<OCRModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
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

  const handleSearch = async () => {
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

      if (response.data?.success) {
        const result: OCRAnalysisResult = {
          similar_supplements: response.data.similar_supplements || {
            data: [],
            pagination: { page: 1, per_page: 10, total: 0, total_pages: 0 },
          },
        };
        setAnalysisResult(result);
        setStep("result");
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
            {step === "upload" && "Upload Nutritional Label"}
            {step === "processing" && "Analysing Label..."}
            {step === "result" && "Similar Supplements Found"}
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
                    onClick={handleSearch}
                    className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Search
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
                Searching supplement database...
              </p>
              <p className="text-gray-500 text-sm mt-2">
                This may take a minute or two
              </p>
            </div>
          )}

          {/* Result Step */}
          {step === "result" && analysisResult && (
            <div className="space-y-4">
              {analysisResult.similar_supplements.data.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    Found{" "}
                    <span className="font-semibold text-gray-900">
                      {analysisResult.similar_supplements.pagination.total}
                    </span>{" "}
                    supplement
                    {analysisResult.similar_supplements.pagination.total !== 1
                      ? "s"
                      : ""}{" "}
                    with a similar nutritional profile. Click a row to view
                    details.
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {analysisResult.similar_supplements.data.map((s) => (
                      <div
                        key={s.supplement_id}
                        onClick={() => {
                          handleClose();
                          router.push(`/SSS/supplements/${s.supplement_id}`);
                        }}
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {s.supplement_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.supplement_brand}
                          </p>
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
                    ))}
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

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Scan Another
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
