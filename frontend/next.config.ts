import type { NextConfig } from "next";

/** Backend URL for /api/proxy rewrites (set on Vercel: INSPECTRA_API_URL) */
const apiTarget =
  process.env.INSPECTRA_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.11", "127.0.0.1"],
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
