"use client";

import * as React from "react";
import { GIFTS } from "@/lib/gifts-data";
import { parsePrice } from "@/lib/catalog-data";
import { formatMoney } from "@/lib/money";
import { AIcon, Pill, FlagRow } from "./AdminPrimitives";
import {
  listAdminGifts, getAdminGift, createGift, updateGift, deleteGift,
  bestEffort, type AdminGiftSet, type AdminGiftInput,
} from "@/lib/api/admin";
import { DEMO_MODE } from "@/lib/demo";

const JAR_SIZES = ["50g", "100g", "250g"];
const BADGES = ["Bestselling gift", "New", "Limited"];

const TABS = [
  { key: "all", label: "All" },
  { key: "PUBLISHED", label: "Published" },
  { key: "DRAFT", label: "Drafts" },
];

function staticRows(): AdminGiftSet[] {
  return GIFTS.map((g, i) => ({
    id: `demo-${i}`,
    slug: g.id,
    name: g.name,
    featured: g.featured,
    badge: g.badge ?? null,
    // Demo GIFTS carry formatted strings ("$28.50"); parse to the numeric-string
    // shape the live API now returns so display + editing are consistent.
    usd: String(parsePrice(g.usd)),
    lkr: String(parsePrice(g.lkr)),
    jar: g.jar,
    status: "PUBLISHED",
    contents: g.contents,
    createdAt: new Date().toISOString(),
    tagline: g.tagline,
    blurb: g.blurb,
    color: g.color,
    base: g.base,
    deep: g.deep,
    surface: g.surface,
  }));
}

function ContentsPills({ contents }: { contents: string[] }) {
  const show = contents.slice(0, 3);
  const rest = contents.length - show.length;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {show.map((c) => (
        <span key={c} style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, background: "var(--ad-soft)", borderRadius: 999, padding: "3px 9px", color: "var(--ad-muted)", whiteSpace: "nowrap" }}>{c}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 11, color: "var(--ad-faint)" }}>+{rest}</span>}
    </div>
  );
}

function GiftTable({ rows, onOpen }: { rows: AdminGiftSet[]; onOpen: (g: AdminGiftSet) => void }) {
  return (
    <div className="ad-card" style={{ overflow: "hidden" }}>
      <table className="ad-table">
        <thead>
          <tr><th>Gift set</th><th>Contents</th><th>Price (USD / LKR)</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.id} onClick={() => onOpen(g)}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 300 }}>
                  <span style={{ width: 6, height: 38, borderRadius: 3, background: "var(--accent)", flex: "0 0 auto" }} />
                  <div style={{ lineHeight: 1.35 }}>
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                      {g.featured && <AIcon name="star" size={12} stroke="none" fill="#BA7517" />}
                      <span>{g.name}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ad-faint)", display: "flex", gap: 6, alignItems: "center" }}>
                      {g.badge && <span style={{ background: "#1A1A1A", color: "#fff", borderRadius: 999, padding: "2px 7px", fontSize: 10 }}>{g.badge}</span>}
                      <span>{g.jar} × {g.contents.length}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td><ContentsPills contents={g.contents} /></td>
              <td style={{ color: "var(--ad-muted)", whiteSpace: "nowrap", fontFamily: "var(--font-ui)", fontSize: 13 }}>
                {formatMoney(g.usd, "USD")} · {formatMoney(g.lkr, "LKR")}
              </td>
              <td><Pill status={g.status.toLowerCase()} /></td>
              <td style={{ textAlign: "right" }}><AIcon name="chevronR" size={16} stroke="var(--ad-faint)" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Draft = Partial<AdminGiftSet> & { _isNew?: boolean };

