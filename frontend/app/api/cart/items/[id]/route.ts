import { proxyCart } from "@/lib/api/cart-proxy";

// Update an item's quantity: { quantity }. quantity 0 removes it (backend).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const { status, data } = await proxyCart("PATCH", `/cart/items/${encodeURIComponent(id)}`, body);
  return Response.json(data, { status });
}
