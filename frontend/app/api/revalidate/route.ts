import { revalidatePath } from "next/cache";

// On-demand ISR hook. The backend (blog.admin.controller.revalidateFrontend)
// calls GET /api/revalidate?secret=…&path=/blog/<slug> after a publish/update.
// Blog content is served under /journal here, so we map /blog* → /journal* and
// always refresh the journal index too.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const path = searchParams.get("path") ?? "";

  const expected = process.env.REVALIDATION_SECRET;
  if (!expected || secret !== expected) {
    return Response.json({ revalidated: false, error: "Invalid secret" }, { status: 401 });
  }

  const targets = new Set<string>(["/journal"]);
  if (path.startsWith("/blog/")) targets.add(`/journal/${path.slice("/blog/".length)}`);
  else if (path.startsWith("/journal/")) targets.add(path);

  for (const t of targets) revalidatePath(t);

  return Response.json({ revalidated: true, paths: [...targets] });
}
