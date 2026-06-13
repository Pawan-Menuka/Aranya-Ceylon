import { cache } from "react";
import { apiUrl } from "../env";
import { DEMO_JOURNAL } from "../demo-journal";
import type {
  ApiBlogListItem,
  ApiBlogPost,
  BlogListResponse,
  SingleBlogResponse,
  JournalCardView,
  JournalPostView,
} from "./types";

// Blog is public, market-independent content. Unlike apiFetch (no-store +
// cookie-forwarding for per-user/market data), these reads are cached in the
// Next data cache and revalidated on a timer — so even though the storefront
// layout makes routes dynamic, the backend is hit at most once per window.
const REVALIDATE_SECONDS = 300;
const FETCH_TIMEOUT_MS = 4000;

async function blogFetch(path: string): Promise<Response> {
  return fetch(apiUrl(path), {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

// Deterministic spice-colour accent for posts (ported palette from products.ts)
const PALETTE = ["#B5651D", "#7C9A5A", "#6B4226", "#A9683C", "#3C3A36", "#D99A1C", "#0F6E56"];
function accentFor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

// First tag is treated as the post's category/chip; falls back to "Journal".
function categoryOf(tags: string[]): string {
  return tags[0]?.trim() || "Journal";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ~200 wpm; strips markdown/MDX punctuation roughly for the word count.
function readTimeOf(content: string): string {
  const words = content.replace(/[#>*_`\-]/g, " ").split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}

function mapCard(b: ApiBlogListItem): JournalCardView {
  return {
    slug: b.slug,
    title: b.title,
    dek: b.seoDesc ?? "",
    category: categoryOf(b.tags),
    tags: b.tags,
    date: formatDate(b.publishedAt),
    accent: accentFor(b.slug),
    // The newest post is spotlighted on the index when none is tagged featured.
    featured: b.tags.map((t) => t.toLowerCase()).includes("featured"),
  };
}

function mapPost(b: ApiBlogPost): JournalPostView {
  return {
    ...mapCard(b),
    content: b.content,
    readTime: readTimeOf(b.content),
    publishedAt: b.publishedAt,
    seoTitle: b.seoTitle,
    seoDesc: b.seoDesc,
  };
}

// Index list. Falls back to demo posts when the API is unreachable.
export async function getJournalPosts(): Promise<{ posts: JournalCardView[]; live: boolean }> {
  try {
    const res = await blogFetch("/blog?limit=50");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as BlogListResponse;
    return { posts: (data.items ?? []).map(mapCard), live: true };
  } catch (err) {
    console.warn("[journal] falling back to demo data:", (err as Error).message);
    return { posts: DEMO_JOURNAL.map(({ content, readTime, publishedAt, seoTitle, seoDesc, ...card }) => card), live: false };
  }
}

// Single post. Wrapped in cache() so generateMetadata + the page share one fetch.
export const getJournalPost = cache(async (slug: string): Promise<JournalPostView | null> => {
  try {
    const res = await blogFetch(`/blog/${encodeURIComponent(slug)}`);
    if (res.status === 404) return demoPost(slug);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as SingleBlogResponse;
    if (!data.blog) return demoPost(slug);
    return mapPost(data.blog);
  } catch (err) {
    console.warn(`[journal ${slug}] fetch failed:`, (err as Error).message);
    return demoPost(slug);
  }
});

function demoPost(slug: string): JournalPostView | null {
  return DEMO_JOURNAL.find((p) => p.slug === slug) ?? null;
}

// Stable category list for the index chips, "All" first.
export function journalCategories(posts: JournalCardView[]): string[] {
  const seen = new Set<string>();
  for (const p of posts) seen.add(p.category);
  return ["All", ...[...seen].sort()];
}
