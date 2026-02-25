import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Loader2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

interface LookupOption {
  id: string;
  label: string;
}

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
  title?: string;
  supplementOnly?: boolean;
  preselectedSupplement?: { id: string; name: string; brand: string };
}

interface NutritionalRow {
  nutrient: string;
  amount: string;
}

interface FormData {
  // Supplement Information
  supplementId: string | null;
  name: string;
  brand: string;
  packagingFormId: string;
  statusId: string;
  ingredients: string;
  description: string;
  warningLabel: string;
  certifications: string;
  additionalNotes: string;
  testingOrganisation: string;
  productSourceUrl: string;

  // Nutritional Information
  servingDefinition: string;
  nutritionalPerServing: NutritionalRow[];
  nutritionalPer100g: NutritionalRow[];

  // Batch Information
  batchNumber: string;
  quantity: number;
  price: number;
  expirationDate: string;
}

const AddSupplementModal: React.FC<AddSupplementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Add Supplement to Inventory",
  supplementOnly = false,
  preselectedSupplement,
}) => {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Supplement[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isNewSupplement, setIsNewSupplement] = useState(false);
  const [includeBatch, setIncludeBatch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [packagingOptions, setPackagingOptions] = useState<LookupOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<LookupOption[]>([]);

  const emptyForm: FormData = {
    supplementId: null,
    name: "",
    brand: "",
    packagingFormId: "",
    statusId: "",
    ingredients: "",
    description: "",
    warningLabel: "",
    certifications: "",
    additionalNotes: "",
    testingOrganisation: "",
    productSourceUrl: "",
    servingDefinition: "",
    nutritionalPerServing: [{ nutrient: "", amount: "" }],
    nutritionalPer100g: [{ nutrient: "", amount: "" }],
    batchNumber: "",
    quantity: 100,
    price: 0,
    expirationDate: "",
  };

  const [formData, setFormData] = useState<FormData>(emptyForm);

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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(emptyForm);
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);
      setIsNewSupplement(supplementOnly);
      setIncludeBatch(true);
    } else if (isOpen && preselectedSupplement) {
      setFormData((prev) => ({
        ...prev,
        supplementId: preselectedSupplement.id,
        name: preselectedSupplement.name,
        brand: preselectedSupplement.brand ?? "",
      }));
      setSearchQuery(`${preselectedSupplement.brand} ${preselectedSupplement.name}`);
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
      name: supplement.supplement_name || "",
      brand: supplement.supplement_brand || "",
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
      // Convert nutritional rows to a plain object, or null if all rows are empty
      const rowsToObj = (rows: NutritionalRow[]) => {
        const entries = rows
          .filter((r) => r.nutrient.trim())
          .map((r) => [r.nutrient.trim(), r.amount.trim()] as [string, string]);
        return entries.length > 0 ? Object.fromEntries(entries) : null;
      };

      if (isNewSupplement) {
        // First create the supplement, then create the batch
        const supplementData = {
          supplement_name: formData.name,
          supplement_brand: formData.brand || null,
          supplement_packaging_form_id: formData.packagingFormId,
          supplement_status_id: formData.statusId,
          supplement_ingredient: formData.ingredients
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          supplement_description: formData.description || null,
          supplement_warning_label: formData.warningLabel || null,
          supplement_certifications: formData.certifications || null,
          supplement_additional_information: formData.additionalNotes || null,
          batch_testing_org: formData.testingOrganisation || null,
          product_source_url: formData.productSourceUrl || null,
          nutritional_info_per_serving_definition: formData.servingDefinition || null,
          nutritional_info_per_serving: rowsToObj(formData.nutritionalPerServing),
          nutritional_info_per_100g: rowsToObj(formData.nutritionalPer100g),
        };

        const supplementResponse = await axios.post(
          "/api/SSS/supplements",
          supplementData,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!supplementOnly && includeBatch) {
          const batchData = {
            supplement_id: supplementResponse.data.id,
            batch_number: formData.batchNumber,
            batch_initial_quantity: formData.quantity,
            batch_price: formData.price || null,
            batch_expiration_date: formData.expirationDate || null,
          };
          await axios.post("/api/SSS/batches", batchData, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } else {
        // Add batch for existing supplement
        if (includeBatch) {
          const batchData = {
            supplement_id: formData.supplementId,
            batch_number: formData.batchNumber,
            batch_initial_quantity: formData.quantity,
            batch_price: formData.price || null,
            batch_expiration_date: formData.expirationDate || null,
          };
          await axios.post("/api/SSS/batches", batchData, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
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
              {title}
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

                {/* Quick Search — hidden in supplement-only mode */}
                {!supplementOnly && <div className="mb-4 search-container">
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
                </div>}

                {/* Autofilled message or new supplement option — hidden in supplement-only mode */}
                {!supplementOnly && (formData.supplementId ? (
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
                ))}

                {/* Supplement Details Form */}
                {(isNewSupplement || formData.supplementId) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        required
                        disabled={!isNewSupplement && formData.supplementId !== null}
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
                          setFormData((prev) => ({ ...prev, brand: e.target.value }))
                        }
                        disabled={!isNewSupplement && formData.supplementId !== null}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 text-gray-900 placeholder-gray-500"
                        placeholder="Brand Name"
                      />
                    </div>
                    {isNewSupplement && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Packaging Form <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.packagingFormId}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, packagingFormId: e.target.value }))
                            }
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                          >
                            <option value="">— Select packaging form —</option>
                            {packagingOptions.map((o) => (
                              <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Status <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.statusId}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, statusId: e.target.value }))
                            }
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                          >
                            <option value="">— Select status —</option>
                            {statusOptions.map((o) => (
                              <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Batch Testing Org
                          </label>
                          <input
                            type="text"
                            value={formData.testingOrganisation}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, testingOrganisation: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                            placeholder="e.g. Informed-Sport"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Ingredients <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.ingredients}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, ingredients: e.target.value }))
                            }
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                            placeholder="Vitamin D3, Calcium, Zinc (comma-separated)"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={formData.description}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, description: e.target.value }))
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                            placeholder="Supplement description"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm text-gray-700 mb-1">
                            Additional Information
                          </label>
                          <textarea
                            value={formData.additionalNotes}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                            placeholder="Allergen information or any other notes"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm text-gray-700 mb-1">
                            Warning Label
                          </label>
                          <textarea
                            value={formData.warningLabel}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, warningLabel: e.target.value }))
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                            placeholder="e.g. Keep out of reach of children."
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Certifications
                          </label>
                          <input
                            type="text"
                            value={formData.certifications}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, certifications: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                            placeholder="e.g. NSF Certified, Informed-Sport"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Product Source URL
                          </label>
                          <input
                            type="url"
                            value={formData.productSourceUrl}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, productSourceUrl: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                            placeholder="https://example.com/product"
                          />
                        </div>
                        {/* Nutritional Information */}
                        <div className="col-span-2 pt-2 border-t border-gray-100">
                          <p className="text-sm font-medium text-gray-700 mb-3">Nutritional Information</p>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm text-gray-700 mb-1">
                            Serving Size Definition
                          </label>
                          <input
                            type="text"
                            value={formData.servingDefinition}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, servingDefinition: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                            placeholder='e.g. "1 capsule (500mg)"'
                          />
                        </div>
                        {/* Nutritional Info per Serving table */}
                        <div className="col-span-2">
                          <label className="block text-sm text-gray-700 mb-2">
                            Nutritional Info per Serving
                          </label>
                          <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">Nutrient</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">Amount</th>
                                <th className="w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {formData.nutritionalPerServing.map((row, i) => (
                                <tr key={i}>
                                  <td className="px-2 py-1">
                                    <input
                                      type="text"
                                      value={row.nutrient}
                                      onChange={(e) =>
                                        setFormData((prev) => {
                                          const rows = [...prev.nutritionalPerServing];
                                          rows[i] = { ...rows[i], nutrient: e.target.value };
                                          return { ...prev, nutritionalPerServing: rows };
                                        })
                                      }
                                      placeholder="e.g. Protein"
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      type="text"
                                      value={row.amount}
                                      onChange={(e) =>
                                        setFormData((prev) => {
                                          const rows = [...prev.nutritionalPerServing];
                                          rows[i] = { ...rows[i], amount: e.target.value };
                                          return { ...prev, nutritionalPerServing: rows };
                                        })
                                      }
                                      placeholder="e.g. 10g"
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                                    />
                                  </td>
                                  <td className="px-1 py-1 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          nutritionalPerServing: prev.nutritionalPerServing.filter((_, idx) => idx !== i),
                                        }))
                                      }
                                      disabled={formData.nutritionalPerServing.length === 1}
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
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                nutritionalPerServing: [...prev.nutritionalPerServing, { nutrient: "", amount: "" }],
                              }))
                            }
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            + Add Row
                          </button>
                        </div>

                        {/* Nutritional Info per 100g table */}
                        <div className="col-span-2">
                          <label className="block text-sm text-gray-700 mb-2">
                            Nutritional Info per 100g
                          </label>
                          <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">Nutrient</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">Amount</th>
                                <th className="w-8"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {formData.nutritionalPer100g.map((row, i) => (
                                <tr key={i}>
                                  <td className="px-2 py-1">
                                    <input
                                      type="text"
                                      value={row.nutrient}
                                      onChange={(e) =>
                                        setFormData((prev) => {
                                          const rows = [...prev.nutritionalPer100g];
                                          rows[i] = { ...rows[i], nutrient: e.target.value };
                                          return { ...prev, nutritionalPer100g: rows };
                                        })
                                      }
                                      placeholder="e.g. Protein"
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      type="text"
                                      value={row.amount}
                                      onChange={(e) =>
                                        setFormData((prev) => {
                                          const rows = [...prev.nutritionalPer100g];
                                          rows[i] = { ...rows[i], amount: e.target.value };
                                          return { ...prev, nutritionalPer100g: rows };
                                        })
                                      }
                                      placeholder="e.g. 20g"
                                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                                    />
                                  </td>
                                  <td className="px-1 py-1 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFormData((prev) => ({
                                          ...prev,
                                          nutritionalPer100g: prev.nutritionalPer100g.filter((_, idx) => idx !== i),
                                        }))
                                      }
                                      disabled={formData.nutritionalPer100g.length === 1}
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
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                nutritionalPer100g: [...prev.nutritionalPer100g, { nutrient: "", amount: "" }],
                              }))
                            }
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            + Add Row
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Batch Information Section — hidden in supplement-only mode */}
              {!supplementOnly && (isNewSupplement || formData.supplementId) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Batch Information
                  </h3>

                  <div className="mb-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeBatch}
                        onChange={(e) => setIncludeBatch(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        Input Batch Information
                      </span>
                    </label>
                    {!includeBatch && (
                      <p className="text-xs text-gray-500 mt-1">
                        No batch will be created. You can add a batch later from the supplement details page.
                      </p>
                    )}
                  </div>

                  {includeBatch && <div className="grid grid-cols-2 gap-4">
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
                        Date Added
                      </label>
                      <input
                        type="text"
                        value={new Date().toLocaleDateString("en-US")}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-400 mt-1">Auto-set to today on save</p>
                    </div>
                  </div>}
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
              disabled={loading || (!supplementOnly && !isNewSupplement && !formData.supplementId)}
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
