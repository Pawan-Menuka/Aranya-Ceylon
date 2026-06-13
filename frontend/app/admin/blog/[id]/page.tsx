"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BlogForm } from "@/components/admin/BlogForm";
import type { AdminBlogFull } from "@/lib/api/admin-types";

export default function EditBlogPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<AdminBlogFull | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "notfound">("loading");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/blogs/${id}`, { cache: "no-store" });
        if (res.status === 404) return setState("notfound");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { blog: AdminBlogFull };
        setPost(data.blog);
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, [id]);

  return (
    <div>
      <nav style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        <Link href="/admin/blog" style={{ color: "var(--muted)" }}>Journal posts</Link>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>Edit</span>
      </nav>
      <h1 className="disp" style={{ fontSize: "clamp(26px,3vw,38px)", margin: "0 0 20px", color: "var(--ink)" }}>
        Edit post
      </h1>

      {state === "loading" && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      {state === "notfound" && <p style={{ color: "var(--muted)" }}>That post doesn’t exist.</p>}
      {state === "error" && <p style={{ color: "#B23B3B" }}>Couldn’t load this post.</p>}
      {state === "ready" && post && <BlogForm initial={post} />}
    </div>
  );
}
