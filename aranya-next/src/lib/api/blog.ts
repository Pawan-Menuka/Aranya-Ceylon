import { publicApiFetch, type PublicRequestOptions } from "./public";
import type { Blog, Paginated } from "../types";

// Spec §6 — /blog (the Journal)
export function listBlog(
  params: { limit?: number; cursor?: string } = {},
  revalidate: number | false = 300,
  options: PublicRequestOptions = {}
): Promise<Paginated<Blog>> {
  const s = new URLSearchParams();
  if (params.limit) s.set("limit", String(params.limit));
  if (params.cursor) s.set("cursor", params.cursor);
  const q = s.toString();
  return publicApiFetch(`/blog${q ? `?${q}` : ""}`, { revalidate, ...options });
}

export function getBlogPost(
  slug: string,
  revalidate: number | false = 300
): Promise<{ blog: Blog }> {
  return publicApiFetch(`/blog/${encodeURIComponent(slug)}`, { revalidate });
}
