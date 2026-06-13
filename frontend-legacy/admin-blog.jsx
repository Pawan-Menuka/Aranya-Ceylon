/* Aranya Ceylon — ADMIN Blog: list + editor drawer with scheduling.
   Depends on admin-shell.jsx + window.ADMIN. Exports AdminBlog. */
const { useState: blState, useMemo: blMemo, useEffect: blEffect } = React;

const BLOG_TABS = [
  { key: "all", label: "All posts" },
  { key: "Published", label: "Published" },
  { key: "Scheduled", label: "Scheduled" },
  { key: "Draft", label: "Drafts" },
];

function BlogTable({ rows, onOpen }) {
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

function BlogEditor({ post, onClose, onSave }) {
  const isNew = !post.slug;
  const [p, setP] = blState(() => ({ title: "", category: "Sourcing", author: "Devika R.", status: "Draft", accent: "#1D9E75", readTime: "5 min", featured: false, scheduledFor: "", ...post }));
  const [publishMode, setPublishMode] = blState(post.status === "Scheduled" ? "schedule" : post.status === "Published" ? "now" : "draft");
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  blEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

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
          {/* cover */}
          <div style={{ height: 150, borderRadius: 12, background: `linear-gradient(135deg, ${p.accent} 0%, ${p.accent}aa 100%)`, position: "relative", overflow: "hidden", display: "grid", placeItems: "center" }}>
            <div className="grain" style={{ position: "absolute", inset: 0 }} />
            <button className="ad-btn ad-btn-ghost ad-btn-sm" style={{ position: "relative", background: "rgba(255,255,255,.92)" }}><AIcon name="image" size={15} stroke="var(--ad-muted)" />Replace cover</button>
            <span style={{ position: "absolute", left: 12, bottom: 10, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.7)", fontWeight: 700 }}>Cover image</span>
          </div>

          <div className="ad-field"><label className="ad-label">Title</label><input className="ad-input" value={p.title} onChange={(e) => set("title", e.target.value)} placeholder="A compelling headline…" /></div>
          <div className="ad-field"><label className="ad-label">Excerpt / dek</label><textarea className="ad-textarea" placeholder="One or two sentences that sell the read…" defaultValue={isNew ? "" : "Once you've tasted a hand-rolled Ceylon quill dissolve to silk in warm milk, the hard cassia in most kitchens never tastes the same again."} /></div>

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
              <div style={{ display: "flex", gap: 2, padding: "7px 8px", borderBottom: "1px solid var(--ad-line)", background: "var(--ad-soft)" }}>
                {["B", "i", "H", "❝", "🔗", "▦"].map((b, i) => <button key={i} style={{ width: 30, height: 28, border: 0, background: "transparent", borderRadius: 6, cursor: "pointer", fontWeight: i === 0 ? 800 : 600, fontStyle: i === 1 ? "italic" : "normal", color: "var(--ad-muted)", fontSize: 13 }}>{b}</button>)}
              </div>
              <textarea className="ad-textarea" style={{ border: 0, borderRadius: 0, minHeight: 160, fontFamily: "var(--font-read)", fontSize: 15 }} placeholder="Write the story…" defaultValue={isNew ? "" : "There is a moment, the first time you steep a real Ceylon quill in hot milk, when you realise you have been lied to for years. The bark does not just flavour the milk — it perfumes it, honeyed and floral, with a whisper of clove and citrus underneath."} />
            </div>
          </div>

          <FlagRow label="Feature this post" sub="Pin to the journal hero & homepage spotlight" value={p.featured} onChange={(v) => set("featured", v)} />

          <hr className="ad-hr" />

          {/* publishing */}
          <div>
            <div className="ad-label" style={{ marginBottom: 10 }}>Publishing</div>
            <div className="ad-seg" style={{ width: "100%" }}>
              {[["draft", "Save draft"], ["schedule", "Schedule"], ["now", "Publish now"]].map(([k, l]) => (
                <button key={k} className={publishMode === k ? "on" : ""} style={{ flex: 1 }} onClick={() => setPublishMode(k)}>{l}</button>
              ))}
            </div>
            {publishMode === "schedule" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div className="ad-field"><label className="ad-label">Date</label><input className="ad-input" type="date" defaultValue="2026-06-09" /></div>
                <div className="ad-field"><label className="ad-label">Time</label><input className="ad-input" type="time" defaultValue="09:00" /></div>
                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ad-muted)", background: "rgba(94,117,135,.1)", padding: "10px 12px", borderRadius: 9 }}>
                  <AIcon name="clock" size={15} stroke="var(--slate)" />Goes live automatically on Jun 9, 2026 at 09:00 — the background job will publish and revalidate the page.
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--ad-line)", display: "flex", gap: 10, background: "var(--ad-card)" }}>
          {!isNew && <button className="ad-btn ad-btn-danger ad-btn-sm"><AIcon name="trash" size={15} stroke="var(--neg)" /></button>}
          <button className="ad-btn ad-btn-ghost ad-btn-sm"><AIcon name="external" size={15} stroke="var(--ad-muted)" />Preview</button>
          <button className="ad-btn ad-btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn-green" onClick={() => onSave({ ...p, status: publishMode === "now" ? "Published" : publishMode === "schedule" ? "Scheduled" : "Draft" })}>
            <AIcon name="check" size={16} stroke="#fff" />{publishMode === "now" ? "Publish" : publishMode === "schedule" ? "Schedule" : "Save draft"}
          </button>
        </div>
      </aside>
    </>
  );
}

function AdminBlog() {
  const [rows, setRows] = blState(() => window.ADMIN.BLOG.map((p) => ({ ...p })));
  const [tab, setTab] = blState("all");
  const [q, setQ] = blState("");
  const [edit, setEdit] = blState(null);

  const filtered = blMemo(() => rows.filter((p) => {
    if (tab !== "all" && p.status !== tab) return false;
    if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, tab, q]);

  const counts = blMemo(() => {
    const c = {};
    BLOG_TABS.forEach((t) => { c[t.key] = t.key === "all" ? rows.length : rows.filter((p) => p.status === t.key).length; });
    return c;
  }, [rows]);

  const save = (p) => {
    setRows((prev) => {
      const exists = prev.find((x) => x.slug === p.slug);
      const slug = p.slug || (p.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return exists ? prev.map((x) => x.slug === p.slug ? { ...x, ...p } : x) : [{ ...p, slug, views: 0, date: "Jun 4, 2026" }, ...prev];
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="ad-seg">
          {BLOG_TABS.map((t) => <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>{t.label}<span style={{ marginLeft: 6, opacity: .55 }}>{counts[t.key]}</span></button>)}
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

Object.assign(window, { AdminBlog });
