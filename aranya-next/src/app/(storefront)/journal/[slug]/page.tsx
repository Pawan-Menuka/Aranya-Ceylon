import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { jsonLdHtml } from "@/lib/json-ld";
import { notFound } from "next/navigation";
import { resolveMarket } from "@/lib/market";
import { getBlogPost, listBlog } from "@/lib/api/blog";
import { rethrowReadFailure } from "@/lib/api/read-failure";
import { DEMO_MODE } from "@/lib/demo";
import { toPost, fallbackBody } from "@/lib/journal-data";
import { JOURNAL, getPost } from "@/lib/journal-demo";
import { SiteChrome } from "@/components/SiteChrome";
import { ArticleClient, RelatedPosts } from "@/components/journal/ArticleClient";
import type { Post, PostBlock } from "@/lib/journal-data";
import { sanitizeHtml } from "@/lib/sanitize";

// Resolve a post by slug from the live blog API, else the demo journal.
const resolvePost = cache(async (slug: string): Promise<{ post: Post; blocks: PostBlock[] } | null> => {
  let post: Post | undefined;
  try {
    const { blog } = await getBlogPost(slug);
    if (blog) post = toPost(blog);
  } catch (error) {
    rethrowReadFailure(error);
    if (!DEMO_MODE && (error as { status?: number }).status === 404) return null;
    /* fall through to demo */
  }
  if (!post) post = getPost(slug);
  if (!post) return null;
  const blocks = post.body && post.body.length ? post.body : fallbackBody(post);
  return { post, blocks };
});

async function RelatedContent({ post }: { post: Post }) {
  // Prefer real related posts (same category first) from the live catalog
  // over the fixed demo set, which previously showed on every article
  // regardless of source (remaining-surfaces audit #8).
  let related: Post[] = [];
  try {
    const { items } = await listBlog({ limit: 12 });
    const livePosts = items.map(toPost).filter((p) => p.slug !== post!.slug);
    if (livePosts.length) {
      const sameCategory = livePosts.filter((p) => p.category === post!.category);
      const rest = livePosts.filter((p) => p.category !== post!.category);
      related = [...sameCategory, ...rest].slice(0, 3);
    }
  } catch { /* optional related content may be omitted */ }
  if (!related.length && DEMO_MODE) related = JOURNAL.filter((p) => p.slug !== post.slug).slice(0, 3);
  if (!related.length) return null;

  return <RelatedPosts related={related} />;
}

export function generateStaticParams() {
  return JOURNAL.map((p) => ({ slug: p.slug }));
}

export const revalidate = 300;

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await paramsPromise;
  const resolved = await resolvePost(params.slug);
  if (!resolved) return { title: "Story not found" };
  const { post } = resolved;
  return {
    title: post.title,
    description: post.dek,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: { title: post.title, description: post.dek, type: "article" },
  };
}

export default async function ArticlePage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const market = await resolveMarket();
  const resolved = await resolvePost(params.slug);
  if (!resolved) notFound();
  const { post, blocks } = resolved;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.dek,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "Aranya Ceylon" },
    articleSection: post.category,
  };

  return (
    <SiteChrome initialMarket={market} hero>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <ArticleClient post={{ ...post, body: undefined }} blocks={blocks.map(block => ({ ...block,
        text: block.t === "p" ? undefined : block.text,
        html: block.t === "p" ? sanitizeHtml(block.text || "") : undefined,
      }))} related={
        <Suspense fallback={null}><RelatedContent post={post} /></Suspense>
      } />
    </SiteChrome>
  );
}
