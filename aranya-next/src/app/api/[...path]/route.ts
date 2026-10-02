import { NextRequest, NextResponse } from "next/server";
import { requestTimeoutMs, withRequestDeadline } from "@/lib/api/request-deadline";
import { compressPublicResponse } from "@/lib/api/public-compression.server";

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
const STRIP_REQ = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  // These must be set by trusted infrastructure. Forwarding client-provided
  // values lets callers spoof req.ip in Express (rate limits + audit records).
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  // The private ingress overwrites the source header. Never relay source or
  // supplied signed metadata; only freshly reconstructed signatures may pass.
  "x-aranya-verified-client-ip",
  "x-aranya-bff-client-ip",
  "x-aranya-bff-client-time",
  "x-aranya-bff-client-signature",
]);

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const search = req.nextUrl.search || "";
  const target = `${API_BASE}/${path.join("/")}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_REQ.has(key.toLowerCase())) headers.set(key, value);
  });

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  try {
    return await withRequestDeadline(requestTimeoutMs(`/${path.join("/")}`, method, true), req.signal, async (signal) => {
      const requestBody = hasBody ? await req.arrayBuffer() : undefined;
      signal.throwIfAborted();
      const identitySecret = process.env.BFF_CLIENT_IP_SECRET;
      if (identitySecret) {
        // This Node-only signer belongs solely to browser BFF forwarding, not
        // the shared public SSR fetch graph / Next Data Cache keys.
        const { signedBffIdentityHeaders } = await import("@/lib/api/bff-client-identity.server");
        const identity = signedBffIdentityHeaders({
          ip: req.headers.get("x-aranya-verified-client-ip"), method, target, secret: identitySecret,
        });
        if (!identity) throw new Error("Identity unavailable.");
        for (const [key, value] of Object.entries(identity)) headers.set(key, value);
      }
      signal.throwIfAborted();
      const upstream = await fetch(target, {
        method,
        headers,
        body: requestBody,
        redirect: "manual",
        // Express decides CORS; we just relay. Cookies travel in the Cookie header.
        cache: "no-store",
        signal,
      });

      // Relay status + body, and crucially every Set-Cookie the backend emits.
      const resHeaders = new Headers();
      upstream.headers.forEach((value, key) => {
        const k = key.toLowerCase();
        // Fetch decodes upstream compression. Its original length no longer
        // describes this body; let Next calculate framing/compression afresh.
        if (k === "set-cookie" || k === "content-encoding" || k === "transfer-encoding" || k === "content-length") return;
        resHeaders.set(key, value);
      });
      if (!resHeaders.has("cache-control")) resHeaders.set("cache-control", "private, no-store");

      // getSetCookie() returns the un-merged list (undici / Node 18.14+).
      const setCookies =
        typeof (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
          ? (upstream.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
          : [];

      const body = await compressPublicResponse(await upstream.arrayBuffer(), resHeaders, {
        method, path: `/${path.join("/")}`, acceptEncoding: req.headers.get("accept-encoding"),
        cacheControl: req.headers.get("cache-control"),
      }, upstream.status, upstream.headers.has("set-cookie"));
      signal.throwIfAborted();
      const out = new NextResponse([204, 205, 304].includes(upstream.status) ? null : body, { status: upstream.status, headers: resHeaders });
      for (const c of setCookies) out.headers.append("set-cookie", rescopeCookiePath(c));
      return out;
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const timeout = code === "request_timeout";
    const cancelled = code === "request_cancelled";
    return NextResponse.json(
      { error: timeout ? "request_timeout" : cancelled ? "request_cancelled" : "upstream_unreachable",
        message: timeout ? "The service took too long. Please try again." : cancelled ? "Request cancelled." : "The API is not reachable." },
      { status: timeout ? 504 : cancelled ? 499 : 502, headers: { "cache-control": "no-store" } },
    );
  }
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
