import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJournalPost } from "@/lib/api/journal";
import { Mdx } from "@/components/Mdx";
import { CatTag } from "@/components/JournalGrid";
import type { JournalPostView } from "@/lib/api/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) return { title: "Story not found — Aranya Ceylon" };
  const desc = (post.seoDesc ?? post.dek).slice(0, 155);
  return {
    title: `${post.seoTitle ?? post.title} — Aranya Ceylon`,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
      type: "article",
      ...(post.publishedAt && { publishedTime: post.publishedAt }),
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) notFound();

  return (
    <main style={{ background: "var(--bg)", paddingBottom: 80 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(post)) }}
      />

      {/* Article header */}
      <header style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 8px", textAlign: "center" }}>
        <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
          <Link href="/journal" style={{ color: "var(--muted)" }}>
            The Journal
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>{post.category}</span>
        </nav>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <CatTag accent={post.accent}>{post.category}</CatTag>
        </div>
        <h1
          className="disp"
          style={{ fontSize: "clamp(34px,5vw,58px)", lineHeight: 1.08, margin: "0 0 18px", fontWeight: 600, color: "var(--ink)" }}
        >
          {post.title}
        </h1>
        <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13.5, color: "var(--muted)", fontWeight: 500 }}>
          {[post.date, `${post.readTime} read`].filter(Boolean).join(" · ")}
        </span>
      </header>

      {/* Accent rule */}
      <div style={{ maxWidth: 760, margin: "32px auto 0", padding: "0 24px" }}>
        <div aria-hidden style={{ height: 4, borderRadius: 2, background: post.accent, width: 64, margin: "0 auto" }} />
      </div>

      {/* Body */}
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 0" }}>
        <Mdx source={post.content} />
      </article>

      {/* Footer link */}
      <div style={{ maxWidth: 720, margin: "56px auto 0", padding: "32px 24px 0", borderTop: "1px solid var(--line)", textAlign: "center" }}>
        <Link
          href="/journal"
          style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, fontWeight: 700, color: "var(--brand)" }}
        >
          ← More from the Journal
        </Link>
      </div>
    </main>
  );
}

function buildJsonLd(p: JournalPostView) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.seoDesc ?? p.dek,
    ...(p.publishedAt && { datePublished: p.publishedAt }),
    articleSection: p.category,
    keywords: p.tags.join(", "),
    publisher: { "@type": "Organization", name: "Aranya Ceylon" },
  };
}
