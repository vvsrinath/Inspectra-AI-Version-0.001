/** Resolve API base URL: same-origin proxy in browser, direct URL on server. */
export function resolveApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/proxy`;
  }

  const serverProxy = process.env.INSPECTRA_API_URL?.replace(/\/$/, "");
  if (serverProxy) return serverProxy;

  return "http://127.0.0.1:8000";
}
