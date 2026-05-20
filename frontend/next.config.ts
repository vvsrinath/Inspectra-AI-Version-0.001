import type { NextConfig } from "next";

/** API proxy: src/app/api/proxy/[[...path]]/route.ts (runtime INSPECTRA_API_URL) */
const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.1.11", "127.0.0.1"],
};

export default nextConfig;
