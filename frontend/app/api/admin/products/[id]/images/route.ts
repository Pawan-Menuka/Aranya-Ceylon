import { cookies } from "next/headers";
import { getValidAccessToken } from "@/lib/api/auth-proxy";
import { apiUrl } from "@/lib/env";

// Image upload is multipart/form-data, so this can't use authedFetch (which
// forces application/json). We forward the FormData verbatim — fetch sets the
// multipart boundary itself — with a proactively-refreshed Bearer token.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const token = await getValidAccessToken(store);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const res = await fetch(apiUrl(`/products/${encodeURIComponent(id)}/images`), {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(30000), // image upload + Cloudinary can be slow
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.ok ? 201 : res.status });
}
