const COOKIE_NAME = "inspectra_workspace";
const STORAGE_KEY = "inspectra_workspace_id";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(id: string): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getWorkspaceId(): string {
  if (typeof window === "undefined") return "ssr-placeholder";

  let id = readCookie() || localStorage.getItem(STORAGE_KEY);
  if (!id || id.length < 8) {
    id = generateId();
    writeCookie(id);
    localStorage.setItem(STORAGE_KEY, id);
  } else {
    writeCookie(id);
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "X-Workspace-Id": getWorkspaceId(),
    ...extra,
  };
}
