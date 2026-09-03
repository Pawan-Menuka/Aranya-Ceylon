"use client";

import * as React from "react";
import Link from "next/link";
import type { Post } from "@/lib/journal-data";
import { JOURNAL_CATEGORIES, toPost } from "@/lib/journal-data";
import { listBlog } from "@/lib/api/blog";
import { Reveal } from "../primitives/Reveal";
import { Liyawel, Eyebrow } from "../primitives/Motif";
import { Icon } from "../primitives/Icon";
import { ImageSlot } from "../primitives/ImageSlot";

// Journal index (ported from journal.jsx). Featured spotlight + category chips +
// 3-up grid. Cards link to /journal/[slug].

function PostImage({ post, ratio = "3 / 2", radius = 9 }: { post: Post; ratio?: string; radius?: number }) {
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", aspectRatio: ratio }}>
      <ImageSlot id={post.slot} shape="rect" fit="cover" placeholder={`Drop a ${post.category.toLowerCase()} photo`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${post.accent}33, ${post.accent}aa)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
    </div>
  );
}

function CatTag({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: accent, display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 16, height: 1.5, background: accent }} />{children}
    </span>
  );
}

function Meta({ post, color = "var(--muted)" }: { post: Post; color?: string }) {
  return (
    <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color, fontWeight: 500 }}>
      {post.author}{post.role ? " · " + post.role : ""} &nbsp;·&nbsp; {post.date} &nbsp;·&nbsp; {post.readTime} read
    </span>
  );
}

function FeaturedPost({ post }: { post: Post }) {
  const [h, setH] = React.useState(false);
  return (
    <section style={{ background: "var(--bg)", padding: "64px 0 8px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          <Link href={"/journal/" + post.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} className="jf-grid" style={{ textDecoration: "none" }}>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16 / 11", boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-md)", transition: "box-shadow .3s" }}>
              <PostImage post={post} ratio="16 / 11" radius={12} />
              <span style={{ position: "absolute", top: 18, left: 18, background: "rgba(253,250,245,.94)", borderRadius: 999, padding: "7px 14px" }}>
                <CatTag accent={post.accent}>Featured · {post.category}</CatTag>
              </span>
            </div>
            <div>
              <h2 className="disp" style={{ fontSize: "clamp(30px,3.2vw,44px)", color: "var(--ink)", margin: "0 0 18px", lineHeight: 1.08, letterSpacing: ".005em" }}>{post.title}</h2>
              <p className="prose" style={{ fontSize: 18, color: "var(--muted)", margin: "0 0 22px" }}>{post.dek}</p>
              <Meta post={post} />
              <div style={{ marginTop: 24, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                Read the story
                <span style={{ transform: h ? "translateX(4px)" : "none", transition: "transform .2s" }}><Icon name="chevron" size={15} stroke="var(--brand)" /></span>
              </div>
            </div>
          </Link>
        </Reveal>
        <div style={{ height: 1, background: "var(--line)", margin: "60px 0 0" }} />
      </div>
    </section>
  );
}

function PostCard({ post }: { post: Post }) {
  const [h, setH] = React.useState(false);
  return (
    <Link href={"/journal/" + post.slug} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: "flex", flexDirection: "column", textDecoration: "none" }}>
      <div style={{ boxShadow: h ? "var(--shadow-md)" : "none", borderRadius: 9, transition: "box-shadow .3s, transform .3s", transform: h ? "translateY(-3px)" : "none" }}>
        <PostImage post={post} />
      </div>
      <div style={{ paddingTop: 18 }}>
        <CatTag accent={post.accent}>{post.category}</CatTag>
        <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "12px 0 10px", lineHeight: 1.12, letterSpacing: ".005em" }}>{post.title}</h3>
        <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "0 0 16px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.dek}</p>
        <Meta post={post} />
      </div>
    </Link>
  );
}

function JournalChips({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
      {JOURNAL_CATEGORIES.map((c) => {
        const on = value === c;
        return (
          <button key={c} onClick={() => onChange(c)} style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: "9px 18px", borderRadius: 999, transition: "all .15s", border: on ? "1px solid var(--brand)" : "1px solid var(--line)", background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--ink)" }}>{c}</button>
        );
      })}
    </div>
  );
}

export function JournalClient({ posts: initialPosts, initialCursor }: { posts: Post[]; initialCursor: string | null }) {
  const [cat, setCat] = React.useState("All");
  const [posts, setPosts] = React.useState(initialPosts);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const featured = posts.find((p) => p.featured) || posts[0];
  const grid = React.useMemo(() => {
    if (cat === "All") return posts.filter((p) => p.slug !== featured.slug);
    return posts.filter((p) => p.category === cat);
  }, [cat, posts, featured]);

  // Posts beyond the first page were previously unreachable from /journal —
  // nextCursor was fetched but discarded (remaining-surfaces audit #19).
  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listBlog({ limit: 30, cursor });
      setPosts((prev) => [...prev, ...res.items.map(toPost)]);
      setCursor(res.nextCursor);
    } catch {
      /* leave cursor as-is; the button just stays available to retry */
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div data-screen-label="Journal">
      <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)" }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "132px 40px 56px", position: "relative", textAlign: "center" }}>
          <Reveal><Liyawel width={150} color="rgba(230,184,96,.55)" accent="rgba(230,184,96,.7)" style={{ marginBottom: 22 }} /></Reveal>
          <Reveal delay={60}><Eyebrow center light>The Journal</Eyebrow></Reveal>
          <Reveal delay={100}><h1 className="disp" style={{ fontSize: "clamp(48px,6vw,84px)", lineHeight: 1.0, margin: "16px 0 14px", fontWeight: 600, letterSpacing: ".005em" }}>Notes from the forest</h1></Reveal>
          <Reveal delay={150}><p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.8)", margin: "0 auto", maxWidth: 540 }}>Sourcing stories, spice notes and recipes from the hill country — the people, the plants, and how to get the most from both.</p></Reveal>
        </div>
      </header>
      {cat === "All" && <FeaturedPost post={featured} />}
      <section style={{ background: "var(--bg)", padding: "48px 0 96px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ marginBottom: 44 }}><JournalChips value={cat} onChange={setCat} /></div>
          {grid.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 0" }}>
              <h3 className="disp" style={{ fontSize: 28, color: "var(--ink)", margin: 0 }}>No posts in {cat} yet</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", marginTop: 8 }}>More stories are on the way.</p>
            </div>
          ) : (
            <div className="jg-grid">
              {grid.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          )}
          {cursor && (
            <div style={{ textAlign: "center", marginTop: 48 }}>
              <button onClick={loadMore} disabled={loadingMore} className="btn btn-intl" style={{ width: "auto", padding: "14px 34px", background: "transparent", color: "var(--brand)", border: "1.5px solid var(--brand)", opacity: loadingMore ? 0.6 : 1 }}
                onMouseEnter={(e) => { if (!loadingMore) { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--brand)"; }}>
                {loadingMore ? "Loading…" : "Load more stories"}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
