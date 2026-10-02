import { createHmac, timingSafeEqual } from "node:crypto";
import type { Market } from "./types";

// Server configuration only. This must match the API's COOKIE_SECRET.
export function marketCookieSecret(): string | undefined {
  return process.env.MARKET_COOKIE_SECRET || undefined;
}

/** Match the API's HS256 cookie verification and INTERNATIONAL default. */
export function verifiedCookieMarket(value: string | undefined, secret: string, now = Date.now()): Market {
  if (!value) return "intl";
  try {
    const parts = value.split(".");
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return "intl";
    const [header, payload, signature] = parts;
    const protectedHeader = JSON.parse(Buffer.from(header, "base64url").toString());
    if (protectedHeader.alg !== "HS256" || protectedHeader.crit !== undefined || protectedHeader.b64 === false) return "intl";
    const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return "intl";
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!claims || typeof claims !== "object" || Array.isArray(claims)) return "intl";
    const seconds = Math.floor(now / 1000);
    if (claims.iat !== undefined && typeof claims.iat !== "number") return "intl";
    if (claims.exp !== undefined && (typeof claims.exp !== "number" || claims.exp <= seconds)) return "intl";
    if (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf > seconds)) return "intl";
    return claims.market === "local" ? "local" : "intl";
  } catch {
    return "intl";
  }
}

/** Stable across guests, login cookies and JWT expirations within a market. */
export function canonicalMarketCookie(market: Market, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ market: market === "local" ? "local" : "international" })).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}
