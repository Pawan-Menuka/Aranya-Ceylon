import { authedFetch } from "@/lib/api/auth-proxy";

// Admin product list — all products, both markets, incl. archived (backend
// GET /products/admin/all). Not market-filtered like the public catalog.
export async function GET() {
  const res = await authedFetch("/products/admin/all");
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}

// Create a product (with variants).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const res = await authedFetch("/products", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 201 : res.status });
}
