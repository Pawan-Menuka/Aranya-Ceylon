"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import type {
  AdminProduct,
  AdminCategory,
  AdminProductImage,
  ProductVariantInput,
  VariantMarket,
  VariantCurrency,
} from "@/lib/api/admin-types";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type VariantRow = {
  weight: string;
  price: string;
  sku: string;
  stock: string;
  market: VariantMarket;
  currency: VariantCurrency;
};

const blankVariant = (): VariantRow => ({ weight: "", price: "", sku: "", stock: "0", market: "BOTH", currency: "LKR" });

export function ProductForm({ initial }: { initial?: AdminProduct }) {
  const router = useRouter();
  const editing = !!initial;

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [certifications, setCertifications] = useState((initial?.certifications ?? []).join(", "));
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [latin, setLatin] = useState(initial?.latin ?? "");
  const [originLabel, setOriginLabel] = useState(initial?.originLabel ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [variants, setVariants] = useState<VariantRow[]>(editing ? [] : [blankVariant()]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // images (edit mode only)
  const [images, setImages] = useState<AdminProductImage[]>(initial?.images ?? []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/categories", { cache: "no-store" });
        const data = (await res.json()) as { categories: AdminCategory[] };
        setCategories(data.categories ?? []);
        if (!editing && !categoryId && data.categories?.[0]) setCategoryId(data.categories[0].id);
      } catch {
        /* leave empty — submit will validate */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onName = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const setVariant = (i: number, patch: Partial<VariantRow>) =>
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError("Name is required.");
    if (!slug.match(/^[a-z0-9-]+$/)) return setError("Slug must be lowercase letters, numbers and hyphens only.");
    if (description.trim().length < 10) return setError("Description must be at least 10 characters.");
    if (!categoryId) return setError("Pick a category.");

    const certs = certifications.split(",").map((c) => c.trim()).filter(Boolean);
    const base = {
      name,
      slug,
      description,
      categoryId,
      certifications: certs,
      featured,
      latin: latin || null,
      originLabel: originLabel || null,
      color: color || null,
    };

    let payload: Record<string, unknown> = base;
    if (!editing) {
      const parsed: ProductVariantInput[] = [];
      for (const v of variants) {
        const weight = Number(v.weight);
        const price = Number(v.price);
        const stock = Number(v.stock);
        if (!weight || weight <= 0) return setError("Each variant needs a positive weight (grams).");
        if (!price || price <= 0) return setError("Each variant needs a positive price.");
        if (!v.sku.trim()) return setError("Each variant needs a SKU.");
        parsed.push({ weight, price, sku: v.sku.trim(), stock: Number.isFinite(stock) ? stock : 0, market: v.market, currency: v.currency });
      }
      if (!parsed.length) return setError("Add at least one variant.");
      payload = { ...base, variants: parsed };
    }

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/products/${initial!.id}` : "/api/admin/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <label style={label}>Name</label>
          <input value={name} onChange={(e) => onName(e.target.value)} style={input} placeholder="Ceylon Cinnamon Quills" />
        </div>
        <div>
          <label style={label}>Slug</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            style={input}
            placeholder="ceylon-cinnamon-quills"
          />
        </div>
      </div>

      <label style={label}>Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ ...input, resize: "vertical" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <label style={label}>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={input}>
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Certifications (comma-separated)</label>
          <input value={certifications} onChange={(e) => setCertifications(e.target.value)} style={input} placeholder="ORGANIC, CEYLON_GI" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        <div>
          <label style={label}>Latin name</label>
          <input value={latin} onChange={(e) => setLatin(e.target.value)} style={input} placeholder="Cinnamomum verum" />
        </div>
        <div>
          <label style={label}>Origin label</label>
          <input value={originLabel} onChange={(e) => setOriginLabel(e.target.value)} style={input} placeholder="Matale, Sri Lanka" />
        </div>
        <div>
          <label style={label}>Accent colour</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={color} onChange={(e) => setColor(e.target.value)} style={{ ...input, flex: 1 }} placeholder="#B5651D" />
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#B5651D"} onChange={(e) => setColor(e.target.value)} style={{ width: 42, height: 40, border: "1px solid var(--line)", borderRadius: 8, padding: 2, background: "#fff" }} aria-label="Pick colour" />
          </div>
        </div>
      </div>

      <label style={{ ...label, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Featured product
      </label>

      {/* Variants */}
      <h2 className="disp" style={{ fontSize: 22, margin: "28px 0 12px", color: "var(--ink)" }}>Variants</h2>
      {editing ? (
        <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "14px 16px", background: "var(--surface)" }}>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
            Variants and stock aren’t editable here yet (the update endpoint changes product details only). Listed for reference.
          </p>
          {(initial?.variants ?? []).map((v) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <span>{v.weight}g · {v.sku} · <span style={{ color: "var(--muted)" }}>{v.market} / {v.currency}</span></span>
              <span>{formatPrice(v.price, v.currency)} · {v.stock} in stock</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {variants.map((v, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "0.7fr 0.8fr 1fr 0.7fr 1fr 0.8fr auto", gap: 8, alignItems: "center" }}>
              <input value={v.weight} onChange={(e) => setVariant(i, { weight: e.target.value })} placeholder="100" inputMode="numeric" style={vInput} aria-label="Weight (g)" />
              <input value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} placeholder="Price" inputMode="decimal" style={vInput} aria-label="Price" />
              <input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} placeholder="SKU" style={vInput} aria-label="SKU" />
              <input value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} placeholder="Stock" inputMode="numeric" style={vInput} aria-label="Stock" />
              <select value={v.market} onChange={(e) => setVariant(i, { market: e.target.value as VariantMarket })} style={vInput} aria-label="Market">
                <option value="BOTH">Both markets</option>
                <option value="LOCAL">Local</option>
                <option value="INTERNATIONAL">International</option>
              </select>
              <select value={v.currency} onChange={(e) => setVariant(i, { currency: e.target.value as VariantCurrency })} style={vInput} aria-label="Currency">
                <option value="LKR">LKR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <button
                type="button"
                onClick={() => setVariants((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))}
                disabled={variants.length === 1}
                style={{ border: "none", background: "transparent", color: variants.length === 1 ? "var(--line)" : "#B23B3B", cursor: variants.length === 1 ? "default" : "pointer", fontSize: 18 }}
                aria-label="Remove variant"
              >
                ×
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 11, color: "var(--muted)" }}>
              Columns: weight (g) · price · SKU · stock · market · currency
            </span>
          </div>
          <button
            type="button"
            onClick={() => setVariants((rows) => [...rows, blankVariant()])}
            style={{ alignSelf: "flex-start", fontFamily: "var(--font-ui), sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--brand)", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", marginTop: 4 }}
          >
            + Add variant
          </button>
        </div>
      )}

      {/* Images (edit only — needs a saved product id) */}
      {editing && <ProductImages productId={initial!.id} images={images} onChange={setImages} />}

      {error && <p style={{ color: "#B23B3B", fontSize: 14, marginTop: 16 }}>{error}</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button onClick={submit} disabled={saving} className="btn btn-intl" style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
        </button>
        <button
          onClick={() => router.push("/admin/products")}
          disabled={saving}
          style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 18px", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ProductImages({ productId, images, onChange }: { productId: string; images: AdminProductImage[]; onChange: (imgs: AdminProductImage[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("images", f));
      const res = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body: form });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { images: AdminProductImage[] };
      onChange([...images, ...(data.images ?? [])]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginTop: 28 }}>
      <h2 className="disp" style={{ fontSize: 22, margin: "0 0 12px", color: "var(--ink)" }}>Images</h2>
      {images.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          {images
            .slice()
            .sort((a, b) => a.position - b.position)
            // eslint-disable-next-line @next/next/no-img-element
            .map((img) => <img key={img.id} src={img.url} alt="" style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />)}
        </div>
      )}
      <label
        style={{ display: "inline-block", fontFamily: "var(--font-ui), sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--brand)", border: "1px dashed var(--line)", borderRadius: 8, padding: "10px 16px", cursor: uploading ? "default" : "pointer" }}
      >
        {uploading ? "Uploading…" : "+ Upload images"}
        <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => void upload(e.target.files)} />
      </label>
      {err && <p style={{ color: "#B23B3B", fontSize: 13.5, marginTop: 8 }}>{err}</p>}
    </div>
  );
}

const label = { display: "block", fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, fontWeight: 600, color: "var(--muted)", margin: "16px 0 6px" } as const;
const input = { width: "100%", fontFamily: "var(--font-ui), sans-serif", fontSize: 14.5, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" } as const;
const vInput = { width: "100%", fontFamily: "var(--font-ui), sans-serif", fontSize: 13.5, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff" } as const;
