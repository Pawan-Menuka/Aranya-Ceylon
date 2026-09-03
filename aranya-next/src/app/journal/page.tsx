import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { listBlog } from "@/lib/api/blog";
import { JOURNAL, toPost } from "@/lib/journal-data";
import { SiteChrome } from "@/components/SiteChrome";
import { JournalClient } from "@/components/journal/JournalClient";
import type { Post } from "@/lib/journal-data";

export const metadata: Metadata = {
  title: "The Journal",
  description: "Sourcing stories, spice notes and recipes from the hill country of Sri Lanka — the people, the plants, and how to get the most from both.",
  alternates: { canonical: "/journal" },
};

async function loadPosts(): Promise<{ posts: Post[]; nextCursor: string | null }> {
  try {
    const res = await listBlog({ limit: 30 });
    const posts = (res.items || []).map(toPost);
    // Cursor pagination only makes sense against the live API — the static
    // JOURNAL fallback below is the whole demo set, nothing more to page to.
    if (posts.length) return { posts, nextCursor: res.nextCursor };
  } catch {
    /* fall through */
  }
  return { posts: JOURNAL, nextCursor: null };
}

export default async function JournalPage() {
  const market = resolveMarket();
  const { posts, nextCursor } = await loadPosts();
  return (
    <SiteChrome initialMarket={market}>
      <JournalClient posts={posts} initialCursor={nextCursor} />
    </SiteChrome>
  );
}
