import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/noms',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Proxy API requests to Express backend
  // Note: API routes take priority over rewrites, so /api/ocr/* routes
  // will be handled by Next.js API Route Handlers, not this rewrite
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
