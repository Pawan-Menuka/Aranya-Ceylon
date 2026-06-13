"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminBlogFull, BlogStatus } from "@/lib/api/admin-types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Local datetime-input value (yyyy-MM-ddThh:mm) from an ISO string.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Shared create/edit form. `initial` present → edit (PATCH); absent → create (POST).
export function BlogForm({ initial }: { initial?: AdminBlogFull }) {
  const router = useRouter();
  const editing = !!initial;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [status, setStatus] = useState<BlogStatus>(initial?.status ?? "DRAFT");
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(initial?.scheduledAt ?? null));
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDesc, setSeoDesc] = useState(initial?.seoDesc ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const submit = async () => {
    setError(null);
    if (!slug.match(/^[a-z0-9-]+$/)) return setError("Slug must be lowercase letters, numbers and hyphens only.");
    if (content.trim().length < 10) return setError("Content must be at least 10 characters.");
    if (status === "SCHEDULED" && !scheduledAt) return setError("Pick a date/time for a scheduled post.");

    const payload = {
      title,
      slug,
      content,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      status,
      ...(status === "SCHEDULED" && scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
      ...(seoTitle ? { seoTitle } : {}),
      ...(seoDesc ? { seoDesc } : {}),
    };

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/blogs/${initial!.id}` : "/api/admin/blogs", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      router.push("/admin/blog");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <label style={label}>Title</label>
      <input value={title} onChange={(e) => onTitle(e.target.value)} style={input} placeholder="True cinnamon, and why…" />

      <label style={label}>Slug</label>
      <input
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value);
        }}
        style={{ ...input, fontFamily: "var(--font-ui), sans-serif" }}
        placeholder="true-cinnamon"
      />
      <p style={hint}>Published at /journal/{slug || "your-slug"}</p>

      <label style={label}>Content (Markdown / MDX)</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={16}
        style={{ ...input, fontFamily: "var(--font-read), serif", lineHeight: 1.6, resize: "vertical" }}
        placeholder={"Opening paragraph…\n\n## A heading\n\n> A pull quote\n> — Attribution"}
      />

      <label style={label}>Tags (comma-separated — first tag is the category)</label>
      <input value={tags} onChange={(e) => setTags(e.target.value)} style={input} placeholder="Spice Notes, Heritage" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <label style={label}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as BlogStatus)} style={input}>
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
        {status === "SCHEDULED" && (
          <div>
            <label style={label}>Publish at</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={input} />
          </div>
        )}
      </div>

      <label style={label}>SEO title (optional)</label>
      <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={input} />

      <label style={label}>SEO description (optional)</label>
      <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} style={{ ...input, resize: "vertical" }} />

      {error && <p style={{ color: "#B23B3B", fontSize: 14, marginTop: 14 }}>{error}</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <button onClick={submit} disabled={saving} className="btn btn-intl" style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : editing ? "Save changes" : "Create post"}
        </button>
        <button
          onClick={() => router.push("/admin/blog")}
          disabled={saving}
          style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const label = { display: "block", fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", margin: "16px 0 6px" } as const;
const input = { width: "100%", fontFamily: "var(--font-ui), sans-serif", fontSize: 14.5, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" } as const;
const hint = { fontFamily: "var(--font-ui), sans-serif", fontSize: 12, color: "var(--muted)", margin: "5px 0 0" } as const;
