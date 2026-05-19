/** Resolve API base URL for browser and server. */
export function resolveApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  if (typeof window !== "undefined") {
    // Vercel: Python FastAPI runs at /api (same deployment)
    if (process.env.NEXT_PUBLIC_VERCEL_API === "1") {
      return `${window.location.origin}/api`;
    }
    // Local dev: Next.js rewrites /api/proxy → localhost:8000
    return `${window.location.origin}/api/proxy`;
  }

  const serverProxy = process.env.INSPECTRA_API_URL?.replace(/\/$/, "");
  if (serverProxy) return serverProxy;

  return "http://127.0.0.1:8000";
}
