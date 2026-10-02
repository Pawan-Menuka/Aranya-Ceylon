import { makeError } from "./http";
import { RequestFailure, requestTimeoutMs, withRequestDeadline } from "./request-deadline";
import { beginPublicReadMetric } from "../performance/public-read-metrics.server";
import type { PublicRequestOptions } from "./public";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL ?? "http://localhost:4000";

// Use Web Crypto here: public.ts is isomorphic, so its dynamic-import graph
// must not statically import next/headers or Node crypto into client modules.
async function canonicalCookie(value: string | undefined, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  let market = "international";
  if (value) {
    try {
      const parts = value.split(".");
      if (parts.length === 3 && parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) {
        const [header, payload, signature] = parts;
        const h = JSON.parse(Buffer.from(header, "base64url").toString());
        const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
        const now = Math.floor(Date.now() / 1000);
        if (h.alg === "HS256" && h.crit === undefined && h.b64 !== false && claims && typeof claims === "object" && !Array.isArray(claims)
          && (claims.iat === undefined || typeof claims.iat === "number")
          && (claims.exp === undefined || (typeof claims.exp === "number" && claims.exp > now))
          && (claims.nbf === undefined || (typeof claims.nbf === "number" && claims.nbf <= now))
          && await crypto.subtle.verify("HMAC", key, Buffer.from(signature, "base64url"), new TextEncoder().encode(`${header}.${payload}`))) {
          market = claims.market === "local" ? "local" : "international";
        }
      }
    } catch { /* Invalid token matches API's INTERNATIONAL default. */ }
  }
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ market })).toString("base64url");
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${Buffer.from(signature).toString("base64url")}`;
}

export async function fetchPublicServer<T>(
  resource: { path: string; tags: string[]; ttl: number }, options: PublicRequestOptions,
): Promise<T> {
  if (typeof window !== "undefined") throw new Error("Public server cache is server-only.");
  return withRequestDeadline(options.timeoutMs ?? requestTimeoutMs(resource.path), options.signal, async signal => {
    const { cookies } = await import("next/headers");
    let incoming: string | undefined;
    try { incoming = cookies().get("x-market")?.value; } catch { /* Outside request scope: backend default. */ }
    const secret = process.env.MARKET_COOKIE_SECRET || undefined;
    const marketCookie = secret ? await canonicalCookie(incoming, secret) : incoming;
    const ttl = options.revalidate ?? resource.ttl;
    const shared = !!secret && ttl !== 0;
    // The only upstream cookie is market. No login, refresh or guest cart identity.
    const headers = new Headers();
    if (marketCookie) headers.set("cookie", `x-market=${marketCookie}`);
    signal.throwIfAborted();
    const finishMetric = beginPublicReadMetric(resource.path, shared);
    let status = 0;
    let outcome: "complete" | "failed" | "cancelled" = "failed";
    try {
      const response = await fetch(`${API_BASE}${resource.path}`, {
        headers, signal,
        // Explicit revalidate enables the Data Cache even after cookies(). Do
        // not combine it with cache: force-cache (Next 14 warns on both hints).
        ...(shared ? { next: { revalidate: ttl, tags: resource.tags } } : { cache: "no-store" as const }),
      });
      status = response.status;
      const text = await response.text();
      let data: unknown = null;
      if (text) { try { data = JSON.parse(text); } catch { data = text; } }
      if (!response.ok) throw makeError(response.status, data);
      outcome = "complete";
      return data as T;
    } catch (error) {
      if (signal.aborted) { outcome = "cancelled"; throw signal.reason; }
      if (error instanceof TypeError) throw new RequestFailure("The service is unavailable. Please try again.", 502, "api_unreachable");
      throw error;
    } finally {
      finishMetric?.(status, outcome);
    }
  });
}
