"use client";

import { useState } from "react";
import axios from "axios";
import DashboardLayout from "@/components/SSS/DashboardLayout";

interface OCRResponse {
  text: string[];
  error?: string;
}

const SAMPLE_IMAGES = [
  { value: "demo.jpg", label: "demo.jpg" },
  { value: "Gummy_Pill.jpg", label: "Gummy_Pill.jpg" },
  { value: "NutritionLabel.jpg", label: "NutritionLabel.jpg" },
];

export default function OCRPage() {
  const [selectedImage, setSelectedImage] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [ocrResult, setOcrResult] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useUpload, setUseUpload] = useState(false);

  const handleImageSelect = (filename: string) => {
    setSelectedImage(filename);
    setPreviewUrl(filename ? `/ocr_images/${filename}` : "");
    setOcrResult([]);
    setError("");
    setUploadedFile(null);
    setUseUpload(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedImage("");
      setOcrResult([]);
      setError("");
      setUseUpload(true);
    }
  };

  const handleRunOCR = async () => {
    if (!selectedImage && !uploadedFile) {
      setError("Please select or upload an image first!");
      return;
    }

    setLoading(true);
    setError("");
    setOcrResult([]);

    try {
      const formData = new FormData();

      if (uploadedFile) {
        // Use uploaded file
        formData.append("file", uploadedFile);
      } else {
        // Fetch sample image and convert to blob
        const response = await fetch(`/ocr_images/${selectedImage}`);
        const blob = await response.blob();
        formData.append("file", blob, selectedImage);
      }

      const ocrResponse = await axios.post<OCRResponse>(
        "/api/ocr/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 120000, // 2 minutes timeout for OCR processing
        },
      );

      if (ocrResponse.data.error) {
        setError(ocrResponse.data.error);
      } else {
        setOcrResult(ocrResponse.data.text);
      }
    } catch (err) {
      setError("OCR processing failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div>
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Supplement OCR
        </h1>

        {/* Image Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select or Upload Image
          </h2>

          {/* Sample Images Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose a sample image:
            </label>
            <select
              value={selectedImage}
              onChange={(e) => handleImageSelect(e.target.value)}
              className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={useUpload}
            >
              <option value="">--Select an image--</option>
              {SAMPLE_IMAGES.map((img) => (
                <option key={img.value} value={img.value}>
                  {img.label}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload your own image:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Preview
            </h2>
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-96 rounded-lg border border-gray-200"
              />
            </div>
          </div>
        )}

        {/* Run OCR Button */}
        <div className="mb-6">
          <button
            onClick={handleRunOCR}
            disabled={loading || (!selectedImage && !uploadedFile)}
            className="w-full px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Processing OCR..." : "Run OCR"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* OCR Results */}
        {ocrResult.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              OCR Results
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {ocrResult.join("\n")}
              </pre>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
