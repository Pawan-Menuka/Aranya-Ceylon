"use client";

import * as React from "react";
import { ADMIN, type AdminBlogPost } from "@/lib/admin-data";
import { AIcon, Pill, FlagRow } from "./AdminPrimitives";
import { createBlog, updateBlog, getAdminBlog, listAdminBlogs, type BlogPublishMode, type AdminBlogPost as ApiBlogPost } from "@/lib/api/admin";
import { DEMO_MODE } from "@/lib/demo";

function backendBlogToAdmin(b: ApiBlogPost): AdminBlogPost {
  const statusMap: Record<string, string> = { DRAFT: "Draft", SCHEDULED: "Scheduled", PUBLISHED: "Published" };
  return {
    slug: b.slug,
    title: b.title,
    category: b.tags?.[0] ?? "Sourcing",
    author: "Admin",
    role: "Author",
    date: b.publishedAt ? new Date(b.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—",
    readTime: "5 min",
    accent: "#0F6E56",
    featured: false,
    status: statusMap[b.status] ?? b.status,
    views: b.viewCount ?? 0,
    scheduledFor: b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : undefined,
    _backendId: b.id,
  } as AdminBlogPost & { _backendId: string };
}

// Aranya Ceylon — ADMIN Blog (ported from admin-blog.jsx).
// List + editor drawer with scheduling. Publishing best-effort hits the ISR
// revalidate hook so /journal refreshes (spec §9).

const BLOG_TABS = [
  { key: "all", label: "All posts" },
  { key: "Published", label: "Published" },
  { key: "Scheduled", label: "Scheduled" },
  { key: "Draft", label: "Drafts" },
];

function BlogTable({ rows, onOpen }: { rows: AdminBlogPost[]; onOpen: (p: AdminBlogPost) => void }) {
  return (
    <div className="ad-card" style={{ overflow: "hidden" }}>
      <table className="ad-table">
        <thead>
          <tr><th>Post</th><th>Category</th><th>Author</th><th>Date</th><th className="num">Views</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.slug} onClick={() => onOpen(p)}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 420 }}>
                  <span style={{ width: 6, height: 38, borderRadius: 3, background: p.accent, flex: "0 0 auto" }} />
                  <div style={{ lineHeight: 1.35 }}>
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                      {p.featured && <AIcon name="star" size={12} stroke="none" fill="#BA7517" />}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ad-faint)" }}>{p.readTime} read · /{p.slug}</div>
                  </div>
                </div>
              </td>
              <td><span className="mkt" style={{ color: "var(--ad-muted)" }}>{p.category}</span></td>
              <td style={{ color: "var(--ad-muted)", whiteSpace: "nowrap" }}>{p.author}</td>
              <td style={{ color: "var(--ad-muted)", whiteSpace: "nowrap" }}>{p.status === "Scheduled" ? p.scheduledFor : p.date}</td>
              <td className="num tnum" style={{ color: "var(--ad-muted)" }}>{p.views ? p.views.toLocaleString() : "—"}</td>
              <td><Pill status={p.status.toLowerCase()} /></td>
              <td style={{ textAlign: "right" }}><AIcon name="chevronR" size={16} stroke="var(--ad-faint)" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type BlogDraft = Partial<AdminBlogPost>;

