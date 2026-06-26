import type { Metadata } from "next";
import { jsonLdHtml } from "@/lib/json-ld";
import { notFound } from "next/navigation";
import { resolveMarket } from "@/lib/market";
import { getBlogPost } from "@/lib/api/blog";
import { JOURNAL, getPost, toPost, fallbackBody } from "@/lib/journal-data";
import { SiteChrome } from "@/components/SiteChrome";
import { ArticleClient } from "@/components/journal/ArticleClient";
import type { Post, PostBlock } from "@/lib/journal-data";

// Resolve a post by slug from the live blog API, else the demo journal.
async function resolvePost(slug: string): Promise<{ post: Post; blocks: PostBlock[]; related: Post[] } | null> {
  let post: Post | undefined;
  try {
    const { blog } = await getBlogPost(slug);
    if (blog) post = toPost(blog);
  } catch {
    /* fall through to demo */
  }
  if (!post) post = getPost(slug);
  if (!post) return null;
  const blocks = post.body && post.body.length ? post.body : fallbackBody(post);
  const related = JOURNAL.filter((p) => p.slug !== post!.slug).slice(0, 3);
  return { post, blocks, related };
}

export function generateStaticParams() {
  return JOURNAL.map((p) => ({ slug: p.slug }));
}

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
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

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const market = resolveMarket();
  const resolved = await resolvePost(params.slug);
  if (!resolved) notFound();
  const { post, blocks, related } = resolved;

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
      <ArticleClient post={post} blocks={blocks} related={related} />
    </SiteChrome>
  );
}
