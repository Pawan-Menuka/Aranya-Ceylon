"use client";

import * as React from "react";
import type { CatalogSpice, Market } from "@/lib/types";
import { parsePrice } from "@/lib/catalog-data";
import { Eyebrow } from "../primitives/Motif";
import { CardB, CardCFinal } from "../cards/Cards";
import { useMarket } from "../MarketContext";
import { CatalogBanner, Dropdown, CategoryChips } from "./CatalogControls";

const SORTS: [string, string][] = [
  ["featured", "Featured"],
  ["best", "Best-selling"],
  ["price-asc", "Price: Low to High"],
  ["price-desc", "Price: High to Low"],
  ["rating", "Top-rated"],
  ["new", "Newest"],
];

interface Filters {
  form: string[];
  origin: string[];
  flavour: string[];
}

function deriveFacets(products: CatalogSpice[]) {
  const uniq = (arr: (string | undefined)[]) => [...new Set(arr.filter(Boolean) as string[])];
  return {
    category: uniq(products.map((p) => p.category)),
    form: uniq(products.map((p) => p.form)),
    origin: uniq(products.map((p) => p.origin)),
    flavour: uniq(products.flatMap((p) => p.flavour || [])),
  };
}

// Featured row (CardB) — shown only on the unfiltered default view.
function FeaturedRow({ products, market }: { products: CatalogSpice[]; market: Market }) {
  const feat = products.filter((p) => p.featured).slice(0, 3);
  if (!feat.length) return null;
  return (
    <section style={{ background: "var(--bg)", padding: "56px 0 12px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26 }}>
          <div>
            <Eyebrow color="var(--accent)">Curated this season</Eyebrow>
            <h2 className="disp" style={{ fontSize: 34, color: "var(--brand)", margin: "12px 0 0", lineHeight: 1.04 }}>From the forest floor</h2>
          </div>
        </div>
        <div className="feat-row">
          {feat.map((p) => <CardB key={p.name} spice={p} market={market} />)}
        </div>
      </div>
    </section>
  );
}

export function CatalogClient({
  products,
  initial,
}: {
  products: CatalogSpice[];
  initial?: { category?: string; sort?: string; form?: string[]; flavour?: string[]; origin?: string[] };
}) {
  const { market } = useMarket();
  const [category, setCategory] = React.useState(initial?.category || "All");
  const [filters, setFilters] = React.useState<Filters>({ form: initial?.form || [], origin: initial?.origin || [], flavour: initial?.flavour || [] });
  const [sort, setSort] = React.useState(initial?.sort || "featured");
  const [visible, setVisible] = React.useState(8);

  const facets = React.useMemo(() => deriveFacets(products), [products]);

  const toggleFacet = (key: keyof Filters) => (val: string) => {
    setFilters((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));
    setVisible(8);
  };
  const clearAll = () => {
    setCategory("All");
    setFilters({ form: [], origin: [], flavour: [] });
    setVisible(8);
  };

  const anyFilter = category !== "All" || filters.form.length > 0 || filters.origin.length > 0 || filters.flavour.length > 0;

  // Reflect state in the URL (shareable filtered views) without a navigation.
  React.useEffect(() => {
    const q = new URLSearchParams();
    if (category !== "All") q.set("cat", category);
    if (filters.form.length) q.set("form", filters.form.join(","));
    if (filters.flavour.length) q.set("flavour", filters.flavour.join(","));
    if (filters.origin.length) q.set("origin", filters.origin.join(","));
    if (sort !== "featured") q.set("sort", sort);
    const str = q.toString();
    window.history.replaceState(null, "", str ? `?${str}` : window.location.pathname);
  }, [category, filters, sort]);

  const filtered = React.useMemo(() => {
    const list = products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (filters.form.length && !filters.form.includes(p.form)) return false;
      if (filters.origin.length && !filters.origin.includes(p.origin)) return false;
      if (filters.flavour.length && !filters.flavour.some((f) => (p.flavour || []).includes(f))) return false;
      return true;
    });
    // Sort by the price the shopper is actually seeing, not always USD
    // (remaining-surfaces audit #9).
    const priceOf = (p: CatalogSpice) => parsePrice(market === "local" ? p.lkr : p.usd);
    const by: Record<string, (a: CatalogSpice, b: CatalogSpice) => number> = {
      featured: (a, b) => Number(b.featured) - Number(a.featured) || b.popularity - a.popularity,
      best: (a, b) => b.popularity - a.popularity,
      "price-asc": (a, b) => priceOf(a) - priceOf(b),
      "price-desc": (a, b) => priceOf(b) - priceOf(a),
      rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      new: (a, b) => b.added.localeCompare(a.added),
    };
    return [...list].sort(by[sort] || by.featured);
  }, [products, category, filters, sort, market]);

  const shown = filtered.slice(0, visible);
  const activePills: [keyof Filters, string][] = [
    ...filters.form.map((v) => ["form", v] as [keyof Filters, string]),
    ...filters.origin.map((v) => ["origin", v] as [keyof Filters, string]),
    ...filters.flavour.map((v) => ["flavour", v] as [keyof Filters, string]),
  ];
  const sortLabel = SORTS.find((s) => s[0] === sort)?.[1] || "Featured";

  return (
    <>
      <CatalogBanner />
      {!anyFilter && <FeaturedRow products={products} market={market} />}

      {/* sticky filter bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(253,250,245,.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 40px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <CategoryChips value={category} onChange={(c) => { setCategory(c); setVisible(8); }} categories={facets.category} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {facets.form.length > 0 && <Dropdown label="Form" options={facets.form} selected={filters.form} onToggle={toggleFacet("form")} />}
              {facets.origin.length > 0 && <Dropdown label="Origin" options={facets.origin} selected={filters.origin} onToggle={toggleFacet("origin")} />}
              {facets.flavour.length > 0 && <Dropdown label="Flavour" options={facets.flavour} selected={filters.flavour} onToggle={toggleFacet("flavour")} />}
              <span style={{ width: 1, height: 26, background: "var(--line)", margin: "0 2px" }} />
              <Dropdown label={"Sort: " + sortLabel} options={SORTS} selected={sort} onToggle={setSort} single align="right" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
              {filtered.length} {filtered.length === 1 ? "spice" : "spices"}
            </span>
            {activePills.length > 0 && <span style={{ width: 1, height: 16, background: "var(--line)" }} />}
            {activePills.map(([key, val]) => (
              <button key={key + val} onClick={() => toggleFacet(key)(val)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 999, padding: "5px 10px 5px 12px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
                {val}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            ))}
            {anyFilter && (
              <button onClick={clearAll} style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* grid */}
      <section style={{ background: "var(--bg)", padding: "40px 0 90px", minHeight: "60vh" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
          {shown.length === 0 ? (
            <div style={{ textAlign: "center", padding: "90px 0" }}>
              <h3 className="disp" style={{ fontSize: 30, color: "var(--ink)", margin: "0 0 10px" }}>Nothing matches those filters</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", margin: "0 0 22px" }}>Try loosening a facet or two.</p>
              <button className="btn btn-intl" style={{ width: "auto", padding: "12px 28px" }} onClick={clearAll}>Clear all filters</button>
            </div>
          ) : (
            <>
              <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
                {shown.map((p) => <CardCFinal key={p.name} spice={p} market={market} />)}
              </div>
              {visible < filtered.length && (
                <div style={{ textAlign: "center", marginTop: 48 }}>
                  <button onClick={() => setVisible((v) => v + 8)} className="btn btn-intl" style={{ width: "auto", padding: "14px 34px", background: "transparent", color: "var(--brand)", border: "1.5px solid var(--brand)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--brand)"; }}>
                    Load more — {filtered.length - visible} remaining
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
