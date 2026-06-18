import { cookies } from "next/headers";
import { API_URL } from "@/lib/env";

// Market switch bridge. The backend signs the `x-market` JWT (it owns
// COOKIE_SECRET); we can't. So we forward the choice to the backend's
// /market/override, capture the signed token it sets, and re-emit it as a
// cookie on THIS app's domain. SSR then reads it via cookies() and forwards
// it back to the API — works in local dev and same-parent-domain prod alike.
export async function POST(req: Request) {
  let market: unknown;
  try {
    ({ market } = await req.json());
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (market !== "local" && market !== "international") {
    return Response.json({ error: "Invalid market" }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_URL}/market/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ market }),
    });
  } catch {
    return Response.json({ error: "Market service unreachable" }, { status: 502 });
  }

  if (!backendRes.ok) {
    return Response.json({ error: "Market override failed" }, { status: 502 });
  }

  // Pull the signed x-market token out of the backend's Set-Cookie and
  // re-emit it on our domain so SSR can read + forward it.
  const setCookies = backendRes.headers.getSetCookie?.() ?? [];
  const xm = setCookies.find((c) => c.startsWith("x-market="));
  const token = xm ? xm.split(";")[0]!.slice("x-market=".length) : null;

  if (token) {
    (await cookies()).set("x-market", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return Response.json({ market });
}
