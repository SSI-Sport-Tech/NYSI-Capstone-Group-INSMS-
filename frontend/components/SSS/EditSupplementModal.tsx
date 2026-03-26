"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

interface LookupOption {
  id: string;
  label: string;
}

interface NutritionalRow {
  nutrient: string;
  amount: string;
}

interface SupplementToEdit {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form_id?: string;
  supplement_status_id?: string;
  batch_testing_org: string | null;
  batch_testing_org_id?: string | null;
  product_source_url: string | null;
  description?: string;
  serving_size?: string;
  supplement_ingredient_raw?: string[];
  warning_label?: string;
  certifications?: string;
  notes?: string;
  nutritional_info_per_100g?: Record<string, unknown>;
  nutritional_info_per_serving?: Record<string, unknown>;
}

interface EditSupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplement: SupplementToEdit;
}

interface FormData {
  name: string;
  brand: string;
  packagingFormId: string;
  statusId: string;
  ingredients: string[];
  description: string;
  warningLabel: string;
  certifications: string;
  additionalNotes: string;
  testingOrganisationId: string;
  productSourceUrl: string;
  servingDefinition: string;
  nutritionalPerServing: NutritionalRow[];
  nutritionalPer100g: NutritionalRow[];
}

const objToRows = (obj?: Record<string, unknown>): NutritionalRow[] => {
  if (!obj || Object.keys(obj).length === 0)
    return [{ nutrient: "", amount: "" }];
  return Object.entries(obj).map(([k, v]) => ({
    nutrient: k,
    amount: String(v),
  }));
};

