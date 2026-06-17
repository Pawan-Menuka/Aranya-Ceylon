import { apiFetch } from "./http";
import type { Market } from "../types";
import { toBackendMarket } from "../money";

// Spec §6/§7.2 — POST /market/override sets the signed HttpOnly x-market cookie.
// Called from the browser (BFF) so the cookie lands on this origin; the caller
// then refreshes the server-rendered tree (router.refresh()) to re-resolve
// currency + CTA colour server-side.
export function overrideMarket(market: Market): Promise<{ market: string }> {
  return apiFetch(`/market/override`, {
    method: "POST",
    body: { market: toBackendMarket(market) === "LOCAL" ? "local" : "international" },
  });
}
