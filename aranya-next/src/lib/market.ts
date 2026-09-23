import { cookies, headers } from "next/headers";
import type { Market } from "./types";
import { fromBackendMarket } from "./money";

// Spec §7.1/§7.2 — the active market lives in a signed HttpOnly `x-market`
// cookie set by the backend (POST /market/override). Because it's HttpOnly the
// browser JS can't read it, so Server Components resolve it here and pass the
// result down. This keeps currency + CTA colour correct on the first paint.
//
// The backend signs the cookie as a JWT with an { market: "local" | "international" }
// payload (see backend market.routes.ts), so the raw cookie string is NOT the bare
// market token — we must read it out of the JWT payload. We only *decode* here (no
// signature check): this drives first-paint currency/CTA only, and every write path
// (checkout, /cart) re-resolves the market from the signature-verified cookie on the
// backend, so a tampered cookie can at worst mis-colour the SSR shell, never mis-charge.
// Default market is International (USD / amber CTA).
function marketFromCookieValue(value: string): Market {
  // JWTs are "header.payload.signature"; a bare legacy value has no dots.
  if (value.includes(".")) {
    const payload = decodeJwtPayload(value);
    if (payload && typeof payload.market === "string") {
      return fromBackendMarket(payload.market);
    }
  }
  return fromBackendMarket(value);
}

function decodeJwtPayload(jwt: string): { market?: unknown } | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    // base64url -> base64, then decode. Buffer exists in the Node/RSC runtime.
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function resolveMarket(): Market {
  try {
    const c = cookies().get("x-market");
    if (c?.value) return marketFromCookieValue(c.value);
  } catch {
    // cookies() throws outside a request scope (e.g. during static prerender
    // with no request) — fall through to the default.
  }
  // No cookie yet (first-time visitor) — geo-detect via Cloudflare's country
  // header for a correct first paint, mirroring the backend's own fallback
  // (middleware/market.ts) so checkout doesn't disagree with what the
  // shopper already saw (DEPLOY_READINESS_PLAN.md #0.3). Cosmetic only, same
  // low trust level as the unsigned cookie decode above: this only drives
  // first-paint currency/CTA colour, never a charge — checkout re-resolves
  // the market authoritatively on the backend regardless.
  try {
    if (headers().get("cf-ipcountry") === "LK") return "local";
  } catch {
    // headers() also throws outside a request scope — same fallback.
  }
  return "intl";
}
