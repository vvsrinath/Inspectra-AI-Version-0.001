import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function apiTarget(): string {
  return (
    process.env.INSPECTRA_API_URL?.replace(/\/$/, "") ??
    "https://inspectra-ai-version-0-001-4.onrender.com"
  );
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
  "accept-encoding",
]);

async function proxyRequest(
  req: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const path = pathSegments.join("/");
  const target = path
    ? `${apiTarget()}/${path}${req.nextUrl.search}`
    : `${apiTarget()}/${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    headers.set(key, value);
  });

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { detail: `Cannot reach backend: ${msg}` },
      { status: 502 }
    );
  }


  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    responseHeaders.set(key, value);
  });

  const responseBody = await upstream.arrayBuffer();

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

async function handler(req: NextRequest, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxyRequest(req, path);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
