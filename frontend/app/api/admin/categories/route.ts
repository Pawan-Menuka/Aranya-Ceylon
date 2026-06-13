import { apiUrl } from "@/lib/env";

// Category list for the product form's category select. Categories are public,
// so no auth token needed — this just proxies past the cross-origin boundary.
export async function GET() {
  try {
    const res = await fetch(apiUrl("/categories"), {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json().catch(() => ({ categories: [] }));
    return Response.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return Response.json({ categories: [] }, { status: 200 });
  }
}
