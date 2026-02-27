"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <div className="flex justify-center mb-4">
          <ShieldX className="w-16 h-16 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">
          You don&apos;t have permission to view this page.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
