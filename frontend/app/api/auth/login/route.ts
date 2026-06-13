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

  persistSession(await cookies(), data.accessToken, res);
  return Response.json({ user: data.user });
}
