/** Resolve API base URL for browser and server. */
export function resolveApiBase(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (publicUrl) return publicUrl;

  if (typeof window !== "undefined") {
    // All-in-one Vercel Python API (opt-in only)
    if (process.env.NEXT_PUBLIC_VERCEL_API === "1") {
      return `${window.location.origin}/api`;
    }
    // Use hosted Render backend (fallback)
    return "https://inspectra-ai-version-0-001-4.onrender.com/api";
  }


  const serverProxy = process.env.INSPECTRA_API_URL?.replace(/\/$/, "");
  if (serverProxy) return serverProxy;

  // Default to relative API path for Vercel
  return "/api";
}
