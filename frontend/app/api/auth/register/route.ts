import { apiUrl } from "@/lib/env";

// POST { name, email, password }. The backend returns a neutral message and
// does NOT log the user in (anti-enumeration, #9) — the client then sends the
// user to sign in.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return Response.json({ error: "Sign-up service unavailable" }, { status: 503 });
  }

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
