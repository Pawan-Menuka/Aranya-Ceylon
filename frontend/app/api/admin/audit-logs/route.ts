import { authedFetch } from "@/lib/api/auth-proxy";

// Audit log feed. Forwards event/targetType/actorId/limit/cursor query params.
export async function GET(req: Request) {
  const { search } = new URL(req.url);
  const res = await authedFetch(`/admin/audit-logs${search}`);
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
