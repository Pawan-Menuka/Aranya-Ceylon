import { proxyCart } from "@/lib/api/cart-proxy";

// Create a payment intent (or stub) for the current cart. Relays the market +
// guest-cart cookies to the backend, which resolves the cart and (in stub
// mode) returns { gateway: 'stub', orderId }.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const { status, data } = await proxyCart("POST", "/checkout/create-intent", body);
  return Response.json(data, { status });
}
