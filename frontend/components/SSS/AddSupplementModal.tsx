import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import axios from "axios";

interface Supplement {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form: string;
  supplement_status: string;
  batch_testing_org: string | null;
  product_source_url: string[] | string | null;
  description?: string;
  serving_size?: string;
  ingredients?: string;
  notes?: string;
}

interface AddSupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  // Supplement Information
  supplementId: string | null;
  name: string;
  brand: string;
  type: string;
  servingSize: string;
  description: string;
  additionalNotes: string;

  // Batch Information
  batchNumber: string;
  quantity: number;
  price: number;
  expirationDate: string;
  testingOrganisation: string;
  classification: string;
}

const AddSupplementModal: React.FC<AddSupplementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Supplement[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isNewSupplement, setIsNewSupplement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    supplementId: null,
    name: "",
    brand: "",
    type: "",
    servingSize: "",
    description: "",
    additionalNotes: "",
    batchNumber: "",
    quantity: 100,
    price: 0,
    expirationDate: "",
    testingOrganisation: "",
    classification: "",
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        supplementId: null,
        name: "",
        brand: "",
        type: "",
        servingSize: "",
        description: "",
        additionalNotes: "",
        batchNumber: "",
        quantity: 100,
        price: 0,
        expirationDate: "",
        testingOrganisation: "",
        classification: "",
      });
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);
      setIsNewSupplement(false);
    }
  }, [isOpen]);

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => performSearch(query), 300);
      };
    })(),
    [],
  );

  // Actual search function
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    try {
      // Use the same endpoint as the supplement library
      const response = await axios.get(`/api/SSS/supplements`, {
        params: { search: query, limit: 10 }, // Limit results for dropdown
      });
      setSearchResults(response.data.data || []);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setSearchLoading(true);
      setShowResults(true); // Show dropdown immediately
      debouncedSearch(value);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setSearchLoading(false);
    }
  };

  // Handle supplement selection
  const handleSupplementSelect = (supplement: Supplement) => {
    setFormData((prev) => ({
      ...prev,
      supplementId: supplement.id,
      name: supplement.supplement_name,
      brand: supplement.supplement_brand,
      type: supplement.supplement_packaging_form,
      servingSize: supplement.serving_size || "",
      description: supplement.description || "",
      additionalNotes: supplement.notes || "",
    }));
    setSearchQuery(
      `${supplement.supplement_brand} ${supplement.supplement_name}`,
    );
    setShowResults(false);
    setIsNewSupplement(false);
  };

  // Handle new supplement registration
  const handleNewSupplement = () => {
    setIsNewSupplement(true);
    setShowResults(false);
    setFormData((prev) => ({
      ...prev,
      supplementId: null,
      name: searchQuery.trim() || "",
      brand: "",
      type: "",
      servingSize: "",
      description: "",
      additionalNotes: "",
    }));
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".search-container")) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isNewSupplement) {
        // First create the supplement, then create the batch
        const supplementData = {
          supplement_name: formData.name,
          supplement_brand: formData.brand,
          supplement_packaging_form: formData.type,
          serving_size: formData.servingSize || null,
          description: formData.description || null,
          notes: formData.additionalNotes || null,
          // Set default required fields for new supplements
          supplement_status: "Active",
          batch_testing_org: formData.testingOrganisation || null,
          product_source_url: null,
        };

        const supplementResponse = await axios.post(
          "/api/SSS/supplements",
          supplementData,
        );
        const newSupplementId = supplementResponse.data.id;

        // Create batch for the new supplement
        const batchData = {
          supplement_id: newSupplementId,
          batch_number: formData.batchNumber,
          batch_initial_quantity: formData.quantity,
          batch_price: formData.price || null,
          batch_expiration_date: formData.expirationDate || null,
        };

        await axios.post("/api/SSS/batches", batchData);
      } else {
        // Just create batch for existing supplement
        const batchData = {
          supplement_id: formData.supplementId,
          batch_number: formData.batchNumber,
          batch_initial_quantity: formData.quantity,
          batch_price: formData.price || null,
          batch_expiration_date: formData.expirationDate || null,
        };

        await axios.post("/api/SSS/batches", batchData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding supplement:", error);
      alert("Failed to add supplement. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">
              Add Supplement to Inventory
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: "calc(85vh - 140px)" }}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Supplement Information Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Supplement Information
                </h3>

                {/* Quick Search */}
                <div className="mb-4 search-container">
                  <label className="block text-sm text-gray-600 mb-2">
                    Quick Search (Name, Brand, Type)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Supplement Name - Brand Name (Supplement Type)"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                    <div className="absolute right-3 top-3">
                      {searchLoading ? (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    {/* Search Results */}
                    {showResults && (
                      <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                        {searchLoading ? (
                          <div className="px-3 py-4 text-center">
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-gray-600">
                              Searching supplements...
                            </p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          <>
                            {searchResults.map((supplement) => (
                              <button
                                key={supplement.id}
                                type="button"
                                onClick={() =>
                                  handleSupplementSelect(supplement)
                                }
                                className="w-full text-left px-3 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {supplement.supplement_name}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {supplement.supplement_brand} •{" "}
                                      {supplement.supplement_packaging_form}
                                    </div>
                                  </div>
                                  <div className="ml-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        supplement.supplement_status ===
                                          "Active" ||
                                        supplement.supplement_status ===
                                          "Available"
                                          ? "bg-green-100 text-green-800"
                                          : supplement.supplement_status ===
                                              "Pending"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {supplement.supplement_status}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            ))}
                            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={handleNewSupplement}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                + Register new supplement instead
                              </button>
                            </div>
                          </>
                        ) : (
                          searchQuery.trim() && (
                            <div className="px-3 py-4 text-center">
                              <p className="text-sm text-gray-600 mb-2">
                                No supplements found for &quot;{searchQuery}&quot;
                              </p>
                              <button
                                type="button"
                                onClick={handleNewSupplement}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                + Register &quot;{searchQuery}&quot; as new supplement
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Autofilled message or new supplement option */}
                {formData.supplementId ? (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      ✓ Supplement details autofilled from existing record
                    </p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isNewSupplement}
                        onChange={(e) => setIsNewSupplement(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Register a new supplement
                      </span>
                    </label>
                    {isNewSupplement && (
                      <p className="text-xs text-gray-500 mt-1">
                        If supplement is not pre-existing, manually add details
                        to register supplement.
                      </p>
                    )}
                  </div>
                )}

                {/* Supplement Details Form */}
                {(isNewSupplement || formData.supplementId) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        required
                        disabled={
                          !isNewSupplement && formData.supplementId !== null
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 text-gray-900 placeholder-gray-500"
                        placeholder="Supplement Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            brand: e.target.value,
                          }))
                        }
                        required
                        disabled={
                          !isNewSupplement && formData.supplementId !== null
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 text-gray-900 placeholder-gray-500"
                        placeholder="Brand Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Type
                      </label>
                      <input
                        type="text"
                        value={formData.type}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            type: e.target.value,
                          }))
                        }
                        required
                        disabled={
                          !isNewSupplement && formData.supplementId !== null
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 text-gray-900 placeholder-gray-500"
                        placeholder="Supplement Type"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Serving Size
                      </label>
                      <input
                        type="text"
                        value={formData.servingSize}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            servingSize: e.target.value,
                          }))
                        }
                        disabled={
                          !isNewSupplement && formData.supplementId !== null
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 text-gray-900 placeholder-gray-500"
                        placeholder="100g"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        disabled={
                          !isNewSupplement && formData.supplementId !== null
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 text-gray-900 placeholder-gray-500"
                        placeholder="Supplement description here"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-700 mb-1">
                        Additional Notes
                      </label>
                      <textarea
                        value={formData.additionalNotes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            additionalNotes: e.target.value,
                          }))
                        }
                        disabled={
                          !isNewSupplement && formData.supplementId !== null
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 text-gray-900 placeholder-gray-500"
                        placeholder="Allergen information or any other additional information"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Batch Information Section */}
              {(isNewSupplement || formData.supplementId) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Batch Information
                  </h3>

                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked
                        readOnly
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Input Batch Information
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Default save with N.A. values. You can add batch details
                      later from the supplement details page.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Batch Number
                      </label>
                      <input
                        type="text"
                        value={formData.batchNumber}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            batchNumber: e.target.value,
                          }))
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        placeholder="Number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            quantity: Number(e.target.value),
                          }))
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            price: Number(e.target.value),
                          }))
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        placeholder="$123.45"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Expiration Date
                      </label>
                      <input
                        type="date"
                        value={formData.expirationDate}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            expirationDate: e.target.value,
                          }))
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Date"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Testing Organisation
                      </label>
                      <input
                        type="text"
                        value={formData.testingOrganisation}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            testingOrganisation: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        placeholder="Informed-Sport"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Classification
                      </label>
                      <input
                        type="text"
                        value={formData.classification}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            classification: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        placeholder="NSF Certified (Safe for Sport)"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || (!isNewSupplement && !formData.supplementId)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Supplement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSupplementModal;
