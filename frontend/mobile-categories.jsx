/* Aranya Ceylon — MOBILE Categories page (faithful port of categories.jsx).
   Prep features (Whole / Ground / Blends) · Browse by flavour (forest band) · Collections.
   Depends on mobile-pages-common.jsx, catalog-data.js (CATALOG), shared.jsx (Icon), home-common.jsx. */
const { useState: mcgUse } = React;

const MCG_PREP = [
  { cat: "Whole Spices", title: "Whole Spices", color: "#3C3A36", deep: "#26241F",
    blurb: "Quills, pods, peppercorns and buds — graded and sealed whole, milled only when you order so the volatile oils stay locked in." },
  { cat: "Ground", title: "Ground & Powders", color: "#D99A1C", deep: "#A8740F",
    blurb: "Stone-milled in small batches as orders come in — turmeric, ginger and cinnamon at full colour and aroma." },
  { cat: "Blends", title: "Estate Blends", color: "#9A5B22", deep: "#6E3F16",
    blurb: "Roasted, hand-ground house blends from Kandy — Ceylon curry powder and Kandyan garam masala, the slow hill-country way." },
];
const MCG_FLAVOURS = [
  { name: "Sweet", color: "#C2772E", note: "Honeyed & floral" },
  { name: "Warm", color: "#B5651D", note: "Clove & wood" },
  { name: "Citrus", color: "#B0894A", note: "Bright & lifted" },
  { name: "Floral", color: "#8FA56A", note: "Cool & perfumed" },
  { name: "Pungent", color: "#54504A", note: "Sharp & hot" },
  { name: "Earthy", color: "#9A7030", note: "Deep & grounding" },
];
const MCG_COLLECTIONS = [
  { name: "Bestsellers", color: "#BA7517", deep: "#8A560F", note: "What the kitchen reaches for" },
  { name: "New Arrivals", color: "#1D9E75", deep: "#147a59", note: "Fresh to the harvest table" },
  { name: "Gift Sets", color: "#0F6E56", deep: "#0b5343", note: "Curated wooden boxes" },
];

function mcgCount(cat) { return window.CATALOG.filter((p) => p.category === cat).length; }
function mcgPreview(cat, n) { return window.CATALOG.filter((p) => p.category === cat).slice(0, n || 2); }

/* one preparation: tinted banner + blurb + 2 product previews */
function MPrepFeature({ p, market, flip }) {
  const count = mcgCount(p.cat);
  const preview = mcgPreview(p.cat, 2);
  return (
    <section style={{ background: flip ? "var(--surface)" : "var(--bg)", padding: "40px 18px" }}>
      <div style={{ position: "relative", borderRadius: 11, overflow: "hidden", aspectRatio: "16 / 10", boxShadow: "var(--shadow-md)", marginBottom: 20 }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${p.color}, ${p.deep})` }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,.5))" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: p.color }} />
        <div style={{ position: "absolute", left: 18, right: 18, bottom: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div className="eyebrow" style={{ color: "rgba(253,250,245,.9)" }}>{count} {count === 1 ? "spice" : "spices"}</div>
          <span style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(253,250,245,.16)", border: "1px solid rgba(253,250,245,.4)", display: "grid", placeItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </div>
      </div>
      <Eyebrow>Shop by preparation</Eyebrow>
      <h2 className="disp" style={{ fontSize: 28, color: "var(--brand)", margin: "10px 0 12px", lineHeight: 1.04 }}>{p.title}</h2>
      <p className="prose" style={{ fontSize: 15, color: "var(--ink)", margin: "0 0 20px" }}>{p.blurb}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {preview.map((s) => <MProductCard key={s.name} p={s} market={market} />)}
      </div>
    </section>
  );
}

function MFlavourBand() {
  return (
    <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "48px 18px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 80% at 88% 0%, rgba(29,158,117,.4), transparent 55%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", textAlign: "center", marginBottom: 26 }}>
        <Eyebrow center light>Shop by character</Eyebrow>
        <h2 className="disp" style={{ fontSize: 28, margin: "12px 0 10px", lineHeight: 1.04, fontWeight: 600 }}>Browse by flavour</h2>
        <p className="prose" style={{ fontSize: 14.5, color: "rgba(253,250,245,.82)", margin: "0 auto", maxWidth: 300 }}>Cook to a feeling, not a name — pick the note you want on the plate.</p>
      </div>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        {MCG_FLAVOURS.map((f) => (
          <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(253,250,245,.06)", border: "1px solid rgba(253,250,245,.16)", borderRadius: 12, padding: "14px 14px" }}>
            <span style={{ width: 34, height: 34, borderRadius: 999, background: f.color, flex: "0 0 auto", boxShadow: "0 4px 12px rgba(0,0,0,.25)" }} />
            <span style={{ minWidth: 0 }}>
              <span className="disp" style={{ display: "block", fontSize: 20, color: "#FDFAF5", lineHeight: 1 }}>{f.name}</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "rgba(253,250,245,.7)", fontWeight: 500 }}>{f.note}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MCollections() {
  return (
    <section style={{ background: "var(--bg)", padding: "48px 18px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Eyebrow center>Curated for you</Eyebrow>
        <h2 className="disp" style={{ fontSize: 27, color: "var(--brand)", margin: "10px 0 0", lineHeight: 1.04 }}>Collections</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {MCG_COLLECTIONS.map((c) => (
          <div key={c.name} style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "16 / 8", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${c.color}, ${c.deep})` }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,.5))" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: c.color }} />
            <div style={{ position: "absolute", left: 20, right: 20, bottom: 16, color: "#fff", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div>
                <div className="eyebrow" style={{ color: "rgba(253,250,245,.82)", marginBottom: 6 }}>{c.note}</div>
                <h3 className="disp" style={{ fontSize: 26, margin: 0, lineHeight: 1, textShadow: "0 1px 12px rgba(0,0,0,.4)" }}>{c.name}</h3>
              </div>
              <span style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(253,250,245,.16)", border: "1px solid rgba(253,250,245,.4)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileCategories({ market = "intl" }) {
  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      <MPageBar title="Categories" onBack={() => {}} />
      <MPageHero eyebrow="The Pantry" title="Shop by category"
        lede="Whole spices, stone-milled powders and estate blends — or browse by the flavour you're cooking toward." />
      {MCG_PREP.map((p, i) => <MPrepFeature key={p.cat} p={p} market={market} flip={i % 2 === 1} />)}
      <MFlavourBand />
      <MCollections />
      <MPageFooter market={market} />
    </div>
  );
}

Object.assign(window, { MobileCategories });
