"use client";

import * as React from "react";
import { ADMIN, type AdminProduct } from "@/lib/admin-data";
import { AIcon, Pill, StockMeter, FlagRow } from "./AdminPrimitives";
import { ShareBar } from "./AdminCharts";
import { listAdminProducts, createAdminProduct, updateAdminProduct, archiveAdminProduct, listCategories, uploadProductImage, type Category, type AdminProductInput } from "@/lib/api/admin";
import { exportCsv } from "@/lib/csv";
import { DEMO_MODE } from "@/lib/demo";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import type { Product, Variant } from "@/lib/types";
import { paletteFor } from "@/lib/spice-data";

type VariantDraft = Omit<Variant, "price"> & { price: string };
type ProductRow = AdminProduct & {
  _backendId?: string;
  _variants?: VariantDraft[];
  _description?: string;
  _categoryId?: string;
};

// Matches the dashboard's Low Stock panel: flag a product the moment ANY of
// its variants is at/under the shared threshold, not when its total stock
// (summed across every variant) crosses a separate, category-based number —
// the two previously disagreed on the same inventory (Wave 3 #25). Demo rows
// carry no _variants, so they fall back to the aggregate figure.
function isLowStock(p: AdminProduct): boolean {
  const variants = (p as ProductRow)._variants;
  if (variants?.length) return variants.some((v) => Number(v.stock) <= LOW_STOCK_THRESHOLD);
  return p.stock <= LOW_STOCK_THRESHOLD;
}

function backendProductToAdmin(p: Product): ProductRow {
  const usdVariant = p.variants?.find((v) => v.currency === "USD") ?? p.variants?.[0];
  const lkrVariant = p.variants?.find((v) => v.currency === "LKR") ?? p.variants?.[0];
  const usdPrice = usdVariant ? `$${parseFloat(String(usdVariant.price)).toFixed(2)}` : "$0.00";
  const lkrPrice = lkrVariant ? `Rs ${Math.round(parseFloat(String(lkrVariant.price))).toLocaleString("en-US")}` : "Rs 0";
  const pal = paletteFor(p.slug);
  const weights = [...new Set((p.variants ?? []).map((v) => `${v.weight}g`))];
  const totalStock = (p.variants ?? []).reduce((s, v) => s + (v.stock ?? 0), 0);
  return {
    name: p.name,
    latin: p.latin ?? "",
    slug: p.slug,
    sku: p.variants?.[0]?.sku ?? p.id,
    category: p.category?.name ?? "Whole Spices",
    color: pal.color, base: pal.base, deep: pal.deep, surface: pal.surface,
    usd: usdPrice, lkr: lkrPrice,
    weights: weights.length ? weights : ["50g", "100g", "250g"],
    rating: p.ratingAvg ?? 0,
    reviews: p._count?.reviews ?? p.reviews?.length ?? 0,
    badge: totalStock > 0 ? "In Stock" : "Out of Stock",
    stock: totalStock,
    status: p.status === "ACTIVE" ? "Active" : p.status === "ARCHIVED" ? "Archived" : "Active",
    sold30: 0,
    visible: p.status !== "ARCHIVED",
    featured: p.featured ?? false,
    _backendId: p.id,
    _variants: (p.variants ?? []).map((v) => ({ ...v, price: String(v.price) })),
    _description: p.description,
    _categoryId: p.category?.id,
  };
}

