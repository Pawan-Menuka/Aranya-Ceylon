import type { Metadata } from "next";
import Link from "next/link";
import { getJournalPosts, journalCategories } from "@/lib/api/journal";
import { JournalGrid, CatTag } from "@/components/JournalGrid";
import type { JournalCardView } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "The Journal — Aranya Ceylon",
  description:
    "Sourcing stories, spice notes and recipes from the hill country — the people, the plants, and how to get the most from both.",
  openGraph: {
    title: "The Journal — Aranya Ceylon",
    description: "Notes from the forest: sourcing stories, spice notes and recipes from the hill country.",
    type: "website",
  },
};

export default async function JournalPage() {
  const { posts } = await getJournalPosts();
  // Spotlight a post tagged "featured", else the most recent (list is desc).
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = featured ? posts.filter((p) => p.slug !== featured.slug) : posts;
  const categories = journalCategories(posts);

  return (
    <div>
      {/* Forest header */}
      <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.5,
            background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)",
          }}
        />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 40px 56px", position: "relative", textAlign: "center" }}>
          <span className="eyebrow" style={{ color: "rgba(230,184,96,.9)" }}>
            The Journal
          </span>
          <h1
            className="disp"
            style={{ fontSize: "clamp(48px,6vw,84px)", lineHeight: 1.0, margin: "16px 0 14px", fontWeight: 600, letterSpacing: ".005em" }}
          >
            Notes from the forest
          </h1>
          <p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.8)", margin: "0 auto", maxWidth: 540 }}>
            Sourcing stories, spice notes and recipes from the hill country — the people, the plants, and how to get the
            most from both.
          </p>
        </div>
      </header>

      {featured && <FeaturedPost post={featured} />}

      <section style={{ background: "var(--bg)", padding: "48px 0 96px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 0" }}>
              <h3 className="disp" style={{ fontSize: 28, color: "var(--ink)", margin: 0 }}>
                No stories yet
              </h3>
              <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 15, color: "var(--muted)", marginTop: 8 }}>
                The first posts are on the way.
              </p>
            </div>
          ) : (
            <JournalGrid posts={rest} categories={categories} />
          )}
        </div>
      </section>
    </div>
  );
}

function FeaturedPost({ post }: { post: JournalCardView }) {
  return (
    <section style={{ background: "var(--bg)", padding: "64px 0 8px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <Link
          href={`/journal/${post.slug}`}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 44,
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              aspectRatio: "16 / 11",
              background: `linear-gradient(155deg, ${post.accent}33, ${post.accent}aa)`,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 18,
                left: 18,
                background: "rgba(253,250,245,.94)",
                borderRadius: 999,
                padding: "7px 14px",
              }}
            >
              <CatTag accent={post.accent}>Featured · {post.category}</CatTag>
            </span>
          </div>
          <div>
            <h2
              className="disp"
              style={{ fontSize: "clamp(30px,3.2vw,44px)", color: "var(--ink)", margin: "0 0 18px", lineHeight: 1.08, letterSpacing: ".005em" }}
            >
              {post.title}
            </h2>
            <p className="prose" style={{ fontSize: 18, color: "var(--muted)", margin: "0 0 22px" }}>
              {post.dek}
            </p>
            {post.date && (
              <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
                {post.date}
              </span>
            )}
            <div
              style={{
                marginTop: 24,
                fontFamily: "var(--font-ui), sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--brand)",
              }}
            >
              Read the story →
            </div>
          </div>
        </Link>
        <div style={{ height: 1, background: "var(--line)", margin: "60px 0 0" }} />
      </div>
    </section>
  );
}
