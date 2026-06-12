/* Aranya Ceylon — Catalog page UI.
   Depends on: CATALOG, CATALOG_FACETS, CATALOG_SORTS (catalog-data.js),
   CardCFinal/CardB (cards.jsx), Stars/Badge/Icon (shared.jsx), Eyebrow/Liyawel (home-common.jsx),
   AranyaNavbar (navbar.jsx). Exports CatalogPage to window. */
const { useState: cUse, useRef: cRef, useEffect: cEffect, useMemo: cMemo } = React;

function cParsePrice(p) { return parseFloat(p.replace(/[^0-9.]/g, "")); }

/* ---------- Editorial banner (forest green) ---------- */
function CatalogBanner() {
  return (
    <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .5,
        background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "136px 40px 52px", position: "relative" }}>
        <Liyawel width={150} color="rgba(230,184,96,.55)" accent="rgba(230,184,96,.7)" style={{ opacity: .9, marginBottom: 22, justifyContent: "flex-start" }} />
        <Eyebrow color="rgba(253,250,245,.62)">The full harvest</Eyebrow>
        <h1 className="disp" style={{ fontSize: 60, lineHeight: 1.02, margin: "16px 0 14px", fontWeight: 600, letterSpacing: ".005em", maxWidth: 760 }}>
          Every spice, single-origin & shipped at peak aroma
        </h1>
        <p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.8)", margin: 0, maxWidth: 560 }}>
          Whole quills, hand-ground powders and estate blends — graded for export, sealed within weeks of harvest, never left to fade on a shelf.
        </p>
      </div>
    </header>
  );
}