// Price-string parsers (match the display format from backendProductToAdmin)
function parseUsd(s: string) { return parseFloat(s.replace(/[^0-9.]/g, "")) || 0; }
function parseLkr(s: string) { return parseFloat(s.replace(/[^0-9.,]/g, "").replace(/,/g, "")) || 0; }
function toSlug(name: string) { return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

function productIdentity(p: AdminProduct): string {
  return (p as ProductRow)._backendId ?? `local:${p.slug}`;
}

// Build the variant array required by createProductSchema from the editor UI values.
function buildVariants(p: AdminProduct): NonNullable<AdminProductInput["variants"]> {
  const usd = parseUsd(p.usd);
  const lkr = parseLkr(p.lkr);
  const weights = p.weights.length ? p.weights : ["100g"];
  const skuBase = (p.sku || toSlug(p.name)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "SKU";
  const perSlot = Math.max(0, Math.floor(p.stock / (weights.length * ((usd > 0 ? 1 : 0) + (lkr > 0 ? 1 : 0)) || 1)));
  return weights.flatMap((w) => {
    const grams = parseInt(w) || 100;
    const rows: NonNullable<AdminProductInput["variants"]> = [];
    if (usd > 0) rows.push({ sku: `${skuBase}${grams}U`, weight: grams, price: usd, currency: "USD", market: "INTERNATIONAL", stock: perSlot });
    if (lkr > 0) rows.push({ sku: `${skuBase}${grams}L`, weight: grams, price: lkr, currency: "LKR", market: "LOCAL", stock: perSlot });
    return rows;
  });
}

function draftVariants(p: ProductRow): VariantDraft[] {
  if (p._variants?.length) return p._variants.map((v) => ({ ...v }));
  return buildVariants(p).map((v) => ({ ...v, id: "", price: String(v.price) })) as VariantDraft[];
}

function variantsForApi(variants: VariantDraft[]): NonNullable<AdminProductInput["variants"]> {
  return variants.map((v) => ({
    ...(v.id ? { id: v.id } : {}),
    sku: v.sku.trim(),
    weight: Number(v.weight),
    price: Number(v.price),
    stock: Number(v.stock),
    market: v.market,
    currency: v.currency,
  }));
}

// Aranya Ceylon — ADMIN Products (ported from admin-products.jsx).
// List + create/edit drawer (stock, images, per-market pricing, flags).
// Writes are awaited and the returned backend product replaces local state.

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
            <th>Stock</th><th>Status</th><th>Visible</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={productIdentity(p)} onClick={() => onOpen(p)}>
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
              <td><StockMeter stock={p.stock} threshold={LOW_STOCK_THRESHOLD} low={isLowStock(p)} /></td>
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

function ProductEditor({
  product, onClose, onSave, onDelete, categories,
}: {
  product: EditDraft;
  onClose: () => void;
  onSave: (p: AdminProduct, extra: { description: string; categoryId: string; variants: VariantDraft[] }) => Promise<void>;
  onDelete: (p: AdminProduct) => Promise<void>;
  categories: Category[];
}) {
  const isNew = !product.sku;
  const [p, setP] = React.useState<AdminProduct>(() => ({
    name: "", latin: "", slug: "", sku: "", category: "Whole Spices", usd: "$0.00", lkr: "Rs 0",
    stock: 0, weights: ["50g", "100g", "250g"], status: "Active", visible: true, featured: false,
    badge: "In Stock", base: "#B57441", deep: "#7A451F", surface: "#F0E2D2", color: "#B57441",
    sold30: 0, rating: 0, reviews: 0,
    ...product,
  } as AdminProduct));
  const set = <K extends keyof AdminProduct>(k: K, v: AdminProduct[K]) => setP((x) => ({ ...x, [k]: v }));
  const productRow = product as ProductRow;
  const [description, setDescription] = React.useState<string>(productRow._description ?? "");
  const [categoryId, setCategoryId] = React.useState<string>(productRow._categoryId ?? "");
  const [variants, setVariants] = React.useState<VariantDraft[]>(() => draftVariants(p as ProductRow));
  const [slugTouched, setSlugTouched] = React.useState(!isNew);
  const [uploadedImages, setUploadedImages] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const backendId = (p as AdminProduct & { _backendId?: string })._backendId;

  React.useEffect(() => {
    if (categories.length > 0) {
      const match = categories.find((c) => c.name === p.category) ?? categories[0];
      setCategoryId(match.id);
    }
  }, [categories]);

  React.useEffect(() => {
    if (!slugTouched) setP((x) => ({ ...x, slug: toSlug(x.name) }));
  }, [p.name, slugTouched]);

  const handleUpload = async (file: File) => {
    if (!backendId) return;
    setUploading(true);
    try {
      const { images } = await uploadProductImage(backendId, file);
      setUploadedImages((prev) => [...prev, ...images.map((img) => img.url)]);
    } catch { setError("The image upload failed. Please try again."); } finally { setUploading(false); }
  };

  const updateVariant = <K extends keyof VariantDraft>(index: number, key: K, value: VariantDraft[K]) => {
    setVariants((current) => current.map((variant, i) => i === index ? { ...variant, [key]: value } : variant));
  };

  const addVariant = () => {
    const index = variants.length + 1;
    setVariants((current) => [...current, {
      id: "", sku: `${(p.sku || "SKU").toUpperCase()}-${index}`,
      weight: 100, price: "0.00", stock: 0, market: "INTERNATIONAL", currency: "USD",
    }]);
  };

  const submit = async () => {
    setError(null);
    if (!p.name.trim() || !p.slug.trim()) { setError("Product name and slug are required."); return; }
    if (description.trim().length < 10) { setError("Description must contain at least 10 characters."); return; }
    if (!categoryId) { setError("Choose a category before saving."); return; }
    if (!variants.length || variants.some((v) => !v.sku.trim() || !Number.isInteger(Number(v.weight)) || Number(v.weight) <= 0 || Number(v.price) <= 0 || !Number.isInteger(Number(v.stock)) || Number(v.stock) < 0)) {
      setError("Every variant needs a SKU, positive weight and price, and non-negative stock."); return;
    }
    if (variants.some((v) => (v.market === "LOCAL" && v.currency !== "LKR") || (v.market === "INTERNATIONAL" && v.currency === "LKR"))) {
      setError("Sri Lanka variants must use LKR, and international variants must use a non-LKR currency."); return;
    }
    setBusy(true);
    try { await onSave(p, { description, categoryId, variants }); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The product could not be saved."); }
    finally { setBusy(false); }
  };

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
                <div key={i} style={{ width: 96, height: 96, borderRadius: 12, flex: "0 0 auto", border: "1.5px solid var(--ad-line-2)", background: "var(--ad-soft)", display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {uploadedImages[i]
                    ? <img src={uploadedImages[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span className="swatch" style={{ width: 30, height: 30, background: `radial-gradient(70% 70% at 50% 35%, ${p.base}88, ${p.deep}88)`, opacity: 0.5 }} />
                  }
                </div>
              ))}
              <button
                style={{ width: 96, height: 96, borderRadius: 12, flex: "0 0 auto", border: "1.5px dashed var(--ad-line-2)", background: "#fff", display: "grid", placeItems: "center", cursor: backendId ? "pointer" : "not-allowed", opacity: backendId ? 1 : 0.5 }}
                onClick={() => !uploading && backendId && fileInputRef.current?.click()}
                title={backendId ? "Upload image" : "Save the product first to enable image upload"}
                disabled={uploading}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <AIcon name="image" size={20} stroke={uploading ? "var(--amber)" : "var(--ad-faint)"} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ad-faint)" }}>{uploading ? "…" : "Upload"}</span>
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { void handleUpload(f); e.target.value = ""; } }} />
            </div>
            <div className="ad-hint" style={{ marginTop: 8 }}>JPG or PNG, square, ≥1200px. First uploaded image is the cover.</div>
          </div>

          <hr className="ad-hr" />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ad-field"><label className="ad-label">Product name</label><input className="ad-input" value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Ceylon Cinnamon" /></div>
            <div className="ad-field"><label className="ad-label">URL slug</label><input className="ad-input" value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} placeholder="e.g. ceylon-cinnamon" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="ad-field"><label className="ad-label">Botanical name</label><input className="ad-input" value={p.latin} onChange={(e) => set("latin", e.target.value)} placeholder="Cinnamomum verum" /></div>
              <div className="ad-field"><label className="ad-label">SKU</label><input className="ad-input" value={p.sku} onChange={(e) => set("sku", e.target.value)} placeholder="AC-CIN" /></div>
            </div>
            <div className="ad-field">
              <label className="ad-label">Category</label>
              <select className="ad-select" value={categoryId} onChange={(e) => {
                setCategoryId(e.target.value);
                const cat = categories.find((c) => c.id === e.target.value);
                if (cat) set("category", cat.name);
              }}>
                {(categories.length > 0
                  ? categories
                  : [{ id: "", name: "Whole Spices" }, { id: "", name: "Ground & Powders" }, { id: "", name: "Gift Sets" }]
                ).map((c) => <option key={c.id || c.name} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="ad-field"><label className="ad-label">Description</label><textarea className="ad-textarea" placeholder="Long-form description shown on the product page…" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>

          <hr className="ad-hr" />

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="ad-label">Variants, pricing &amp; inventory</div>
              <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={addVariant}><AIcon name="plus" size={14} />Add variant</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {variants.map((variant, i) => (
                <div key={variant.id || `new-${i}`} style={{ display: "grid", gridTemplateColumns: "1.3fr .75fr 1fr .8fr auto", gap: 8, alignItems: "end", background: "var(--ad-soft)", borderRadius: 9, padding: "10px" }}>
                  <div className="ad-field"><label className="ad-label">SKU</label><input className="ad-input" value={variant.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)} /></div>
                  <div className="ad-field"><label className="ad-label">Weight (g)</label><input className="ad-input" type="number" min="1" value={variant.weight} onChange={(e) => updateVariant(i, "weight", Number(e.target.value))} /></div>
                  <div className="ad-field"><label className="ad-label">Price</label><input className="ad-input" type="number" min="0.01" step="0.01" value={variant.price} onChange={(e) => updateVariant(i, "price", e.target.value)} /></div>
                  <div className="ad-field"><label className="ad-label">Stock</label><input className="ad-input" type="number" min="0" step="1" value={variant.stock} onChange={(e) => updateVariant(i, "stock", Number(e.target.value))} /></div>
                  <button type="button" className="ad-iconbtn" title="Remove variant" disabled={variants.length === 1} onClick={() => setVariants((current) => current.filter((_, index) => index !== i))}><AIcon name="trash" size={14} stroke="var(--neg)" /></button>
                  <div className="ad-field" style={{ gridColumn: "1 / 3" }}><label className="ad-label">Market</label><select className="ad-select" value={variant.market} onChange={(e) => updateVariant(i, "market", e.target.value as VariantDraft["market"])}><option value="LOCAL">Sri Lanka</option><option value="INTERNATIONAL">International</option><option value="BOTH">Both</option></select></div>
                  <div className="ad-field" style={{ gridColumn: "3 / 5" }}><label className="ad-label">Currency</label><select className="ad-select" value={variant.currency} onChange={(e) => updateVariant(i, "currency", e.target.value as VariantDraft["currency"])}><option value="LKR">LKR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></div>
                </div>
              ))}
            </div>
          </div>

          <hr className="ad-hr" />

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FlagRow label="Visible in store" sub="Show on catalog & search" value={p.visible} onChange={(v) => set("visible", v)} />
            <FlagRow label="Featured product" sub="Eligible for homepage & curated rows" value={p.featured} onChange={(v) => set("featured", v)} />
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--ad-line)", display: "flex", gap: 10, background: "var(--ad-card)" }}>
          {!isNew && <button className="ad-btn ad-btn-danger ad-btn-sm" disabled={busy} title="Archive product" onClick={() => { if (window.confirm("Archive this product? It will be removed from the storefront.")) { setBusy(true); void onDelete(p).catch((archiveError) => setError(archiveError instanceof Error ? archiveError.message : "The product could not be archived.")).finally(() => setBusy(false)); } }}><AIcon name="trash" size={15} stroke="var(--neg)" /></button>}
          <button className="ad-btn ad-btn-ghost" style={{ marginLeft: "auto" }} onClick={onClose}>Cancel</button>
          <button className="ad-btn ad-btn-green" disabled={busy} onClick={() => { void submit(); }}><AIcon name="check" size={16} stroke="#fff" />{busy ? "Saving…" : isNew ? "Create product" : "Save changes"}</button>
        </div>
        {error && <div role="alert" style={{ padding: "0 24px 16px", color: "var(--neg)", background: "var(--ad-card)", fontSize: 13 }}>{error}</div>}
      </aside>
    </>
  );
}

