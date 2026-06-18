import { proxyCart } from "@/lib/api/cart-proxy";

// GET the current cart. Establishes/persists the guestCartToken cookie for new
// guests (the backend sets it here; proxyCart re-emits it on our domain).
export async function GET() {
  const { status, data } = await proxyCart("GET", "/cart");
  return Response.json(data, { status });
}
