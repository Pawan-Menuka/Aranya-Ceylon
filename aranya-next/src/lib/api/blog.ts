import { apiFetch } from "./http";
import type { Blog, Paginated } from "../types";

// Spec §6 — /blog (the Journal)
export function listBlog(
  params: { limit?: number; cursor?: string } = {},
  revalidate: number | false = 300
): Promise<Paginated<Blog>> {
  const s = new URLSearchParams();
  if (params.limit) s.set("limit", String(params.limit));
  if (params.cursor) s.set("cursor", params.cursor);
  const q = s.toString();
  return apiFetch(`/blog${q ? `?${q}` : ""}`, { revalidate });
}

export function getBlogPost(
  slug: string,
  revalidate: number | false = 300
): Promise<{ blog: Blog }> {
  return apiFetch(`/blog/${encodeURIComponent(slug)}`, { revalidate });
}