type BlogSavePayload = AdminBlogPost & { content?: string; seoDesc?: string; scheduledAt?: string };
function BlogEditor({ post, onClose, onSave }: { post: BlogDraft; onClose: () => void; onSave: (p: BlogSavePayload) => void }) {
  const isNew = !post.slug;
  const [p, setP] = React.useState<AdminBlogPost>(() => ({
    slug: "", title: "", category: "Sourcing", author: "Devika R.", role: "Head of Sourcing",
    status: "Draft", accent: "#1D9E75", readTime: "5 min", featured: false, date: "Jun 4, 2026", views: 0,
    ...post,
  } as AdminBlogPost));
  const [publishMode, setPublishMode] = React.useState<BlogPublishMode>(post.status === "Scheduled" ? "schedule" : post.status === "Published" ? "now" : "draft");
  // Body + excerpt are real, controlled fields now (previously uncontrolled
  // textareas whose text was discarded, so posts saved with empty content and
  // failed backend validation — BUG-09a).
  const [content, setContent] = React.useState("");
  const [excerpt, setExcerpt] = React.useState("");
  // Controlled schedule date/time — previously uncontrolled defaultValue inputs
  // whose values were never read, so scheduledAt was never sent and scheduled
  // posts could never publish (FLOW-03). Defaults to tomorrow 09:00.
  const [scheduleDate, setScheduleDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [scheduleTime, setScheduleTime] = React.useState("09:00");
  const set = <K extends keyof AdminBlogPost>(k: K, v: AdminBlogPost[K]) => setP((x) => ({ ...x, [k]: v }));
  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  // Load the full post (content + seo) when editing an existing row — the list
  // endpoint doesn't return content, so without this an edit would blank it out.
  const backendId = (post as BlogDraft & { _backendId?: string })._backendId;
  React.useEffect(() => {
    if (!backendId) return;
    let alive = true;
    getAdminBlog(backendId)
      .then(({ blog }) => {
        if (!alive) return;
        setContent(blog.content ?? "");
        setExcerpt(blog.seoDesc ?? "");
        if (blog.scheduledAt) {
          const d = new Date(blog.scheduledAt);
          const pad = (n: number) => String(n).padStart(2, "0");
          setScheduleDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          setScheduleTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      })
      .catch(() => { /* keep empty — offline/demo */ });
    return () => { alive = false; };
  }, [backendId]);

  return (
    <>
      <div className="ad-scrim" onClick={onClose} />
      <aside className="ad-drawer" style={{ width: "min(640px,96vw)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ad-line)", display: "flex", alignItems: "center", gap: 14, background: "var(--ad-card)" }}>
          <div style={{ flex: 1 }}>
            <div className="ad-eyebrow">{isNew ? "New post" : "Edit post"}</div>
            <h2 className="disp" style={{ fontSize: 24, color: "var(--ad-ink)", marginTop: 3 }}>{p.title || "Untitled post"}</h2>
          </div>
          <Pill status={p.status.toLowerCase()} />
          <button className="ad-iconbtn" onClick={onClose}><AIcon name="x" size={17} stroke="var(--ad-muted)" /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ height: 150, borderRadius: 12, background: `linear-gradient(135deg, ${p.accent} 0%, ${p.accent}aa 100%)`, position: "relative", overflow: "hidden", display: "grid", placeItems: "center" }}>
            <div className="grain" style={{ position: "absolute", inset: 0 }} />
            <span style={{ position: "absolute", left: 12, bottom: 10, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.7)", fontWeight: 700 }}>Cover image</span>
          </div>

          <div className="ad-field"><label className="ad-label">Title</label><input className="ad-input" value={p.title} onChange={(e) => set("title", e.target.value)} placeholder="A compelling headline…" /></div>
          <div className="ad-field"><label className="ad-label">Excerpt / dek</label><textarea className="ad-textarea" placeholder="One or two sentences that sell the read…" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="ad-field">
              <label className="ad-label">Category</label>
              <select className="ad-select" value={p.category} onChange={(e) => set("category", e.target.value)}>
                {["Sourcing", "Recipes", "Spice Notes", "Heritage"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="ad-field">
              <label className="ad-label">Author</label>
              <select className="ad-select" value={p.author} onChange={(e) => set("author", e.target.value)}>
                {["Devika R.", "Nuwan F.", "Aranya Kitchen", "Marcus L."].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="ad-field"><label className="ad-label">Body</label>
            <div style={{ border: "1px solid var(--ad-line-2)", borderRadius: 9, overflow: "hidden" }}>
              <textarea className="ad-textarea" style={{ border: 0, borderRadius: 0, minHeight: 160, fontFamily: "var(--font-read)", fontSize: 15 }} placeholder="Write the story…" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
          </div>

          <FlagRow label="Feature this post" sub="Pin to the journal hero & homepage spotlight" value={p.featured} onChange={(v) => set("featured", v)} />

          <hr className="ad-hr" />

          <div>
            <div className="ad-label" style={{ marginBottom: 10 }}>Publishing</div>
            <div className="ad-seg" style={{ width: "100%" }}>
              {([["draft", "Save draft"], ["schedule", "Schedule"], ["now", "Publish now"]] as [BlogPublishMode, string][]).map(([k, l]) => (
                <button key={k} className={publishMode === k ? "on" : ""} style={{ flex: 1 }} onClick={() => setPublishMode(k)}>{l}</button>
              ))}
            </div>
            {publishMode === "schedule" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div className="ad-field"><label className="ad-label">Date</label><input className="ad-input" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} /></div>
                <div className="ad-field"><label className="ad-label">Time</label><input className="ad-input" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} /></div>
                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ad-muted)", background: "rgba(94,117,135,.1)", padding: "10px 12px", borderRadius: 9 }}>
                  <AIcon name="clock" size={15} stroke="var(--slate)" />Goes live automatically at the date &amp; time above — the background job will publish and revalidate the page.
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--ad-line)", display: "flex", gap: 10, background: "var(--ad-card)" }}>
          {!isNew && <button className="ad-btn ad-btn-danger ad-btn-sm"><AIcon name="trash" size={15} stroke="var(--neg)" /></button>}
          <button className="ad-btn ad-btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn-green" onClick={() => {
            const scheduledAt = publishMode === "schedule" && scheduleDate
              ? new Date(`${scheduleDate}T${scheduleTime || "09:00"}`).toISOString()
              : undefined;
            onSave({ ...p, content, seoDesc: excerpt, scheduledAt, status: publishMode === "now" ? "Published" : publishMode === "schedule" ? "Scheduled" : "Draft" });
          }}>
            <AIcon name="check" size={16} stroke="#fff" />{publishMode === "now" ? "Publish" : publishMode === "schedule" ? "Schedule" : "Save draft"}
          </button>
        </div>
      </aside>
    </>
  );
}

export function AdminBlog() {
  // Demo rows only in demo mode (BUG-20).
  const [rows, setRows] = React.useState<AdminBlogPost[]>(() => DEMO_MODE ? ADMIN.BLOG.map((p) => ({ ...p })) : []);
  const [tab, setTab] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [edit, setEdit] = React.useState<BlogDraft | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    listAdminBlogs().then(({ blogs }) => {
      setRows(blogs?.map(backendBlogToAdmin) ?? []);
    }).catch(() => { /* fetch failed — keep whatever's there (demo only in demo mode) */ });
  }, []);

  const filtered = React.useMemo(() => rows.filter((p) => {
    if (tab !== "all" && p.status !== tab) return false;
    if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, tab, q]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    BLOG_TABS.forEach((t) => { c[t.key] = t.key === "all" ? rows.length : rows.filter((p) => p.status === t.key).length; });
    return c;
  }, [rows]);

  const save = (p: BlogSavePayload) => {
    const statusMap: Record<string, "DRAFT" | "SCHEDULED" | "PUBLISHED"> = { Draft: "DRAFT", Scheduled: "SCHEDULED", Published: "PUBLISHED" };
    const apiStatus = statusMap[p.status] ?? "DRAFT";
    const slug = p.slug || (p.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const backendId = (p as AdminBlogPost & { _backendId?: string })._backendId;
    const content = p.content ?? "";
    setSaveError(null);
    // Guard the min-length the backend enforces so a too-short body surfaces here
    // instead of being sent and silently rejected.
    if (content.trim().length < 10) {
      setSaveError("Add at least a short body (10+ characters) before saving.");
      return;
    }
    // A scheduled post must carry a scheduledAt or the cron job can never select
    // it (its predicate is scheduledAt <= now) — it would sit SCHEDULED forever (FLOW-03).
    if (apiStatus === "SCHEDULED" && !p.scheduledAt) {
      setSaveError("Pick a publish date and time for the scheduled post.");
      return;
    }
    setRows((prev) => {
      const exists = prev.find((x) => x.slug === p.slug);
      const blogPayload = { title: p.title, slug, content, status: apiStatus, tags: [p.category], ...(p.seoDesc ? { seoDesc: p.seoDesc } : {}), ...(p.scheduledAt ? { scheduledAt: p.scheduledAt } : {}) };
      if (exists && backendId) {
        updateBlog(backendId, blogPayload).catch(() => setSaveError("Couldn't save changes to the server. They may not be persisted."));
        return prev.map((x) => (x.slug === p.slug ? { ...x, ...p } : x));
      }
      createBlog(blogPayload).catch(() => setSaveError("Couldn't create the post on the server. It may not be persisted."));
      return exists ? prev.map((x) => (x.slug === p.slug ? { ...x, ...p } : x)) : [{ ...p, slug, views: 0, date: "Jun 4, 2026" }, ...prev];
    });
    setEdit(null);
  };

  return (
    <div>
      <div className="ad-pagehd">
        <div>
          <div className="ad-eyebrow">Content</div>
          <h1 className="ad-title" style={{ marginTop: 6 }}>Journal</h1>
          <p className="ad-sub">{counts.Published} published · {counts.Scheduled} scheduled · {counts.Draft} draft{counts.Draft !== 1 ? "s" : ""}</p>
        </div>
        <button className="ad-btn ad-btn-amber" onClick={() => setEdit({})}><AIcon name="plus" size={16} stroke="#fff" />Write post</button>
      </div>
      {saveError && (
        <div role="alert" style={{ margin: "0 0 16px", padding: "11px 14px", borderRadius: 9, background: "rgba(192,83,31,.1)", border: "1px solid rgba(192,83,31,.35)", color: "var(--neg, #C0531F)", fontSize: 13, fontWeight: 600, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} style={{ background: "none", border: 0, cursor: "pointer", color: "inherit", fontWeight: 700 }}>Dismiss</button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="ad-seg">
          {BLOG_TABS.map((t) => <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>{t.label}<span style={{ marginLeft: 6, opacity: 0.55 }}>{counts[t.key]}</span></button>)}
        </div>
        <div className="ad-search" style={{ marginLeft: "auto", width: 240 }}>
          <AIcon name="search" size={15} stroke="var(--ad-faint)" />
          <input placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <BlogTable rows={filtered} onOpen={setEdit} />
      {edit && <BlogEditor post={edit} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}