/* ---------- Dropdown popover (multi-select facet or single-select sort) ---------- */
function Dropdown({ label, options, selected, onToggle, single = false, align = "left" }) {
  const [open, setOpen] = cUse(false);
  const ref = cRef(null);
  cEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const count = single ? 0 : selected.length;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "inline-flex", alignItems: "center", gap: 8, background: count ? "rgba(15,110,86,.07)" : "#fff",
        border: count ? "1px solid var(--brand)" : "1px solid var(--line)", borderRadius: 8, padding: "10px 14px",
        cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, color: count ? "var(--brand)" : "var(--ink)" }}>
        {label}{count > 0 && <span style={{ background: "var(--brand)", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "1px 7px", lineHeight: 1.5 }}>{count}</span>}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", opacity: .6 }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", [align]: 0, zIndex: 40, minWidth: single ? 210 : 200,
          background: "#fff", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 7 }}>
          {options.map((opt) => {
            const on = single ? selected === opt[0] : selected.includes(opt);
            const val = single ? opt[1] : opt;
            return (
              <button key={single ? opt[0] : opt} onClick={() => { onToggle(single ? opt[0] : opt); if (single) setOpen(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: 0, cursor: "pointer",
                padding: "9px 10px", borderRadius: 7, textAlign: "left", fontFamily: "var(--font-ui)", fontSize: 13.5,
                fontWeight: on ? 700 : 500, color: on ? "var(--brand)" : "var(--ink)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
                {!single && (
                  <span style={{ width: 17, height: 17, borderRadius: 5, flex: "0 0 auto", border: on ? "none" : "1.5px solid var(--line)",
                    background: on ? "var(--brand)" : "#fff", display: "grid", placeItems: "center" }}>
                    {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                  </span>
                )}
                {single && <span style={{ width: 7, height: 7, borderRadius: 9, flex: "0 0 auto", background: on ? "var(--brand)" : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--line)" }} />}
                {val}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Category quick-link chips ---------- */
function CategoryChips({ value, onChange, facets }) {
  const items = ["All", ...facets.category];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
      {items.map((c) => {
        const on = value === c;
        return (
          <button key={c} onClick={() => onChange(c)} style={{
            fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            padding: "9px 17px", borderRadius: 999, transition: "all .15s",
            border: on ? "1px solid var(--brand)" : "1px solid var(--line)",
            background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--ink)" }}>
            {c}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Featured row (CardB) ---------- */
function FeaturedRow({ products, market }) {
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {feat.map((p) => <CardB key={p.name} spice={p} market={market} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------- Main page ---------- */
function _catInitial() {
  try {
    const q = new URLSearchParams(location.search);
    const cats = window.CATALOG_FACETS.category, flavs = window.CATALOG_FACETS.flavour, forms = window.CATALOG_FACETS.form;
    const sorts = window.CATALOG_SORTS.map((s) => s[0]);
    const cat = q.get("cat");
    const flavour = (q.get("flavour") || "").split(",").map((x) => x.trim()).filter((x) => flavs.indexOf(x) !== -1);
    const form = (q.get("form") || "").split(",").map((x) => x.trim()).filter((x) => forms.indexOf(x) !== -1);
    const sort = q.get("sort");
    return {
      category: cat && cats.indexOf(cat) !== -1 ? cat : "All",
      filters: { form: form, origin: [], flavour: flavour },
      sort: sort && sorts.indexOf(sort) !== -1 ? sort : "featured",
    };
  } catch (e) { return { category: "All", filters: { form: [], origin: [], flavour: [] }, sort: "featured" }; }
}

/* derive filter facets from the loaded products (empty facets get hidden) */
function cDeriveFacets(products) {
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  return {
    category: uniq(products.map((p) => p.category)),
    form: uniq(products.map((p) => p.form)),
    origin: uniq(products.map((p) => p.origin)),
    flavour: uniq(products.flatMap((p) => p.flavour || [])),
  };
}

function CatalogPage({ products, loading, market, onCartClick, onAccountClick, cartCount }) {
  const _init = _catInitial();
  const [category, setCategory] = cUse(_init.category);
  const [filters, setFilters] = cUse(_init.filters);
  const [sort, setSort] = cUse(_init.sort);
  const [visible, setVisible] = cUse(8);

  const facets = cMemo(() => cDeriveFacets(products), [products]);

  const toggleFacet = (key) => (val) => {
    setFilters((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));
    setVisible(8);
  };
  const clearAll = () => { setCategory("All"); setFilters({ form: [], origin: [], flavour: [] }); setVisible(8); };

  const anyFilter = category !== "All" || filters.form.length || filters.origin.length || filters.flavour.length;

  const filtered = cMemo(() => {
    let list = products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (filters.form.length && !filters.form.includes(p.form)) return false;
      if (filters.origin.length && !filters.origin.includes(p.origin)) return false;
      if (filters.flavour.length && !filters.flavour.some((f) => (p.flavour || []).includes(f))) return false;
      return true;
    });
    const by = {
      "featured": (a, b) => (b.featured - a.featured) || (b.popularity - a.popularity),
      "best": (a, b) => b.popularity - a.popularity,
      "price-asc": (a, b) => cParsePrice(a.usd) - cParsePrice(b.usd),
      "price-desc": (a, b) => cParsePrice(b.usd) - cParsePrice(a.usd),
      "rating": (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      "new": (a, b) => b.added.localeCompare(a.added),
    }[sort];
    return [...list].sort(by);
  }, [products, category, filters, sort]);

  const shown = filtered.slice(0, visible);
  const activePills = [
    ...filters.form.map((v) => ["form", v]),
    ...filters.origin.map((v) => ["origin", v]),
    ...filters.flavour.map((v) => ["flavour", v]),
  ];

  return (
    <div className="aranya">
      <AranyaNavbar market={market} heroMode={false} cartCount={cartCount} onCartClick={onCartClick} onAccountClick={onAccountClick} />
      <CatalogBanner />

      {/* show curated featured row only on the unfiltered default view */}
      {!anyFilter && <FeaturedRow products={products} market={market} />}

      {/* sticky filter bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(253,250,245,.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "18px 40px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <CategoryChips value={category} onChange={(c) => { setCategory(c); setVisible(8); }} facets={facets} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {facets.form.length > 0 && <Dropdown label="Form" options={facets.form} selected={filters.form} onToggle={toggleFacet("form")} />}
              {facets.origin.length > 0 && <Dropdown label="Origin" options={facets.origin} selected={filters.origin} onToggle={toggleFacet("origin")} />}
              {facets.flavour.length > 0 && <Dropdown label="Flavour" options={facets.flavour} selected={filters.flavour} onToggle={toggleFacet("flavour")} />}
              <span style={{ width: 1, height: 26, background: "var(--line)", margin: "0 2px" }} />
              <Dropdown label={"Sort: " + window.CATALOG_SORTS.find((s) => s[0] === sort)[1]} options={window.CATALOG_SORTS} selected={sort} onToggle={setSort} single align="right" />
            </div>
          </div>
          {/* active filter pills + count */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
              {filtered.length} {filtered.length === 1 ? "spice" : "spices"}
            </span>
            {activePills.length > 0 && <span style={{ width: 1, height: 16, background: "var(--line)" }} />}
            {activePills.map(([key, val]) => (
              <button key={key + val} onClick={() => toggleFacet(key)(val)} style={{
                display: "inline-flex", alignItems: "center", gap: 6, background: "var(--surface)", border: "1px solid var(--line)",
                borderRadius: 999, padding: "5px 10px 5px 12px", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
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
          {loading ? (
            <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 14, overflow: "hidden", background: "var(--surface)", border: "1px solid var(--line)" }}>
                  <div className="cat-skel" style={{ aspectRatio: "4 / 5" }} />
                  <div style={{ padding: "16px 16px 20px" }}>
                    <div className="cat-skel" style={{ height: 13, width: "40%", borderRadius: 4, marginBottom: 12 }} />
                    <div className="cat-skel" style={{ height: 20, width: "80%", borderRadius: 4, marginBottom: 10 }} />
                    <div className="cat-skel" style={{ height: 13, width: "55%", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div style={{ textAlign: "center", padding: "90px 0" }}>
              <h3 className="disp" style={{ fontSize: 30, color: "var(--ink)", margin: "0 0 10px" }}>Nothing matches those filters</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", margin: "0 0 22px" }}>Try loosening a facet or two.</p>
              <button className="btn btn-intl" style={{ width: "auto", padding: "12px 28px" }} onClick={clearAll}>Clear all filters</button>
            </div>
          ) : (
            <React.Fragment>
              <div className="cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
                {shown.map((p) => <CardCFinal key={p.name} spice={p} market={market} />)}
              </div>
              {visible < filtered.length && (
                <div style={{ textAlign: "center", marginTop: 48 }}>
                  <button onClick={() => setVisible((v) => v + 8)} className="btn btn-intl"
                    style={{ width: "auto", padding: "14px 34px", background: "transparent", color: "var(--brand)", border: "1.5px solid var(--brand)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--brand)"; }}>
                    Load more — {filtered.length - visible} remaining
                  </button>
                </div>
              )}
            </React.Fragment>
          )}
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { CatalogPage });
