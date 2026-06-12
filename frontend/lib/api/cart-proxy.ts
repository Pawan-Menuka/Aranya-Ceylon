import { cookies } from "next/headers";
import { apiUrl } from "../env";

// Cookies relayed to the backend on cart calls. x-market lets addToCart
// validate the variant's market; guestCartToken identifies the guest cart;
// refreshToken covers authenticated carts once auth lands.
const FORWARD = ["x-market", "guestCartToken", "refreshToken"];

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

  let res: Response;
  try {
    res = await fetch(apiUrl(backendPath), {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
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
