import { cookies } from "next/headers";
import { apiUrl } from "@/lib/env";
import { clearSession } from "@/lib/api/auth-proxy";

// Revokes the session: tells the backend to drop the refresh-token family,
// then clears the app-domain cookies regardless.
export async function POST() {
  const store = await cookies();
  const refresh = store.get("refreshToken")?.value;

  if (refresh) {
    try {
      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        headers: { Cookie: `refreshToken=${refresh}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // ignore — we still clear local cookies below
    }
  }

  clearSession(store);
  return Response.json({ ok: true });
}
