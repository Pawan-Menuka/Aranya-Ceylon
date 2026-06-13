import { proxyCart } from "@/lib/api/cart-proxy";

// Stub-mode payment confirmation — simulates the gateway webhook. No-op (404)
// on the backend when PAYMENTS_MODE=live.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const { status, data } = await proxyCart("POST", "/checkout/stub/complete", body);
  return Response.json(data, { status });
}
