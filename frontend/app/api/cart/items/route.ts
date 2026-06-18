import { proxyCart } from "@/lib/api/cart-proxy";

// Add an item: { productId, variantId, quantity }.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const { status, data } = await proxyCart("POST", "/cart/items", body);
  return Response.json(data, { status });
}
