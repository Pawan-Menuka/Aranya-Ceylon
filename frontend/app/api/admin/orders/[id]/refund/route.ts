import { authedFetch } from "@/lib/api/auth-proxy";

// Issue a refund (Stripe for international; stock restored backend-side).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await authedFetch(`/admin/orders/${encodeURIComponent(id)}/refund`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
