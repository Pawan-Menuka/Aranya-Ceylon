import { authedFetch } from "@/lib/api/auth-proxy";

// Admin order list. Forwards market/status/limit/cursor query params through.
export async function GET(req: Request) {
  const { search } = new URL(req.url);
  const res = await authedFetch(`/admin/orders${search}`);
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
