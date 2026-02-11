"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import DashboardLayout from "@/components/DashboardLayout";
import SupplementInfo from "@/components/SupplementInfo";
import NutritionalInfo from "@/components/NutritionalInfo";
import InventoryBatches from "@/components/InventoryBatches";
import { ArrowLeft, Edit, Search } from "lucide-react";

interface Supplement {
  id: string;
  supplement_name: string;
  supplement_brand: string;
  supplement_packaging_form: string;
  supplement_status: string;
  batch_testing_org: string | null;
  product_source_url: string | null;
  description?: string;
  serving_size?: string;
  ingredients?: string;
  notes?: string;
  warning_label?: string;
  certifications?: string;
  nutritional_info_per_100g?: {
    energy_kcal?: number;
    protein_g?: number;
    fat_g?: number;
    carbohydrate_g?: number;
    saturated_fat?: number;
    trans_fat?: number;
    cholesterol?: number;
    total_sugars?: number;
    dietary_fibre?: number;
    sodium?: number;
  };
  nutritional_info_per_serving?: {
    [key: string]: number; // Dynamic key-value pairs like vitamin_d_iu, vitamin_d_mcg
  };
}

interface Batch {
  id: number;
  batch_number: string;
  supplement_name: string;
  supplement_brand: string;
  batch_status: string;
  batch_initial_quantity: number;
  booked: number;
  available: number;
  batch_expiration_date: string;
  batch_price: number;
}

export default function SupplementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [supplement, setSupplement] = useState<Supplement | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      // Map backend data to frontend interface
      setSupplement({
        id: supplementData.id,
        supplement_name: supplementData.supplement_name,
        supplement_brand: supplementData.supplement_brand,
        supplement_packaging_form:
          supplementData.supplement_packaging_form || "",
        supplement_status: supplementData.supplement_status || "",
        batch_testing_org: supplementData.batch_testing_org || null,
        product_source_url: supplementData.product_source_url || null,
        description: supplementData.supplement_description || undefined,
        serving_size:
          supplementData.nutritional_info_per_serving_definition || undefined,
        ingredients: Array.isArray(supplementData.supplement_ingredient)
          ? supplementData.supplement_ingredient.join(", ")
          : supplementData.supplement_ingredient || undefined,
        notes: supplementData.supplement_additional_information || undefined,
        warning_label: supplementData.supplement_warning_label || undefined,
        certifications: supplementData.supplement_certifications || undefined,
        nutritional_info_per_100g:
          supplementData.nutritional_info_per_100g || undefined,
        nutritional_info_per_serving:
          supplementData.nutritional_info_per_serving || undefined,
      });

      setBatches(batchesData);
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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-[1600px] mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">
                {error || "Supplement not found"}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Header with Back Button and User Profile */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Supplements
              </button>
            </div>

            {/* TO DO: User Profile - Top Right */}
          </div>

          {/* Supplement Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {supplement.supplement_name}
            </h1>
            <p className="text-lg text-gray-600 mt-1">
              {supplement.supplement_brand}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mb-8 flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() =>
                router.push(`/supplements/${params.id}/alternatives`)
              }
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
              nutritionalInfoPerServing={
                supplement.nutritional_info_per_serving
              }
              servingDefinition={supplement.serving_size}
            />
          </div>

          {/* Inventory Batches */}
          <InventoryBatches
            batches={batches}
            supplementName={supplement.supplement_name}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
