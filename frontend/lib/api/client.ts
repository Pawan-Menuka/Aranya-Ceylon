import { cookies } from "next/headers";
import { apiUrl } from "../env";

// Cookies the SSR layer forwards to the backend. The market + guest-cart +
// refresh cookies are HttpOnly and live on this (same-parent) domain, so the
// browser sends them to the Next server, which relays them to the API.
const FORWARD_COOKIES = ["x-market", "refreshToken", "guestCartToken"];

// Hard cap on a single backend call. A slow/cold/hung API (e.g. Neon waking)
// must never hang server rendering — on timeout the fetch aborts and callers
// fall back (e.g. demo catalog) instead of blocking the page.
const API_TIMEOUT_MS = 4000;

// Server-side fetch to the backend with cookie forwarding. Always no-store —
// these reads are per-request and market-dependent (dynamic rendering).
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const store = await cookies();
  const cookieHeader = FORWARD_COOKIES
    .map((name) => {
      const c = store.get(name);
      return c ? `${name}=${c.value}` : null;
    })
    .filter(Boolean)
    .join("; ");

  return fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
}