const rowsToObj = (rows: NutritionalRow[]): Record<string, string> | null => {
  const entries = rows
    .filter((r) => r.nutrient.trim())
    .map((r) => [r.nutrient.trim(), r.amount.trim()] as [string, string]);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

const EditSupplementModal: React.FC<EditSupplementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplement,
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [packagingOptions, setPackagingOptions] = useState<LookupOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<LookupOption[]>([]);
  const [batchTestingOrgOptions, setBatchTestingOrgOptions] = useState<LookupOption[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    brand: "",
    packagingFormId: "",
    statusId: "",
    ingredients: [""],
    description: "",
    warningLabel: "",
    certifications: "",
    additionalNotes: "",
    testingOrganisationId: "",
    productSourceUrl: "",
    servingDefinition: "",
    nutritionalPerServing: [{ nutrient: "", amount: "" }],
    nutritionalPer100g: [{ nutrient: "", amount: "" }],
  });

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
    axios.get("/api/SSS/lookups/batch-testing-orgs").then((res) => {
      setBatchTestingOrgOptions(
        (res.data.data ?? []).map((r: { id: string; label: string }) => ({
          id: r.id,
          label: r.label,
        })),
      );
    });
  }, []);

  // Pre-fill form when modal opens with supplement data
  useEffect(() => {
    if (isOpen && supplement) {
      setFormData({
        name: supplement.supplement_name ?? "",
        brand: supplement.supplement_brand ?? "",
        packagingFormId: supplement.supplement_packaging_form_id ?? "",
        statusId: supplement.supplement_status_id ?? "",
        ingredients:
          supplement.supplement_ingredient_raw &&
          supplement.supplement_ingredient_raw.length > 0
            ? supplement.supplement_ingredient_raw
            : [""],
        description: supplement.description ?? "",
        warningLabel: supplement.warning_label ?? "",
        certifications: supplement.certifications ?? "",
        additionalNotes: supplement.notes ?? "",
        testingOrganisationId: supplement.batch_testing_org_id ?? "",
        productSourceUrl: supplement.product_source_url ?? "",
        servingDefinition: supplement.serving_size ?? "",
        nutritionalPerServing: objToRows(supplement.nutritional_info_per_serving),
        nutritionalPer100g: objToRows(supplement.nutritional_info_per_100g),
      });
    }
  }, [isOpen, supplement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        supplement_name: formData.name,
        supplement_brand: formData.brand || null,
        supplement_packaging_form_id: formData.packagingFormId || undefined,
        supplement_status_id: formData.statusId || undefined,
        supplement_ingredient: formData.ingredients.filter((s) => s.trim()),
        supplement_description: formData.description || null,
        supplement_warning_label: formData.warningLabel || null,
        supplement_certifications: formData.certifications || null,
        supplement_additional_information: formData.additionalNotes || null,
        batch_testing_org_id: formData.testingOrganisationId || null,
        product_source_url: formData.productSourceUrl || null,
        nutritional_info_per_serving_definition:
          formData.servingDefinition || null,
        nutritional_info_per_serving: rowsToObj(formData.nutritionalPerServing),
        nutritional_info_per_100g: rowsToObj(formData.nutritionalPer100g),
      };

      await axios.patch(
        `/api/SSS/supplements/${supplement.id}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating supplement:", error);
      alert("Failed to update supplement. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Supplement
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
              {/* Supplement Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Supplement Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Supplement Name"
                    />
                  </div>

                  {/* Brand */}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Brand Name"
                    />
                  </div>

                  {/* Packaging Form */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Packaging Form <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.packagingFormId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          packagingFormId: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="">— Select packaging form —</option>
                      {packagingOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.statusId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          statusId: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="">— Select status —</option>
                      {statusOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Testing Org */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Batch Testing Org
                    </label>
                    <select
                      value={formData.testingOrganisationId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          testingOrganisationId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="">— Select testing organisation —</option>
                      {batchTestingOrgOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {!formData.testingOrganisationId && supplement.batch_testing_org && supplement.batch_testing_org !== "NIL" && (
                      <p className="text-xs text-amber-600 mt-1">
                        Current value (unlinked): &quot;{supplement.batch_testing_org}&quot;. Select an option above to link it.
                      </p>
                    )}
                  </div>

                  {/* Product Source URL */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Product Source URL
                    </label>
                    <input
                      type="url"
                      value={formData.productSourceUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          productSourceUrl: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="https://example.com/product"
                    />
                  </div>

                  {/* Ingredients */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">
                      Ingredients <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-1">
                      {formData.ingredients.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) =>
                              setFormData((prev) => {
                                const rows = [...prev.ingredients];
                                rows[i] = e.target.value;
                                return { ...prev, ingredients: rows };
                              })
                            }
                            placeholder="e.g. Vitamin D3"
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                ingredients: prev.ingredients.filter(
                                  (_, idx) => idx !== i,
                                ),
                              }))
                            }
                            disabled={formData.ingredients.length === 1}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          ingredients: [...prev.ingredients, ""],
                        }))
                      }
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Row
                    </button>
                  </div>

                  {/* Description */}
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
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Supplement description"
                    />
                  </div>

                  {/* Additional Information */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">
                      Additional Information
                    </label>
                    <textarea
                      value={formData.additionalNotes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          additionalNotes: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Allergen information or any other notes"
                    />
                  </div>

                  {/* Warning Label */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">
                      Warning Label
                    </label>
                    <textarea
                      value={formData.warningLabel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          warningLabel: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="e.g. Keep out of reach of children."
                    />
                  </div>

                  {/* Certifications */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">
                      Certifications
                    </label>
                    <input
                      type="text"
                      value={formData.certifications}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          certifications: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="e.g. NSF Certified, Informed-Sport"
                    />
                  </div>
                </div>
              </div>

              {/* Nutritional Information */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Nutritional Information
                </h3>

                <div className="space-y-5">
                  {/* Serving Definition */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Serving Size Definition
                    </label>
                    <input
                      type="text"
                      value={formData.servingDefinition}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          servingDefinition: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder='e.g. "1 capsule (500mg)"'
                    />
                  </div>

                  {/* Nutritional Info per Serving */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Nutritional Info per Serving
                    </label>
                    <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">
                            Nutrient
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">
                            Amount
                          </th>
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
                                    rows[i] = {
                                      ...rows[i],
                                      nutrient: e.target.value,
                                    };
                                    return {
                                      ...prev,
                                      nutritionalPerServing: rows,
                                    };
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
                                    rows[i] = {
                                      ...rows[i],
                                      amount: e.target.value,
                                    };
                                    return {
                                      ...prev,
                                      nutritionalPerServing: rows,
                                    };
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
                                    nutritionalPerServing:
                                      prev.nutritionalPerServing.filter(
                                        (_, idx) => idx !== i,
                                      ),
                                  }))
                                }
                                disabled={
                                  formData.nutritionalPerServing.length === 1
                                }
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
                          nutritionalPerServing: [
                            ...prev.nutritionalPerServing,
                            { nutrient: "", amount: "" },
                          ],
                        }))
                      }
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Row
                    </button>
                  </div>

                  {/* Nutritional Info per 100g */}
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Nutritional Info per 100g
                    </label>
                    <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">
                            Nutrient
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-1/2">
                            Amount
                          </th>
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
                                    rows[i] = {
                                      ...rows[i],
                                      nutrient: e.target.value,
                                    };
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
                                    rows[i] = {
                                      ...rows[i],
                                      amount: e.target.value,
                                    };
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
                                    nutritionalPer100g:
                                      prev.nutritionalPer100g.filter(
                                        (_, idx) => idx !== i,
                                      ),
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
                          nutritionalPer100g: [
                            ...prev.nutritionalPer100g,
                            { nutrient: "", amount: "" },
                          ],
                        }))
                      }
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Row
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-supplement-form"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSupplementModal;
