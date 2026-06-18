"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { JournalCardView } from "@/lib/api/types";

// Category chips + filtered post grid (ported from the prototype's JournalChips
// + PostCard). The full list is server-rendered into this client island; the
// chip filter is purely in-memory, so switching categories never refetches.
export function JournalGrid({
  posts,
  categories,
}: {
  posts: JournalCardView[];
  categories: string[];
}) {
  const [cat, setCat] = useState("All");
  const grid = useMemo(
    () => (cat === "All" ? posts : posts.filter((p) => p.category === cat)),
    [cat, posts],
  );

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginBottom: 44 }}>
        {categories.map((c) => {
          const on = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                fontFamily: "var(--font-ui), sans-serif",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
                padding: "9px 18px",
                borderRadius: 999,
                transition: "all .15s",
                border: on ? "1px solid var(--brand)" : "1px solid var(--line)",
                background: on ? "var(--brand)" : "#fff",
                color: on ? "#fff" : "var(--ink)",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {grid.length === 0 ? (
        <div style={{ textAlign: "center", padding: "70px 0" }}>
          <h3 className="disp" style={{ fontSize: 28, color: "var(--ink)", margin: 0 }}>
            No posts in {cat} yet
          </h3>
          <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 15, color: "var(--muted)", marginTop: 8 }}>
            More stories are on the way.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 40,
          }}
        >
          {grid.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </>
  );
}

function PostCard({ post }: { post: JournalCardView }) {
  return (
    <Link href={`/journal/${post.slug}`} style={{ display: "flex", flexDirection: "column", textDecoration: "none" }}>
      <div
        aria-hidden
        style={{
          aspectRatio: "3 / 2",
          borderRadius: 9,
          background: `linear-gradient(155deg, ${post.accent}33, ${post.accent}aa)`,
        }}
      />
      <div style={{ paddingTop: 18 }}>
        <CatTag accent={post.accent}>{post.category}</CatTag>
        <h3
          className="disp"
          style={{ fontSize: 25, color: "var(--ink)", margin: "12px 0 10px", lineHeight: 1.12, letterSpacing: ".005em" }}
        >
          {post.title}
        </h3>
        <p
          className="prose"
          style={{
            fontSize: 15.5,
            color: "var(--muted)",
            margin: "0 0 16px",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.dek}
        </p>
        {post.date && (
          <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
            {post.date}
          </span>
        )}
      </div>
    </Link>
  );
}

export function CatTag({ children, accent, onDark }: { children: React.ReactNode; accent: string; onDark?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-ui), sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: onDark ? "#fff" : accent,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      <span style={{ width: 16, height: 1.5, background: onDark ? "#E6B860" : accent }} />
      {children}
    </span>
  );
}
