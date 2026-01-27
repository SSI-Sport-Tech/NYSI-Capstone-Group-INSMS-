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
  product_source_url: string[] | string | null;
  description?: string;
  serving_size?: string;
  ingredients?: string;
  notes?: string;
  nutritional_info?: {
    energy?: string;
    protein?: string;
    total_fat?: string;
    saturated_fat?: string;
    trans_fat?: string;
    cholesterol?: string;
    carbohydrates?: string;
    total_sugars?: string;
    dietary_fibre?: string;
    sodium?: string;
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
      loadBatches();
    }
  }, [params.id]);

  const loadSupplementDetails = async () => {
    try {
      setLoading(true);
      // This would be your actual API call
      // const response = await axios.get(`/api/SSS/supplements/${params.id}`);
      
      // Mock data for now - replace with actual API call
      const mockSupplement: Supplement = {
        id: params.id as string,
        supplement_name: "Whey Protein Isolate",
        supplement_brand: "Optimum Nutrition",
        supplement_packaging_form: "Powder - 900g container",
        supplement_status: "Active",
        batch_testing_org: "NSF Certified for Sport",
        product_source_url: ["bodybuilding.com"],
        description: "High-quality whey protein isolate for muscle recovery and growth and High-quality whey protein isolate for muscle recovery and growth",
        serving_size: "30g (1 scoop)",
        ingredients: "Whey Protein Isolate, Natural Flavors, Lecithin",
        notes: "N/A",
        nutritional_info: {
          energy: "718 kcal",
          protein: "90 g",
          total_fat: "5.5 g",
          saturated_fat: "5.5 g",
          trans_fat: "5.0 g",
          cholesterol: "0 mg",
          carbohydrates: "3 g",
          total_sugars: "0.2 g",
          dietary_fibre: "0.3 g",
          sodium: "81 mg"
        }
      };
      
      setSupplement(mockSupplement);
    } catch (err) {
      setError("Failed to load supplement details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      // This would be your actual API call
      // const response = await axios.get(`/api/SSS/batches?supplement_id=${params.id}`);
      
      // Mock data for now - replace with actual API call
      const mockBatches: Batch[] = [
        {
          id: 1,
          batch_number: "BN1000",
          supplement_name: "Whey Protein Isolate",
          supplement_brand: "Optimum Nutrition",
          batch_status: "In Stock",
          batch_initial_quantity: 58,
          booked: 10,
          available: 48,
          batch_expiration_date: "2025-12-31",
          batch_price: 102.21
        },
        {
          id: 2,
          batch_number: "BN2342",
          supplement_name: "Whey Protein Isolate",
          supplement_brand: "Optimum Nutrition",
          batch_status: "In Stock",
          batch_initial_quantity: 51,
          booked: 5,
          available: 46,
          batch_expiration_date: "2025-12-31",
          batch_price: 102.21
        },
        {
          id: 3,
          batch_number: "BU2132",
          supplement_name: "Whey Protein Isolate",
          supplement_brand: "Optimum Nutrition",
          batch_status: "No Stock",
          batch_initial_quantity: 0,
          booked: 0,
          available: 0,
          batch_expiration_date: "",
          batch_price: 0
        }
      ];
      
      setBatches(mockBatches);
    } catch (err) {
      console.error("Failed to load batches:", err);
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
              <div className="text-red-500">{error || "Supplement not found"}</div>
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
            
            {/* User Profile - Top Right */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V2a5 5 0 00-10 0v15l5-5z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">Amy Tan</div>
                  <div className="text-xs text-gray-500">Nutritionist</div>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">AT</span>
                </div>
              </div>
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
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <Search className="w-4 h-4" />
              Check for Alternatives
            </button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SupplementInfo supplement={supplement} />
            <NutritionalInfo nutritionalInfo={supplement.nutritional_info} />
          </div>

          {/* Inventory Batches */}
          <InventoryBatches batches={batches} supplementName={supplement.supplement_name} />
        </div>
      </div>
    </DashboardLayout>
  );
}