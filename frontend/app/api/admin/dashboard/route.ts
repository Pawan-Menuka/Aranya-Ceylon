import { authedFetch } from "@/lib/api/auth-proxy";

// Admin analytics snapshot. Auth + role enforced by the backend.
export async function GET() {
  const res = await authedFetch("/admin/dashboard");
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
