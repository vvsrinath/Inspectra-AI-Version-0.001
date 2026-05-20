export function resolveApiBase(): string {
  const publicUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (publicUrl) return publicUrl;

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  return "/api";
}
