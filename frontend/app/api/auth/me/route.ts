import { authedFetch } from "@/lib/api/auth-proxy";

// Returns the current user (or 401 if not signed in). authedFetch handles the
// Bearer token + one refresh-on-401 transparently.
export async function GET() {
  const res = await authedFetch("/auth/me");
  if (!res.ok) {
    return Response.json({ user: null }, { status: res.status === 401 ? 200 : res.status });
  }
  const data = await res.json().catch(() => ({ user: null }));
  return Response.json(data);
}
