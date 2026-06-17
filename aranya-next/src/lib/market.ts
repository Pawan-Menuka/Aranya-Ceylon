import { cookies } from "next/headers";
import type { Market } from "./types";
import { fromBackendMarket } from "./money";

// Spec §7.1/§7.2 — the active market lives in a signed HttpOnly `x-market`
// cookie set by the backend (POST /market/override). Because it's HttpOnly the
// browser JS can't read it, so Server Components resolve it here and pass the
// result down. This keeps currency + CTA colour correct on the first paint.
//
// The cookie value mirrors the backend token ("INTERNATIONAL" | "LOCAL").
// Default market is International (USD / amber CTA).
export function resolveMarket(): Market {
  try {
    const c = cookies().get("x-market");
    if (c?.value) return fromBackendMarket(c.value);
  } catch {
    // cookies() throws outside a request scope (e.g. during static prerender
    // with no request) — fall through to the default.
  }
  return "intl";
}
