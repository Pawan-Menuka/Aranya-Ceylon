"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AdminBlogListItem } from "@/lib/api/admin-types";

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: "var(--brand)",
  SCHEDULED: "var(--accent)",
  DRAFT: "var(--muted)",
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<AdminBlogListItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/admin/blogs", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { blogs: AdminBlogListItem[] };
      setPosts(data.blogs ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      alert("Couldn’t delete that post.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="disp" style={{ fontSize: "clamp(28px,3vw,40px)", margin: 0, color: "var(--ink)" }}>
          Journal posts
        </h1>
        <Link href="/admin/blog/new" className="btn btn-intl" style={{ textDecoration: "none" }}>
          New post
        </Link>
      </div>

      {state === "loading" && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {state === "error" && <p style={{ color: "#B23B3B" }}>Couldn’t load posts.</p>}
      {state === "ready" && posts.length === 0 && <p style={{ color: "var(--muted)" }}>No posts yet. Create your first one.</p>}

      {state === "ready" && posts.length > 0 && (
        <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-ui), sans-serif", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--surface)", textAlign: "left" }}>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Date</Th>
                <Th>Views</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const date = p.status === "SCHEDULED" ? p.scheduledAt : p.publishedAt;
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <Td>
                      <Link href={`/admin/blog/${p.id}`} style={{ color: "var(--brand)", fontWeight: 600, textDecoration: "none" }}>
                        {p.title}
                      </Link>
                      <div style={{ color: "var(--muted)", fontSize: 12.5 }}>/{p.slug}</div>
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: ".04em",
                          textTransform: "uppercase",
                          color: STATUS_COLOR[p.status] ?? "var(--muted)",
                          border: `1px solid ${STATUS_COLOR[p.status] ?? "var(--line)"}`,
                          borderRadius: 999,
                          padding: "3px 10px",
                        }}
                      >
                        {p.status}
                      </span>
                    </Td>
                    <Td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </Td>
                    <Td style={{ color: "var(--muted)" }}>{p.viewCount}</Td>
                    <Td>
                      <button
                        onClick={() => remove(p.id, p.title)}
                        disabled={busy === p.id}
                        style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13, fontWeight: 600, color: "#B23B3B", background: "transparent", border: "none", cursor: "pointer" }}
                      >
                        {busy === p.id ? "…" : "Delete"}
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "12px 16px", ...style }}>{children}</td>;
}
