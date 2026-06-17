"use client";

import * as React from "react";
import { ADMIN, type AdminProduct } from "@/lib/admin-data";
import { AIcon, Pill, StockMeter, FlagRow } from "./AdminPrimitives";
import { ShareBar } from "./AdminCharts";
import { listAdminProducts, createAdminProduct, updateAdminProduct, bestEffort } from "@/lib/api/admin";
import type { Product } from "@/lib/types";
import { paletteFor } from "@/lib/spice-data";

function backendProductToAdmin(p: Product): AdminProduct {
  const usdVariant = p.variants?.find((v) => v.currency === "USD") ?? p.variants?.[0];
  const lkrVariant = p.variants?.find((v) => v.currency === "LKR") ?? p.variants?.[0];
  const usdPrice = usdVariant ? `$${parseFloat(String(usdVariant.price)).toFixed(2)}` : "$0.00";
  const lkrPrice = lkrVariant ? `Rs ${Math.round(parseFloat(String(lkrVariant.price))).toLocaleString("en-US")}` : "Rs 0";
  const pal = paletteFor(p.slug);
  const weights = [...new Set((p.variants ?? []).map((v) => `${v.weight}g`))];
  const totalStock = (p.variants ?? []).reduce((s, v) => s + (v.stock ?? 0), 0);
  return {
    name: p.name,
    latin: p.description ?? "",
    slug: p.slug,
    sku: p.variants?.[0]?.sku ?? p.id,
    category: p.category?.name ?? "Whole Spices",
    color: pal.color, base: pal.base, deep: pal.deep, surface: pal.surface,
    usd: usdPrice, lkr: lkrPrice,
    weights: weights.length ? weights : ["50g", "100g", "250g"],
    rating: 4.8, reviews: 0,
    badge: totalStock > 0 ? "In Stock" : "Out of Stock",
    stock: totalStock,
    status: p.status === "ACTIVE" ? "Active" : p.status === "ARCHIVED" ? "Archived" : "Active",
    sold30: 0,
    visible: p.status !== "ARCHIVED",
    featured: p.featured ?? false,
    _backendId: p.id,
  } as AdminProduct & { _backendId: string };
}

// Aranya Ceylon — ADMIN Products (ported from admin-products.jsx).
// List + create/edit drawer (stock, images, per-market pricing, flags).
// Writes are optimistic local state, best-effort synced to /admin/products.

const PROD_TABS = [
  { key: "all", label: "All" },
  { key: "Whole Spices", label: "Whole" },
  { key: "Ground & Powders", label: "Ground" },
  { key: "Gift Sets", label: "Gift Sets" },
  { key: "low", label: "Needs restock" },
];

