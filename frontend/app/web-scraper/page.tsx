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
          <div className="text-black">
            Webscrapper view, update soon
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
