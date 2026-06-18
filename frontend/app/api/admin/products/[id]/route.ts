import { authedFetch } from "@/lib/api/auth-proxy";

// Update product-level fields (name/description/category/certs/featured/etc.).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const res = await authedFetch(`/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}

// Archive (soft delete) a product.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await authedFetch(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
