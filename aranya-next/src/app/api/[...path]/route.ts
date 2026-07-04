import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// BFF proxy (spec §7.1 — "HttpOnly cookies + SSR forwarding").
// The browser only ever talks to this same-origin /api/* route; the server
// forwards the request to the Express API (NEXT_PUBLIC_API_URL), carrying the
// HttpOnly cookies (x-market, guestCartToken, refresh token) and the Bearer
// token. Set-Cookie responses are passed straight back so the backend can
// rotate those cookies. This keeps tokens off the client.
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Hop-by-hop / managed headers we must not blindly forward.
const STRIP_REQ = new Set(["host", "connection", "content-length", "accept-encoding"]);

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const search = req.nextUrl.search || "";
  const target = `${API_BASE}/${path.join("/")}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_REQ.has(key.toLowerCase())) headers.set(key, value);
  });

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      // Express decides CORS; we just relay. Cookies travel in the Cookie header.
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable", message: "The API is not reachable." },
      { status: 502 }
    );
  }

  // Relay status + body, and crucially every Set-Cookie the backend emits.
  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "set-cookie" || k === "content-encoding" || k === "transfer-encoding") return;
    resHeaders.set(key, value);
  });

  // getSetCookie() returns the un-merged list (undici / Node 18.14+).
  const setCookies =
    typeof (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (upstream.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : [];

  const body = await upstream.arrayBuffer();
  const out = new NextResponse(body, { status: upstream.status, headers: resHeaders });
  for (const c of setCookies) out.headers.append("set-cookie", rescopeCookiePath(c));
  return out;
}

// The browser only ever reaches the API through this /api/* BFF, so a cookie the
// backend scopes to `/auth` (the refresh token) would never be sent back to
// /api/auth/refresh or /api/auth/logout — the paths don't match. Re-scope it to
// `/api/auth` so the browser returns it to both endpoints (logout can then revoke
// the token family — BUG-03/SEC-10). Cookies left at Path=/ (x-market,
// guestCartToken) are untouched: SSR page requests to non-/api routes still need
// them, and `/` already covers /api/*.
function rescopeCookiePath(cookie: string): string {
  return cookie.replace(/;\s*Path=\/auth\b/i, "; Path=/api/auth");
}

type Ctx = { params: { path: string[] } };

export async function GET(req: NextRequest, { params }: Ctx) {
  return proxy(req, params.path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxy(req, params.path);
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return proxy(req, params.path);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return proxy(req, params.path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return proxy(req, params.path);
}
