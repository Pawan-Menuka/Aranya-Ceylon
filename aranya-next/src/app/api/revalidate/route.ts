import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// On-demand ISR revalidation endpoint.
// Called by the backend after content create/update/delete.
// Secret is expected in the x-revalidate-secret header (not a query param)
// so it doesn't appear in server logs or CDN access logs.
// A concrete route segment takes precedence over the BFF [...path] catch-all,
// so this handler is reached directly — it is never proxied to the backend.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("x-revalidate-secret");
  const expected = process.env.REVALIDATION_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path query parameter is required" }, { status: 400 });
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
