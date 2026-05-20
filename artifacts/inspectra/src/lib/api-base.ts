export function resolveApiBase(): string {
  const publicUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (publicUrl) return publicUrl;

  if (typeof window !== "undefined") {
    if (import.meta.env.VITE_VERCEL_API === "1") {
      return `${window.location.origin}/api`;
    }
    return `${window.location.origin}/api/proxy`;
  }

  return "/api";
}