export function AdminProducts() {
  // Demo rows only in demo mode (BUG-20).
  const [rows, setRows] = React.useState<AdminProduct[]>(() => DEMO_MODE ? ADMIN.PRODUCTS.map((p) => ({ ...p })) : []);
  const [tab, setTab] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [edit, setEdit] = React.useState<EditDraft | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    listAdminProducts().then(({ products }) => {
      setRows(products?.map(backendProductToAdmin) ?? []);
    }).catch(() => { /* fetch failed — keep whatever's there (demo only in demo mode) */ });
    listCategories().then(({ categories: cats }) => setCategories(cats)).catch(() => {});
  }, []);

  const filtered = React.useMemo(() => rows.filter((p) => {
    if (tab === "low") { if (!isLowStock(p)) return false; }
    else if (tab !== "all" && p.category !== tab) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.sku.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, tab, q]);

  const toggle = async (p: AdminProduct) => {
    const next = !p.visible;
    const backendId = (p as ProductRow)._backendId;
    const identity = productIdentity(p);
    setMessage(null);
    if (!backendId) {
      if (DEMO_MODE) setRows((prev) => prev.map((x) => productIdentity(x) === identity ? { ...x, visible: next } : x));
      return;
    }
    try {
      const { product } = await updateAdminProduct(backendId, { status: next ? "ACTIVE" : "ARCHIVED" });
      setRows((prev) => prev.map((x) => productIdentity(x) === identity ? backendProductToAdmin(product) : x));
    } catch {
      setMessage("The product visibility change failed. No local success state was applied.");
    }
  };
  const save = async (p: AdminProduct, extra: { description: string; categoryId: string; variants: VariantDraft[] }) => {
    const backendId = (p as ProductRow)._backendId;
    const slug = p.slug || toSlug(p.name);
    const desc = extra.description || p.latin || "Premium Ceylon spice.";
    const catId = extra.categoryId || categories[0]?.id || "";
    const variants = variantsForApi(extra.variants);
    setMessage(null);
    try {
      if (backendId) {
        const { product } = await updateAdminProduct(backendId, {
          name: p.name,
          slug,
          description: desc,
          categoryId: catId,
          featured: p.featured,
          latin: p.latin || null,
          status: p.visible ? "ACTIVE" : "ARCHIVED",
          variants,
        });
        setRows((prev) => prev.map((x) => productIdentity(x) === backendId ? backendProductToAdmin(product) : x));
      } else if (DEMO_MODE && !catId) {
        setRows((prev) => [{ ...p, slug, stock: variants.reduce((sum, v) => sum + (v.stock ?? 0), 0) }, ...prev]);
      } else {
        const { product } = await createAdminProduct({ name: p.name, slug, description: desc, categoryId: catId, featured: p.featured, status: p.visible ? "ACTIVE" : "DRAFT", latin: p.latin || null, variants });
        setRows((prev) => [backendProductToAdmin(product), ...prev.filter((row) => productIdentity(row) !== `local:${slug}`)]);
      }
      setEdit(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The product could not be saved. No local success state was applied.");
      throw error;
    }
  };

  const archive = async (p: AdminProduct) => {
    const backendId = (p as ProductRow)._backendId;
    setMessage(null);
    try {
      if (backendId) await archiveAdminProduct(backendId);
      setRows((prev) => prev.map((row) => productIdentity(row) === productIdentity(p) ? { ...row, visible: false, status: "Archived" } : row));
      setEdit(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The product could not be archived.");
      throw error;
    }
  };

  const lowCount = rows.filter(isLowStock).length;

  const exportProducts = () => {
    exportCsv(
      `products-${new Date().toISOString().slice(0, 10)}`,
      ["Name", "SKU", "Category", "Stock", "Visible"],
      filtered.map((p) => ({ name: p.name, sku: p.sku, category: p.category, stock: p.stock, visible: p.visible ? "Yes" : "No" })),
      ["name", "sku", "category", "stock", "visible"],
    );
  };

  return (
    <div>
      <div className="ad-pagehd">
        <div>
          <div className="ad-eyebrow">Catalog</div>
          <h1 className="ad-title" style={{ marginTop: 6 }}>Products</h1>
          <p className="ad-sub">{rows.length} products · <b style={{ color: "var(--neg)" }}>{lowCount} need restocking</b></p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={exportProducts}><AIcon name="download" size={15} stroke="var(--ad-muted)" />Export</button>
          <button className="ad-btn ad-btn-amber" onClick={() => setEdit({})}><AIcon name="plus" size={16} stroke="#fff" />New product</button>
        </div>
      </div>
      {message && <div role="alert" style={{ marginBottom: 16, padding: "10px 14px", border: "1px solid var(--ad-line)", borderRadius: 10, color: "var(--neg)", background: "var(--ad-card)" }}>{message}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="ad-seg">
          {PROD_TABS.map((t) => <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>{t.label}{t.key === "low" && lowCount > 0 && <span style={{ marginLeft: 6, color: "var(--neg)", fontWeight: 800 }}>{lowCount}</span>}</button>)}
        </div>
        <div className="ad-search" style={{ marginLeft: "auto", width: 240 }}>
          <AIcon name="search" size={15} stroke="var(--ad-faint)" />
          <input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <ProductsTable rows={filtered} onOpen={setEdit} onToggle={(product) => { void toggle(product); }} />
      {edit && <ProductEditor product={edit} onClose={() => setEdit(null)} onSave={save} onDelete={archive} categories={categories} />}
    </div>
  );
}
