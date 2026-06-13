import { authedFetch } from "@/lib/api/auth-proxy";

// The authenticated user's order history. 401 → { orders: null } so the client
// can route to sign-in.
export async function GET() {
  const res = await authedFetch("/orders");
  if (res.status === 401) return Response.json({ orders: null }, { status: 200 });
  if (!res.ok) return Response.json({ error: "Could not load orders" }, { status: res.status });
  const data = await res.json().catch(() => ({ orders: [] }));
  return Response.json(data);
}
