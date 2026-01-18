"use client";

import DashboardLayout from "@/components/DashboardLayout";
import ViewTabs from "@/components/ViewTabs";
import { Globe, Search } from "lucide-react";

const tabs = [
  {
    id: "inventory",
    label: "Current Inventory View",
    icon: "globe",
    href: "/inventory",
  },
  {
    id: "scraper",
    label: "Web Scraper View",
    icon: "search",
    href: "/web-scraper",
  },
  {
    id: "library",
    label: "Supplement Library",
    icon: "library",
    href: "/library",
  },
];

export default function WebScraperPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Supplements</h1>

        {/* Tabs */}
        <ViewTabs tabs={tabs} />

        {/* Web Scraper Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 flex items-center justify-center mb-6">
              <Search className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Web Scraper View
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Automatically discover and import supplement data from various
              online sources.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Product Discovery
                </h4>
                <p className="text-sm text-gray-600">
                  Scan e-commerce sites and manufacturer websites for new
                  supplement products
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Price Monitoring
                </h4>
                <p className="text-sm text-gray-600">
                  Track price changes and availability across multiple retailers
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Data Enrichment
                </h4>
                <p className="text-sm text-gray-600">
                  Automatically gather nutritional information and ingredient
                  lists
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Compliance Check
                </h4>
                <p className="text-sm text-gray-600">
                  Verify product certifications and regulatory compliance
                </p>
              </div>
            </div>

            <button className="mt-8 bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors">
              Configure Scraper
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
