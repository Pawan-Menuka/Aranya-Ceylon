import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "crypto";

// Length-independent constant-time compare so a timing side-channel can't be
// used to recover the revalidation secret byte by byte (SEC-15).
function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// On-demand public Data Cache and dynamic route invalidation endpoint.
// Called by the backend after content create/update/delete.
// Secret is expected in the x-revalidate-secret header (not a query param)
// so it doesn't appear in server logs or CDN access logs.
// A concrete route segment takes precedence over the BFF [...path] catch-all,
// so this handler is reached directly — it is never proxied to the backend.
function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-revalidate-secret");
  const expected = process.env.REVALIDATION_SECRET;

  return !!expected && secretsMatch(secret, expected);
}

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

function invalidate(input: unknown): NextResponse {
  if (!Array.isArray(input) || !input.length || input.length > 32 || input.some(path =>
    typeof path !== "string" || path.length > 512 || !/^\/(?:$|(?:products|categories|search|journal|recipes|gifts)(?:\/[^?#\\\s]+)?$)/.test(path) || path.includes("..")
  )) return reply({ error: "Provide 1–32 public paths" }, 400);
  const paths = [...new Set(input as string[])];
  const tags = new Set<string>();
  for (const path of paths) {
    const resource = path.split("/")[1];
    if (resource === "products" || resource === "categories" || resource === "search") {
      for (const tag of ["products", "categories", "recipes", "gifts"]) tags.add(tag);
    } else if (resource === "journal") tags.add("blog");
    else if (resource === "recipes" || resource === "gifts") tags.add(resource);
  }
  for (const tag of tags) revalidateTag(tag);
  for (const path of paths) revalidatePath(path);
  return reply({ revalidated: true, paths, tags: [...tags] });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) return reply({ error: "Unauthorized" }, 401);
  return invalidate([req.nextUrl.searchParams.get("path")]);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) return reply({ error: "Unauthorized" }, 401);
  try {
    const body = await req.json();
    return invalidate(body?.paths);
  } catch {
    return reply({ error: "Invalid revalidation request" }, 400);
  }
}