function ProductsTable({ rows, onOpen, onToggle }: {
  rows: AdminProduct[]; onOpen: (p: AdminProduct) => void; onToggle: (p: AdminProduct) => void;
}) {
  return (
    <div className="ad-card" style={{ overflow: "hidden" }}>
      <table className="ad-table">
        <thead>
          <tr>
            <th>Product</th><th>SKU</th><th>Category</th><th className="num">Price</th>
            <th>Stock</th><th className="num">Sold 30d</th><th>Status</th><th>Visible</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.sku} onClick={() => onOpen(p)}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="swatch" style={{ width: 40, height: 40, background: `radial-gradient(70% 70% at 50% 35%, ${p.base}, ${p.deep})` }} />
                  <div style={{ lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>{p.name}{p.featured && <AIcon name="star" size={12} stroke="none" fill="#BA7517" />}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ad-faint)", fontStyle: "italic" }}>{p.latin}</div>
                  </div>
                </div>
              </td>
              <td style={{ color: "var(--ad-muted)", fontSize: 12.5 }}>{p.sku}</td>
              <td><span className="mkt" style={{ color: "var(--ad-muted)" }}>{p.category}</span></td>
              <td className="num">
                <div style={{ fontWeight: 700 }}>{p.usd}</div>
                <div style={{ fontSize: 11.5, color: "var(--ad-faint)" }}>{p.lkr}</div>
              </td>
              <td><StockMeter stock={p.stock} threshold={p.category === "Gift Sets" ? 10 : 25} /></td>
              <td className="num tnum" style={{ color: "var(--ad-muted)" }}>{p.sold30.toLocaleString()}</td>
              <td><Pill status={p.status === "Active" ? "active" : p.status === "Low stock" ? "low" : "out"} /></td>
              <td onClick={(e) => { e.stopPropagation(); onToggle(p); }}>
                <span className={"ad-toggle" + (p.visible ? " on" : "")} />
              </td>
              <td style={{ textAlign: "right" }}><AIcon name="chevronR" size={16} stroke="var(--ad-faint)" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type EditDraft = Partial<AdminProduct>;

function ProductEditor({ product, onClose, onSave }: { product: EditDraft; onClose: () => void; onSave: (p: AdminProduct) => void }) {
  const isNew = !product.sku;
  const [p, setP] = React.useState<AdminProduct>(() => ({
    name: "", latin: "", slug: "", sku: "", category: "Whole Spices", usd: "$0.00", lkr: "Rs 0",
    stock: 0, weights: ["50g", "100g", "250g"], status: "Active", visible: true, featured: false,
    badge: "In Stock", base: "#B57441", deep: "#7A451F", surface: "#F0E2D2", color: "#B57441",
    sold30: 0, rating: 0, reviews: 0,
    ...product,
  } as AdminProduct));
  const set = <K extends keyof AdminProduct>(k: K, v: AdminProduct[K]) => setP((x) => ({ ...x, [k]: v }));
  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <>
      <div className="ad-scrim" onClick={onClose} />
      <aside className="ad-drawer">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--ad-line)", display: "flex", alignItems: "center", gap: 14, background: "var(--ad-card)" }}>
          <div style={{ flex: 1 }}>
            <div className="ad-eyebrow">{isNew ? "New product" : "Edit product"}</div>
            <h2 className="disp" style={{ fontSize: 25, color: "var(--ad-ink)", marginTop: 3 }}>{p.name || "Untitled spice"}</h2>
          </div>
          <button className="ad-iconbtn" onClick={onClose}><AIcon name="x" size={17} stroke="var(--ad-muted)" /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div className="ad-label" style={{ marginBottom: 8 }}>Product photography</div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 96, height: 96, borderRadius: 12, overflow: "hidden", flex: "0 0 auto", position: "relative", background: `radial-gradient(70% 70% at 50% 35%, ${p.base}, ${p.deep})`, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}>
                <span style={{ position: "absolute", left: 7, bottom: 6, fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.6)", fontWeight: 700 }}>Cover</span>
              </div>
              {[0, 1].map((i) => (
                <div key={i} style={{ width: 96, height: 96, borderRadius: 12, flex: "0 0 auto", border: "1.5px solid var(--ad-line-2)", background: "var(--ad-soft)", display: "grid", placeItems: "center" }}>
                  <span className="swatch" style={{ width: 30, height: 30, background: `radial-gradient(70% 70% at 50% 35%, ${p.base}88, ${p.deep}88)`, opacity: 0.5 }} />
                </div>
              ))}
              <button style={{ width: 96, height: 96, borderRadius: 12, flex: "0 0 auto", border: "1.5px dashed var(--ad-line-2)", background: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <AIcon name="image" size={20} stroke="var(--ad-faint)" />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ad-faint)" }}>Upload</span>
                </div>
              </button>
            </div>
            <div className="ad-hint" style={{ marginTop: 8 }}>JPG or PNG, square, ≥1200px. Drag to reorder; first image is the cover.</div>
          </div>

          <hr className="ad-hr" />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ad-field"><label className="ad-label">Product name</label><input className="ad-input" value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Ceylon Cinnamon" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="ad-field"><label className="ad-label">Botanical name</label><input className="ad-input" value={p.latin} onChange={(e) => set("latin", e.target.value)} placeholder="Cinnamomum verum" /></div>
              <div className="ad-field"><label className="ad-label">SKU</label><input className="ad-input" value={p.sku} onChange={(e) => set("sku", e.target.value)} placeholder="AC-CIN" /></div>
            </div>
            <div className="ad-field">
              <label className="ad-label">Category</label>
              <select className="ad-select" value={p.category} onChange={(e) => set("category", e.target.value)}>
                {["Whole Spices", "Ground & Powders", "Gift Sets"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="ad-field"><label className="ad-label">Description</label><textarea className="ad-textarea" placeholder="Long-form description shown on the product page…" defaultValue={isNew ? "" : "Hand-rolled true cinnamon from the hill forests above Matale — pale, paper-thin quills that dissolve to silk, honeyed and floral with a whisper of clove."} /></div>
          </div>

          <hr className="ad-hr" />

          <div>
            <div className="ad-label" style={{ marginBottom: 10 }}>Pricing by market</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="ad-field">
                <label className="ad-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="mkt intl">USD</span> International</label>
                <input className="ad-input" value={p.usd} onChange={(e) => set("usd", e.target.value)} />
              </div>
              <div className="ad-field">
                <label className="ad-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="mkt local">LKR</span> Sri Lanka</label>
                <input className="ad-input" value={p.lkr} onChange={(e) => set("lkr", e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <div className="ad-label" style={{ marginBottom: 10 }}>Weights & inventory</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(p.weights || []).map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--ad-soft)", borderRadius: 9, padding: "8px 12px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, width: 60 }}>{w}</span>
                  <span style={{ fontSize: 12, color: "var(--ad-faint)" }}>in stock</span>
                  <input className="ad-input" defaultValue={Math.round(p.stock / (p.weights.length || 1)) + i * 3} style={{ width: 80, marginLeft: "auto", padding: "7px 10px", textAlign: "right" }} />
                </div>
              ))}
              <button className="ad-btn ad-btn-ghost ad-btn-sm" style={{ alignSelf: "flex-start" }}><AIcon name="plus" size={14} stroke="var(--ad-muted)" />Add weight</button>
            </div>
          </div>

          <hr className="ad-hr" />

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FlagRow label="Visible in store" sub="Show on catalog & search" value={p.visible} onChange={(v) => set("visible", v)} />
            <FlagRow label="Featured product" sub="Eligible for homepage & curated rows" value={p.featured} onChange={(v) => set("featured", v)} />
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--ad-line)", display: "flex", gap: 10, background: "var(--ad-card)" }}>
          {!isNew && <button className="ad-btn ad-btn-danger ad-btn-sm"><AIcon name="trash" size={15} stroke="var(--neg)" /></button>}
          <button className="ad-btn ad-btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn-green" onClick={() => onSave(p)}><AIcon name="check" size={16} stroke="#fff" />{isNew ? "Create product" : "Save changes"}</button>
        </div>
      </aside>
    </>
  );
}

