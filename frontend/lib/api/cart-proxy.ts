import { cookies } from "next/headers";
import { apiUrl } from "../env";
import { getValidAccessToken } from "./auth-proxy";

// Cookies relayed to the backend on cart/checkout calls. x-market lets the
// backend resolve the market; guestCartToken identifies a guest cart.
const FORWARD = ["x-market", "guestCartToken"];

// Server-only proxy for cart route handlers. Forwards the request to the
// backend with cookie relay, and — crucially — re-emits any guestCartToken the
// backend sets onto THIS app's domain, so the guest cart persists across SSR
// and subsequent calls (the backend only sets it on GET /cart for new carts).
export async function proxyCart(
  method: string,
  backendPath: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const store = await cookies();
  const cookieHeader = FORWARD.map((n) => {
    const c = store.get(n);
    return c ? `${n}=${c.value}` : null;
  })
    .filter(Boolean)
    .join("; ");

  // Attach the session's Bearer when signed in, so the backend (optionalAuth)
  // operates on the USER cart/order rather than the guest cart.
  const accessToken = await getValidAccessToken(store);

  let res: Response;
  try {
    res = await fetch(apiUrl(backendPath), {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { status: 503, data: { error: "Cart service unavailable" } };
  }

  // Re-emit guestCartToken on our domain if the backend issued one.
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const gc = setCookies.find((c) => c.startsWith("guestCartToken="));
  if (gc) {
    const value = gc.split(";")[0]!.slice("guestCartToken=".length);
    store.set("guestCartToken", value, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });
  }

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
