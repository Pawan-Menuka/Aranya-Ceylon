"use client";

import * as React from "react";
import Link from "next/link";
import type { Post, PostBlock } from "@/lib/journal-data";
import { Reveal } from "../primitives/Reveal";
import { Liyawel, Eyebrow } from "../primitives/Motif";
import { ImageSlot } from "../primitives/ImageSlot";

// Article / single post (ported from article.jsx). Dark editorial hero +
// prose body + author + related. Body blocks come from the post's `body`
// (or a fallback supplied by the server).

function ArticleBody({ post, blocks }: { post: Post; blocks: PostBlock[] }) {
  return (
    <div>
      {blocks.map((b, i) => {
        if (b.t === "h") return <Reveal key={i} as="h2" className="disp" style={{ fontSize: "clamp(28px,3vw,38px)", color: "var(--brand)", margin: "44px 0 16px", lineHeight: 1.12, letterSpacing: ".005em" }}>{b.text}</Reveal>;
        if (b.t === "quote") return (
          <Reveal key={i} as="figure" style={{ margin: "44px 0", paddingLeft: 28, borderLeft: "3px solid var(--gold-line)" }}>
            <blockquote className="disp" style={{ fontSize: "clamp(24px,2.6vw,32px)", fontStyle: "italic", color: "var(--ink)", lineHeight: 1.3, margin: 0, fontWeight: 500 }}>&ldquo;{b.text}&rdquo;</blockquote>
            {b.by && <figcaption style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, marginTop: 14 }}>— {b.by}</figcaption>}
          </Reveal>
        );
        if (b.t === "img") return (
          <Reveal key={i} as="figure" style={{ margin: "40px 0" }}>
            <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "16 / 9", boxShadow: "var(--shadow-md)" }}>
              <ImageSlot id={b.id || post.slot + "-body-" + i} shape="rect" fit="cover" placeholder="Drop a supporting photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${post.accent}22, ${post.accent}66)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
            </div>
            {b.cap && <figcaption style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", marginTop: 12, textAlign: "center", fontStyle: "italic" }}>{b.cap}</figcaption>}
          </Reveal>
        );
        return <Reveal key={i} as="p" className="prose" style={{ fontSize: 18.5, color: "var(--ink)", margin: "0 0 22px" }} dangerouslySetInnerHTML={{ __html: b.text || "" }} />;
      })}
    </div>
  );
}

function AuthorBlock({ post }: { post: Post }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 56, padding: "24px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ width: 52, height: 52, borderRadius: 999, background: post.accent, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <span className="disp" style={{ color: "#fff", fontSize: 22, fontWeight: 600 }}>{post.author.charAt(0)}</span>
      </div>
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{post.author}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>{post.role || "Aranya Ceylon"} · {post.date}</div>
      </div>
    </div>
  );
}

function RelatedPosts({ related }: { related: Post[] }) {
  if (!related.length) return null;
  return (
    <section style={{ background: "var(--surface)", padding: "84px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <Reveal><Eyebrow>Keep reading</Eyebrow></Reveal>
        <Reveal delay={60}><h2 className="disp" style={{ fontSize: 34, color: "var(--brand)", margin: "14px 0 36px", lineHeight: 1.05 }}>More from the Journal</h2></Reveal>
        <div className="ar-rel">
          {related.map((p) => (
            <Link key={p.slug} href={"/journal/" + p.slug} style={{ textDecoration: "none" }}>
              <div style={{ position: "relative", borderRadius: 9, overflow: "hidden", aspectRatio: "3 / 2" }}>
                <ImageSlot id={p.slot} shape="rect" fit="cover" placeholder={`Drop a ${p.category.toLowerCase()} photo`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${p.accent}33, ${p.accent}aa)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: p.accent, margin: "16px 0 8px" }}>{p.category}</div>
              <h3 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: 0, lineHeight: 1.15 }}>{p.title}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ArticleClient({ post, blocks, related }: { post: Post; blocks: PostBlock[]; related: Post[] }) {
  return (
    <div data-screen-label="Article">
      <header data-hero style={{ position: "relative", minHeight: "78vh", background: "#161412", color: "#FDFAF5", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        <ImageSlot id={post.slot} shape="rect" fit="cover" placeholder={`Drop the ${post.category.toLowerCase()} hero photo`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${post.accent}40, rgba(11,16,13,.6))`, mixBlendMode: "multiply", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,6,.5) 0%, transparent 32%, transparent 46%, rgba(10,8,6,.84) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "0 40px 72px", width: "100%", textAlign: "center" }}>
          <Link href="/journal" style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#E6B860", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ width: 18, height: 1.5, background: "#E6B860" }} />{post.category}
          </Link>
          <h1 className="disp" style={{ fontSize: "clamp(34px,5vw,68px)", lineHeight: 1.04, margin: "0 0 22px", fontWeight: 600, letterSpacing: ".005em" }}>{post.title}</h1>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "rgba(253,250,245,.8)", fontWeight: 500 }}>
            {post.author}{post.role ? " · " + post.role : ""} &nbsp;·&nbsp; {post.date} &nbsp;·&nbsp; {post.readTime} read
          </div>
        </div>
      </header>

      <article style={{ background: "var(--bg)", padding: "72px 0 90px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 40px" }}>
          <p className="prose" style={{ fontSize: "clamp(20px,2.1vw,24px)", color: "var(--muted)", lineHeight: 1.5, margin: "0 0 14px", fontWeight: 500, fontStyle: "italic" }}>{post.dek}</p>
          <Liyawel width={170} style={{ margin: "30px 0 40px", justifyContent: "flex-start" }} />
          <ArticleBody post={post} blocks={blocks} />
          <AuthorBlock post={post} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>Share</span>
            <div style={{ display: "flex", gap: 10 }}>
              {["instagram", "facebook", "pinterest"].map((s) => (
                <span key={s} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid var(--line)", display: "grid", placeItems: "center" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 9, background: post.accent }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </article>

      <RelatedPosts related={related} />
    </div>
  );
}