export function AdminProducts() {
  const [rows, setRows] = React.useState<AdminProduct[]>(() => ADMIN.PRODUCTS.map((p) => ({ ...p })));
  const [tab, setTab] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [edit, setEdit] = React.useState<EditDraft | null>(null);

  React.useEffect(() => {
    listAdminProducts().then(({ products }) => {
      if (products?.length) setRows(products.map(backendProductToAdmin));
    }).catch(() => { /* keep demo data */ });
  }, []);

  const filtered = React.useMemo(() => rows.filter((p) => {
    if (tab === "low") { if (p.stock >= (p.category === "Gift Sets" ? 10 : 25)) return false; }
    else if (tab !== "all" && p.category !== tab) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.sku.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, tab, q]);

  const toggle = (p: AdminProduct) => {
    const next = !p.visible;
    const backendId = (p as AdminProduct & { _backendId?: string })._backendId;
    setRows((prev) => prev.map((x) => (x.sku === p.sku ? { ...x, visible: next } : x)));
    if (backendId) bestEffort(updateAdminProduct(backendId, { status: next ? "ACTIVE" : "ARCHIVED" }));
  };
  const save = (p: AdminProduct) => {
    const backendId = (p as AdminProduct & { _backendId?: string })._backendId;
    setRows((prev) => {
      const exists = prev.find((x) => x.sku === p.sku);
      if (exists && backendId) {
        bestEffort(updateAdminProduct(backendId, { name: p.name, featured: p.featured }));
        return prev.map((x) => (x.sku === p.sku ? { ...x, ...p } : x));
      }
      bestEffort(createAdminProduct({ name: p.name, description: p.latin, featured: p.featured }));
      return [{ ...p }, ...prev];
    });
    setEdit(null);
  };

  const lowCount = rows.filter((p) => p.stock < (p.category === "Gift Sets" ? 10 : 25)).length;

  return (
    <div>
      <div className="ad-pagehd">
        <div>
          <div className="ad-eyebrow">Catalog</div>
          <h1 className="ad-title" style={{ marginTop: 6 }}>Products</h1>
          <p className="ad-sub">{rows.length} products · <b style={{ color: "var(--neg)" }}>{lowCount} need restocking</b></p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ad-btn ad-btn-ghost ad-btn-sm"><AIcon name="download" size={15} stroke="var(--ad-muted)" />Export</button>
          <button className="ad-btn ad-btn-amber" onClick={() => setEdit({})}><AIcon name="plus" size={16} stroke="#fff" />New product</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="ad-seg">
          {PROD_TABS.map((t) => <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>{t.label}{t.key === "low" && lowCount > 0 && <span style={{ marginLeft: 6, color: "var(--neg)", fontWeight: 800 }}>{lowCount}</span>}</button>)}
        </div>
        <div className="ad-search" style={{ marginLeft: "auto", width: 240 }}>
          <AIcon name="search" size={15} stroke="var(--ad-faint)" />
          <input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <ProductsTable rows={filtered} onOpen={setEdit} onToggle={toggle} />
      {edit && <ProductEditor product={edit} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}
