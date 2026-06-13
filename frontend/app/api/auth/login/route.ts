import { cookies } from "next/headers";
import { apiUrl } from "@/lib/env";
import { persistSession } from "@/lib/api/auth-proxy";

// POST { email, password } → establishes the session (access + refresh cookies)
// on the app domain and returns the user.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return Response.json({ error: "Sign-in service unavailable" }, { status: 503 });
  }

  const data = (await res.json().catch(() => ({}))) as { accessToken?: string; user?: unknown; error?: string };
  if (!res.ok || !data.accessToken) {
    return Response.json({ error: data.error ?? "Invalid email or password" }, { status: res.status || 401 });
  }

  const store = await cookies();
  persistSession(store, data.accessToken, res); // set access + refresh cookies

  // Merge any guest cart into the user's cart (best-effort).
  const guestToken = store.get("guestCartToken")?.value;
  if (guestToken) {
    try {
      await fetch(apiUrl("/cart/merge"), {
        method: "POST",
        headers: { Authorization: `Bearer ${data.accessToken}`, Cookie: `guestCartToken=${guestToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // non-fatal — the user can still use their cart
    }
    store.delete("guestCartToken"); // merged + deleted server-side; drop the stale cookie
  }

  return Response.json({ user: data.user });
}
