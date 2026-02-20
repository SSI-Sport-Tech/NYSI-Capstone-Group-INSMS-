import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API requests to Express backend
  // Note: API routes take priority over rewrites, so /api/ocr/* routes
  // will be handled by Next.js API Route Handlers, not this rewrite
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
