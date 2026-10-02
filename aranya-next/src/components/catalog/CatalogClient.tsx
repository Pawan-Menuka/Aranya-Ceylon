"use client";

import * as React from "react";
import type { CatalogPage, CatalogSpice, Market } from "@/lib/types";
import { listProductCards } from "@/lib/api/products";
import { adaptCatalogPage, cardQuery, catalogParams, catalogQuery, catalogScope, CatalogPager, type CatalogQuery } from "@/lib/catalog-pagination";
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

// Featured row (CardB) â€” shown only on the unfiltered default view.
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
          {feat.map((p) => <CardB key={p.productId || p.slug || p.name} spice={p} market={market} />)}
        </div>
      </div>
    </section>
  );
}

export function CatalogClient({
  initialPage,
  initial,
  initialMarket,
}: {
  initialPage: CatalogPage;
  initial: CatalogQuery;
  initialMarket: Market;
}) {
  const { market } = useMarket();
  const [query, setQuery] = React.useState(initial);
  const { category, sort, form, origin, flavour } = query;
  const filters = { form, origin, flavour };
  const scope = catalogScope(query, market);
  const serverScope = catalogScope(initial, initialMarket);
  const previousServerScope = React.useRef(serverScope);
  React.useEffect(() => {
    if (previousServerScope.current !== serverScope) {
      previousServerScope.current = serverScope;
      setQuery(initial);
    }
  }, [serverScope, initial]);
  const [pager] = React.useState(() => new CatalogPager(async (key, cursor, signal) => {
    const split = key.indexOf(":");
    const requestMarket = key.slice(0, split) as Market;
    const requestQuery = catalogQuery(Object.fromEntries(new URLSearchParams(key.slice(split + 1))));
    if (initialPage.demo) {
      const { demoCatalogPage } = await import("@/lib/catalog-demo");
      return demoCatalogPage(requestQuery, requestMarket, cursor);
    }
    return adaptCatalogPage(await listProductCards(cardQuery(requestQuery, cursor), { signal }), requestMarket);
  }, serverScope, initialPage));
  const [snapshot, setSnapshot] = React.useState(pager.snapshot);
  React.useEffect(() => pager.subscribe(setSnapshot), [pager]);
  React.useEffect(() => {
    pager.reset(scope, scope === serverScope ? initialPage : undefined);
    return () => pager.cancel();
  }, [pager, scope, serverScope, initialPage]);
  React.useEffect(() => {
    const restore = () => setQuery(catalogQuery(Object.fromEntries(new URLSearchParams(window.location.search))));
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  const current = snapshot.scope === scope ? snapshot : { ...snapshot, page: null, error: null, loading: true };
  const page = current.page;
  const shown = page?.items ?? [];
  const total = page?.total ?? 0;
  // Keep the global controls available during the next first-page request.
  const facets = page?.facets ?? initialPage.facets;
  const toggleFacet = (key: keyof Filters) => (val: string) => {
    setQuery(q => ({ ...q, [key]: q[key].includes(val) ? q[key].filter(x => x !== val) : [...q[key], val] }));
  };
  const clearAll = () => setQuery(q => ({ ...q, category: "All", form: [], origin: [], flavour: [], search: "" }));
  const anyFilter = category !== "All" || form.length > 0 || origin.length > 0 || flavour.length > 0 || !!query.search;

  React.useEffect(() => {
    const params = catalogParams(query);
    window.history.replaceState(null, "", params ? `?${params}` : window.location.pathname);
  }, [query]);

  const activePills: [keyof Filters, string][] = [
    ...filters.form.map((v) => ["form", v] as [keyof Filters, string]),
    ...filters.origin.map((v) => ["origin", v] as [keyof Filters, string]),
    ...filters.flavour.map((v) => ["flavour", v] as [keyof Filters, string]),
  ];
  const sortLabel = SORTS.find((s) => s[0] === sort)?.[1] || "Featured";

  return (
    <>
      <CatalogBanner />
      {!anyFilter && <FeaturedRow products={page?.featured ?? []} market={market} />}

      {/* sticky filter bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(253,250,245,.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 40px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <CategoryChips value={category} onChange={(c) => setQuery(q => ({ ...q, category: c }))} categories={facets.category} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {facets.form.length > 0 && <Dropdown label="Form" options={facets.form} selected={filters.form} onToggle={toggleFacet("form")} />}
              {facets.origin.length > 0 && <Dropdown label="Origin" options={facets.origin} selected={filters.origin} onToggle={toggleFacet("origin")} />}
              {facets.flavour.length > 0 && <Dropdown label="Flavour" options={facets.flavour} selected={filters.flavour} onToggle={toggleFacet("flavour")} />}
              <span style={{ width: 1, height: 26, background: "var(--line)", margin: "0 2px" }} />
              <Dropdown label={"Sort: " + sortLabel} options={SORTS} selected={sort} onToggle={(value) => setQuery(q => ({ ...q, sort: value as CatalogQuery["sort"] }))} single align="right" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
              {page ? `${total} ${total === 1 ? "spice" : "spices"}` : "Loading spices…"}
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
          {current.error && (
            <div role="alert" style={{ textAlign: "center", marginBottom: 22 }}>
              <p style={{ fontFamily: "var(--font-ui)", color: "var(--muted)" }}>{current.error}</p>
              <button className="btn btn-intl" style={{ width: "auto", padding: "12px 28px" }} onClick={() => pager.retry()}>Try again</button>
            </div>
          )}
          {!page ? (
            current.loading ? <p role="status" style={{ textAlign: "center", fontFamily: "var(--font-ui)", color: "var(--muted)" }}>Loading spices…</p> : null
          ) : shown.length === 0 ? (
            <div style={{ textAlign: "center", padding: "90px 0" }}>
              <h3 className="disp" style={{ fontSize: 30, color: "var(--ink)", margin: "0 0 10px" }}>Nothing matches those filters</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", margin: "0 0 22px" }}>Try loosening a facet or two.</p>
              <button className="btn btn-intl" style={{ width: "auto", padding: "12px 28px" }} onClick={clearAll}>Clear all filters</button>
            </div>
          ) : (
            <>
              <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
                {shown.map((p) => <CardCFinal key={p.productId || p.slug || p.name} spice={p} market={market} />)}
              </div>
              {page.hasNextPage && (
                <div style={{ textAlign: "center", marginTop: 48 }}>
                  <button disabled={current.loading} onClick={() => pager.loadMore()} className="btn btn-intl" style={{ width: "auto", padding: "14px 34px", background: "transparent", color: "var(--brand)", border: "1.5px solid var(--brand)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--brand)"; }}>
                    {current.loading ? "Loading..." : `Load more — ${Math.max(0, total - shown.length)} remaining`}
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