function GiftEditor({ gift, onClose, onSave, onDelete }: {
  gift: Draft;
  onClose: () => void;
  onSave: (g: AdminGiftInput & { id?: string }) => void;
  onDelete?: (id: string) => void;
}) {
  const isNew = gift._isNew ?? !gift.id;
  const [name, setName] = React.useState(gift.name ?? "");
  const [slug, setSlug] = React.useState(gift.slug ?? "");
  const [tagline, setTagline] = React.useState(gift.tagline ?? "");
  const [blurb, setBlurb] = React.useState(gift.blurb ?? "");
  const [badge, setBadge] = React.useState<string>(gift.badge ?? "");
  const [jar, setJar] = React.useState(gift.jar ?? "50g");
  const [usd, setUsd] = React.useState(gift.usd ?? "");
  const [lkr, setLkr] = React.useState(gift.lkr ?? "");
  const [contentsRaw, setContentsRaw] = React.useState((gift.contents ?? []).join(", "));
  const [featured, setFeatured] = React.useState(gift.featured ?? false);
  const [status, setStatus] = React.useState<"DRAFT" | "PUBLISHED">(
    (gift.status as "DRAFT" | "PUBLISHED") ?? "DRAFT"
  );
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (isNew) setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }, [name, isNew]);

  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const contents = contentsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  const handleSave = () => {
    onSave({
      id: gift.id,
      slug, name, tagline: tagline || name, blurb: blurb || name,
      badge: badge || null, jar, usd, lkr, contents, featured, status,
    });
  };

  return (
    <>
      <div className="ad-scrim" onClick={onClose} />
      <aside className="ad-drawer" style={{ width: "min(580px,96vw)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ad-line)", display: "flex", alignItems: "center", gap: 14, background: "var(--ad-card)" }}>
          <div style={{ flex: 1 }}>
            <div className="ad-eyebrow">{isNew ? "New gift set" : "Edit gift set"}</div>
            <h2 className="disp" style={{ fontSize: 22, color: "var(--ad-ink)", marginTop: 3 }}>{name || "Untitled set"}</h2>
          </div>
          <Pill status={status.toLowerCase()} />
          <button className="ad-iconbtn" onClick={onClose}><AIcon name="x" size={17} stroke="var(--ad-muted)" /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ad-field"><label className="ad-label">Name</label>
            <input className="ad-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Ceylon Classic" />
          </div>

          <div className="ad-field"><label className="ad-label">Slug</label>
            <input className="ad-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="classic" />
          </div>

          <div className="ad-field"><label className="ad-label">Tagline</label>
            <input className="ad-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-line description on cards" />
          </div>

          <div className="ad-field"><label className="ad-label">Blurb</label>
            <textarea className="ad-textarea" style={{ minHeight: 80 }} value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Longer description on the detail card…" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="ad-field"><label className="ad-label">Price (USD)</label>
              <input type="number" min="0" step="0.01" className="ad-input" value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="28.50" />
            </div>
            <div className="ad-field"><label className="ad-label">Price (LKR)</label>
              <input type="number" min="0" step="1" className="ad-input" value={lkr} onChange={(e) => setLkr(e.target.value)} placeholder="4250" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="ad-field"><label className="ad-label">Jar size</label>
              <select className="ad-select" value={jar} onChange={(e) => setJar(e.target.value)}>
                {JAR_SIZES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="ad-field"><label className="ad-label">Badge</label>
              <select className="ad-select" value={badge} onChange={(e) => setBadge(e.target.value)}>
                <option value="">None</option>
                {BADGES.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="ad-field"><label className="ad-label">Contents (comma-separated)</label>
            <textarea className="ad-textarea" style={{ minHeight: 70 }} value={contentsRaw} onChange={(e) => setContentsRaw(e.target.value)}
              placeholder="Ceylon Cinnamon Quills, Green Cardamom Pods, Whole Cloves, Black Peppercorns" />
            {contents.length > 0 && (
              <div style={{ marginTop: 8 }}><ContentsPills contents={contents} /></div>
            )}
          </div>

          <FlagRow label="Feature this set" sub="Show as the signature gift at the top of the page" value={featured} onChange={setFeatured} />

          <hr className="ad-hr" />

          <div>
            <div className="ad-label" style={{ marginBottom: 10 }}>Status</div>
            <div className="ad-seg" style={{ width: "100%" }}>
              <button className={status === "DRAFT" ? "on" : ""} style={{ flex: 1 }} onClick={() => setStatus("DRAFT")}>Save draft</button>
              <button className={status === "PUBLISHED" ? "on" : ""} style={{ flex: 1 }} onClick={() => setStatus("PUBLISHED")}>Publish</button>
            </div>
          </div>

          {!isNew && (
            <div style={{ marginTop: 8, padding: "14px 16px", background: "rgba(200,40,40,.06)", borderRadius: 10, border: "1px solid rgba(200,40,40,.14)" }}>
              <div style={{ fontSize: 13, color: "var(--ad-muted)", marginBottom: 10 }}>
                Deleting removes this gift set from the public page immediately.
              </div>
              {confirmDelete ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => gift.id && onDelete?.(gift.id)}>
                    <AIcon name="trash" size={14} stroke="var(--neg)" />Confirm delete
                  </button>
                  <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              ) : (
                <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setConfirmDelete(true)}>
                  <AIcon name="trash" size={14} stroke="var(--neg)" />Delete gift set
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--ad-line)", display: "flex", gap: 10, background: "var(--ad-card)" }}>
          <button className="ad-btn ad-btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn-green" onClick={handleSave}>
            <AIcon name="check" size={16} stroke="#fff" />{status === "PUBLISHED" ? "Publish" : "Save draft"}
          </button>
        </div>
      </aside>
    </>
  );
}

export function AdminGifts() {
  // Demo rows only in demo mode (BUG-20).
  const [rows, setRows] = React.useState<AdminGiftSet[]>(() => DEMO_MODE ? staticRows() : []);
  const [liveLoaded, setLiveLoaded] = React.useState(false);
  const [tab, setTab] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [edit, setEdit] = React.useState<Draft | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    listAdminGifts().then(({ gifts }) => {
      setRows(gifts ?? []); setLiveLoaded(true); // live responded — real data authoritative
    }).catch(() => { /* fetch failed — keep whatever's there (demo only in demo mode) */ });
  }, []);

  const filtered = React.useMemo(() => rows.filter((g) => {
    if (tab !== "all" && g.status !== tab) return false;
    if (q && !g.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, tab, q]);

  const counts = React.useMemo(() => ({
    all: rows.length,
    PUBLISHED: rows.filter((g) => g.status === "PUBLISHED").length,
    DRAFT: rows.filter((g) => g.status === "DRAFT").length,
  }), [rows]);

  const openGift = async (gift: AdminGiftSet) => {
    setMessage(null);
    if (gift.id.startsWith("demo-")) {
      setEdit(gift);
      return;
    }
    setMessage("Loading full gift-set details…");
    try {
      const { gift: detail } = await getAdminGift(gift.id);
      setEdit(detail);
      setMessage(null);
    } catch {
      setMessage("Could not load the full gift set. Editing is blocked to protect its existing copy.");
    }
  };

  const save = (input: AdminGiftInput & { id?: string }) => {
    const { id, ...body } = input;
    if (id && !id.startsWith("demo-")) {
      bestEffort(updateGift(id, body));
      setRows((prev) => prev.map((g) => g.id === id ? { ...g, ...body, status: body.status ?? g.status } : g));
    } else if (liveLoaded) {
      bestEffort(createGift(body).then(({ gift }) => {
        setRows((prev) => [gift, ...prev.filter((g) => !g.id.startsWith("demo-"))]);
      }));
    }
    setEdit(null);
  };

  const remove = (id: string) => {
    if (!id.startsWith("demo-")) bestEffort(deleteGift(id));
    setRows((prev) => prev.filter((g) => g.id !== id));
    setEdit(null);
  };

  return (
    <div>
      <div className="ad-pagehd">
        <div>
          <div className="ad-eyebrow">Content</div>
          <h1 className="ad-title" style={{ marginTop: 6 }}>Gift Sets</h1>
          <p className="ad-sub">{counts.PUBLISHED} published · {counts.DRAFT} draft{counts.DRAFT !== 1 ? "s" : ""}</p>
        </div>
        <button className="ad-btn ad-btn-amber" onClick={() => setEdit({ _isNew: true })}>
          <AIcon name="plus" size={16} stroke="#fff" />New gift set
        </button>
      </div>

      {message && <div role="status" style={{ marginBottom: 16, padding: "10px 14px", border: "1px solid var(--ad-line)", borderRadius: 10, color: "var(--ad-muted)", background: "var(--ad-card)" }}>{message}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="ad-seg">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              {t.label}<span style={{ marginLeft: 6, opacity: 0.55 }}>{counts[t.key as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
        <div className="ad-search" style={{ marginLeft: "auto", width: 240 }}>
          <AIcon name="search" size={15} stroke="var(--ad-faint)" />
          <input placeholder="Search gift sets…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <GiftTable rows={filtered} onOpen={(g) => { void openGift(g); }} />
      {edit && (
        <GiftEditor
          gift={edit}
          onClose={() => setEdit(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  );
}
