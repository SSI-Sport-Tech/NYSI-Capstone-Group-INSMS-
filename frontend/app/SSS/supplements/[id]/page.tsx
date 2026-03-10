"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import SupplementInfo from "@/components/SSS/SupplementInfo";
import NutritionalInfo from "@/components/SSS/NutritionalInfo";
import InventoryBatches from "@/components/SSS/InventoryBatches";
import { ArrowLeft, Edit, Search } from "lucide-react";
import EditSupplementModal from "@/components/SSS/EditSupplementModal";
import SupplementTabBar from "@/components/SSS/SupplementTabBar";
import { upsertTab } from "@/utils/supplementTabs";

interface Supplement {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form: string;
  supplement_packaging_form_id?: string;
  supplement_status: string;
  supplement_status_id?: string;
  batch_testing_org: string | null;
  product_source_url: string | null;
  description?: string;
  serving_size?: string;
  ingredients?: string;
  supplement_ingredient_raw?: string[];
  notes?: string;
  warning_label?: string;
  certifications?: string;
  nutritional_info_per_100g?: Record<string, number>;
  nutritional_info_per_serving?: Record<string, number>;
}

interface Batch {
  id: number;
  batch_number: string;
  supplement_id: string;
  supplement_name: string;
  supplement_brand: string;
  batch_status: string;
  batch_initial_quantity: number;
  booked: number;
  available: number;
  batch_expiration_date: string;
  batch_price: number;
  date_added: string;
  inv_batch_testing_org: string | null;
  batch_unit?: string | null;
}

export default function SupplementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [supplement, setSupplement] = useState<Supplement | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadSupplementDetails();
    }
  }, [params.id]);

  const loadSupplementDetails = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await axios.get(
        `${apiUrl}/api/SSS/supplements/${params.id}`,
      );

      const data = response.data;
      const supplementData = data.supplement;
      const batchesData = data.batches?.data || [];

      if (!supplementData) {
        setError("Supplement not found");
        return;
      }

      const mapped: Supplement = {
        id: supplementData.id,
        supplement_name: supplementData.supplement_name,
        supplement_brand: supplementData.supplement_brand,
        supplement_packaging_form: supplementData.supplement_packaging_form || "",
        supplement_packaging_form_id: supplementData.supplement_packaging_form_id || undefined,
        supplement_status: supplementData.supplement_status || "",
        supplement_status_id: supplementData.supplement_status_id || undefined,
        batch_testing_org: supplementData.batch_testing_org || null,
        product_source_url: supplementData.product_source_url || null,
        description: supplementData.supplement_description || undefined,
        serving_size: supplementData.nutritional_info_per_serving_definition || undefined,
        ingredients: Array.isArray(supplementData.supplement_ingredient)
          ? supplementData.supplement_ingredient.join(", ")
          : supplementData.supplement_ingredient || undefined,
        supplement_ingredient_raw: Array.isArray(supplementData.supplement_ingredient)
          ? supplementData.supplement_ingredient
          : undefined,
        notes: supplementData.supplement_additional_information || undefined,
        warning_label: supplementData.supplement_warning_label || undefined,
        certifications: supplementData.supplement_certifications || undefined,
        nutritional_info_per_100g: supplementData.nutritional_info_per_100g as Record<string, number> | undefined || undefined,
        nutritional_info_per_serving: supplementData.nutritional_info_per_serving as Record<string, number> | undefined || undefined,
      };

      setSupplement(mapped);
      setBatches(batchesData);

      // Register in tab list
      upsertTab({
        id: supplementData.id,
        name: supplementData.supplement_name,
        brand: supplementData.supplement_brand,
      });
    } catch (err) {
      setError("Failed to load supplement details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <SupplementTabBar activeId={String(params.id)} />
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading supplement details...</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !supplement) {
    return (
      <DashboardLayout>
        <SupplementTabBar activeId={String(params.id)} />
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">{error || "Supplement not found"}</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SupplementTabBar activeId={supplement.id} />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/SSS/library")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>

          {/* Supplement Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {supplement.supplement_name}
            </h1>
            <p className="text-lg text-gray-600 mt-1">{supplement.supplement_brand}</p>
          </div>

          {/* Action Buttons */}
          <div className="mb-8 flex items-center gap-3">
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => router.push(`/SSS/supplements/${params.id}/alternatives`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Search className="w-4 h-4" />
              Check for Alternatives
            </button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SupplementInfo supplement={supplement} />
            <NutritionalInfo
              nutritionalInfoPer100g={supplement.nutritional_info_per_100g}
              nutritionalInfoPerServing={supplement.nutritional_info_per_serving}
              servingDefinition={supplement.serving_size}
            />
          </div>

          {/* Inventory Batches */}
          <InventoryBatches
            batches={batches}
            supplementId={supplement.id}
            supplementName={supplement.supplement_name}
            supplementBrand={supplement.supplement_brand}
            onRefresh={loadSupplementDetails}
          />
        </div>
      </div>

      <EditSupplementModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={loadSupplementDetails}
        supplement={supplement}
      />
    </DashboardLayout>
  );
}
