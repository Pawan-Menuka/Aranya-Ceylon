import { authedFetch } from "@/lib/api/auth-proxy";

// Blog list (all statuses, admin view).
export async function GET() {
  const res = await authedFetch("/admin/blogs");
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}

// Create a post (DRAFT/SCHEDULED/PUBLISHED).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const res = await authedFetch("/admin/blogs", { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 200 : res.status });
}
