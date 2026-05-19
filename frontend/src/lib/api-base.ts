/** Resolve API base URL for browser and server. */
export function resolveApiBase(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (publicUrl) return publicUrl;

  if (typeof window !== "undefined") {
    // All-in-one Vercel Python API (opt-in only)
    if (process.env.NEXT_PUBLIC_VERCEL_API === "1") {
      return `${window.location.origin}/api`;
    }
    // Vercel + Render (or local): same-origin proxy → INSPECTRA_API_URL / localhost:8000
    return `${window.location.origin}/api/proxy`;
  }

  const serverProxy = process.env.INSPECTRA_API_URL?.replace(/\/$/, "");
  if (serverProxy) return serverProxy;

  return "http://127.0.0.1:8000";
}
