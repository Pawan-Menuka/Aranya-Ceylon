/* Aranya Ceylon — Categories landing.
   Deep-links into Catalog.html via ?cat= / ?flavour= / ?sort=.
   Depends on catalog-data.js (CATALOG), cards.jsx (CardCFinal), shared.jsx,
   home-common.jsx (Reveal, Liyawel, Eyebrow), image-slot.js, navbar.jsx.
   Exports CategoriesPage. */
const { useState: cgUse } = React;

function cgCount(cat) { return window.CATALOG.filter((p) => p.category === cat).length; }
function cgPreview(cat, n) { return window.CATALOG.filter((p) => p.category === cat).slice(0, n || 3); }

/* the three preparations — keyed to the real CATALOG `category` values */
const PREP = [
  { cat: "Whole Spices", color: "#3C3A36", deep: "#26241F", slot: "cat-whole-spices",
    blurb: "Quills, pods, peppercorns and buds — graded and sealed whole, milled only when you order, so the volatile oils stay locked in until the last moment." },
  { cat: "Ground", title: "Ground & Powders", color: "#D99A1C", deep: "#A8740F", slot: "cat-ground-powders",
    blurb: "Stone-milled in small batches as orders come in — turmeric, ginger and cinnamon at full colour and aroma, never the flat pre-ground tin." },
  { cat: "Blends", title: "Estate Blends", color: "#9A5B22", deep: "#6E3F16", slot: "cat-estate-blends",
    blurb: "Roasted and hand-ground house blends from Kandy — our Ceylon curry powder and Kandyan garam masala, built the slow, dark, hill-country way." },
];

/* flavour families — match the catalog flavour facet vocabulary */
const FLAVOURS = [
  { name: "Sweet", color: "#C2772E", note: "Honeyed & floral" },
  { name: "Warm", color: "#B5651D", note: "Clove & wood" },
  { name: "Citrus", color: "#B0894A", note: "Bright & lifted" },
  { name: "Floral", color: "#8FA56A", note: "Cool & perfumed" },
  { name: "Pungent", color: "#54504A", note: "Sharp & hot" },
  { name: "Earthy", color: "#9A7030", note: "Deep & grounding" },
];

/* curated collections → catalog sorts / plain */
const COLLECTIONS = [
  { name: "Bestsellers", href: "Catalog.html?sort=best", color: "#BA7517", deep: "#8A560F", slot: "col-best", note: "What the kitchen reaches for" },
  { name: "New Arrivals", href: "Catalog.html?sort=new", color: "#1D9E75", deep: "#147a59", slot: "col-new", note: "Fresh to the harvest table" },
  { name: "Gift Sets", href: "Gifts.html", color: "#0F6E56", deep: "#0b5343", slot: "col-gift", note: "Curated wooden boxes" },
];

function ArrowBtn({ accent, hovered, size = 44 }) {
  return (
    <span style={{ flex: "0 0 auto", width: size, height: size, borderRadius: 999, background: hovered ? "var(--accent)" : "rgba(253,250,245,.16)",
      border: "1px solid rgba(253,250,245,.4)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", transition: "background .25s, transform .25s", transform: hovered ? "translateX(3px)" : "none" }}>
      <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </span>
  );
}

/* ---------- editorial feature row per preparation ---------- */
function PrepFeature({ p, flip, market }) {
  const title = p.title || p.cat;
  const count = cgCount(p.cat);
  const preview = cgPreview(p.cat, 3);
  const href = "Catalog.html?cat=" + encodeURIComponent(p.cat);
  const [h, setH] = cgUse(false);
  const bg = flip ? "var(--surface)" : "var(--bg)";
  return (
    <section style={{ background: bg, padding: "84px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div className="cg-feature" style={{ display: "grid", gridTemplateColumns: "minmax(0,5fr) minmax(0,6fr)", gap: 60, alignItems: "center", direction: flip ? "rtl" : "ltr" }}>
          {/* image tile (links to filtered catalog) */}
          <Reveal style={{ direction: "ltr" }}>
            <a href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
              style={{ position: "relative", display: "block", borderRadius: 12, overflow: "hidden", aspectRatio: "4 / 3", boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-md)", transition: "box-shadow .3s" }}>
              <image-slot id={p.slot} shape="rect" fit="cover" placeholder={`Drop a ${title} photo`}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}></image-slot>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${p.color}55, ${p.deep}cc)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,.5))", pointerEvents: "none" }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: p.color, pointerEvents: "none" }} />
              <div style={{ position: "absolute", left: 24, right: 24, bottom: 22, display: "flex", alignItems: "flex-end", justifyContent: "space-between", pointerEvents: "none" }}>
                <div className="eyebrow" style={{ color: "rgba(253,250,245,.9)" }}>{count} {count === 1 ? "spice" : "spices"}</div>
                <ArrowBtn hovered={h} />
              </div>
            </a>
          </Reveal>
          {/* content */}
          <div style={{ direction: "ltr" }}>
            <Reveal><Eyebrow>Shop by preparation</Eyebrow></Reveal>
            <Reveal delay={60}>
              <h2 className="disp" style={{ fontSize: "clamp(34px,3.8vw,52px)", color: "var(--brand)", margin: "14px 0 18px", lineHeight: 1.04 }}>{title}</h2>
            </Reveal>
            <Reveal delay={110}>
              <p className="prose" style={{ fontSize: 17.5, color: "var(--ink)", margin: "0 0 26px", maxWidth: 520 }}>{p.blurb}</p>
            </Reveal>
            <Reveal delay={150}>
              <a href={href} className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "13px 28px", display: "inline-flex", textDecoration: "none" }}>
                Shop {title} <span style={{ marginLeft: 8 }}><Icon name="chevron" size={14} stroke="#fff" /></span>
              </a>
            </Reveal>
          </div>
        </div>
        {/* product preview — full width so cards keep their proper size */}
        <Reveal delay={120}>
          <div className="cg-preview" style={{ display: "grid", gridTemplateColumns: "repeat(" + preview.length + ", 1fr)", gap: 22, marginTop: 52, maxWidth: preview.length < 3 ? 840 : "none" }}>
            {preview.map((s) => <CardCFinal key={s.name} spice={s} market={market} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- flavour family band (forest green) ---------- */
function FlavourBand() {
  return (
    <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "96px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 80% at 88% 0%, rgba(29,158,117,.4), transparent 55%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <Reveal><Eyebrow center light>Shop by character</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(34px,4vw,52px)", margin: "16px 0 16px", lineHeight: 1.04, fontWeight: 600 }}>Browse by flavour</h2></Reveal>
          <Reveal delay={110}><p className="prose" style={{ fontSize: 17, color: "rgba(253,250,245,.82)", margin: "0 auto", maxWidth: 520 }}>Cook to a feeling, not a name — pick the note you want on the plate and we'll show you the spices that carry it.</p></Reveal>
        </div>
        <Reveal delay={120}>
          <div className="cg-flav" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {FLAVOURS.map((f) => <FlavourCard key={f.name} f={f} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
function FlavourCard({ f }) {
  const [h, setH] = cgUse(false);
  return (
    <a href={"Catalog.html?flavour=" + encodeURIComponent(f.name)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", alignItems: "center", gap: 16, textDecoration: "none", background: "rgba(253,250,245,.06)",
        border: "1px solid rgba(253,250,245,.16)", borderRadius: 12, padding: "20px 22px", transition: "background .2s, transform .2s",
        transform: h ? "translateY(-2px)" : "none" }}>
      <span style={{ width: 44, height: 44, borderRadius: 999, background: f.color, flex: "0 0 auto", boxShadow: "0 4px 14px rgba(0,0,0,.25)" }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="disp" style={{ display: "block", fontSize: 26, color: "#FDFAF5", lineHeight: 1 }}>{f.name}</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.7)", fontWeight: 500 }}>{f.note}</span>
      </span>
      <span style={{ flex: "0 0 auto", transform: h ? "translateX(3px)" : "none", transition: "transform .2s" }}><Icon name="chevron" size={18} stroke="#E6B860" /></span>
    </a>
  );
}

/* ---------- collections trio ---------- */
function Collections() {
  return (
    <section style={{ background: "var(--bg)", padding: "96px 0 40px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <Reveal><Eyebrow center>Curated for you</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(32px,3.6vw,46px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.04 }}>Collections</h2></Reveal>
        </div>
        <Reveal delay={100}>
          <div className="cg-coll" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {COLLECTIONS.map((c) => <CollectionTile key={c.name} c={c} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
function CollectionTile({ c }) {
  const [h, setH] = cgUse(false);
  return (
    <a href={c.href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ position: "relative", display: "block", borderRadius: 12, overflow: "hidden", aspectRatio: "5 / 4", boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-sm)", transition: "box-shadow .3s" }}>
      <image-slot id={c.slot} shape="rect" fit="cover" placeholder={`Drop a ${c.name} photo`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}></image-slot>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${c.color}55, ${c.deep}dd)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 46%, rgba(0,0,0,.55))", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: c.color, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 24, right: 24, bottom: 22, color: "#fff", pointerEvents: "none", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ color: "rgba(253,250,245,.82)", marginBottom: 7 }}>{c.note}</div>
          <h3 className="disp" style={{ fontSize: 30, margin: 0, lineHeight: 1, color: "#fff", textShadow: "0 1px 14px rgba(0,0,0,.4)" }}>{c.name}</h3>
        </div>
        <ArrowBtn hovered={h} size={40} />
      </div>
    </a>
  );
}

/* ---------- page ---------- */
function CategoriesPage({ market, cartCount, onCartClick, onAccountClick }) {
  return (
    <div className="aranya">
      <AranyaNavbar market={market} heroMode={false} cartCount={cartCount} onCartClick={onCartClick} onAccountClick={onAccountClick} />

      {/* header */}
      <header style={{ background: "var(--brand)", color: "#FDFAF5", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: .5, background: "radial-gradient(120% 90% at 88% -10%, rgba(29,158,117,.55) 0%, transparent 52%)" }} />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "132px 40px 56px", position: "relative", textAlign: "center" }}>
          <Reveal><Liyawel width={150} color="rgba(230,184,96,.55)" accent="rgba(230,184,96,.7)" style={{ marginBottom: 22 }} /></Reveal>
          <Reveal delay={60}><Eyebrow center light>The Pantry</Eyebrow></Reveal>
          <Reveal delay={100}>
            <h1 className="disp" style={{ fontSize: "clamp(46px,6vw,82px)", lineHeight: 1.0, margin: "16px 0 14px", fontWeight: 600 }}>Shop by category</h1>
          </Reveal>
          <Reveal delay={150}>
            <p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.8)", margin: "0 auto", maxWidth: 540 }}>
              Whole spices, stone-milled powders and estate blends — or browse by the flavour you're cooking toward.
            </p>
          </Reveal>
        </div>
      </header>

      {PREP.map((p, i) => <PrepFeature key={p.cat} p={p} flip={i % 2 === 1} market={market} />)}
      <FlavourBand />
      <Collections />

      {/* closing CTA */}
      <section style={{ background: "var(--bg)", padding: "60px 0 104px", textAlign: "center" }}>
        <Reveal>
          <a href="Catalog.html" className="btn btn-ghost" style={{ width: "auto", padding: "15px 36px", display: "inline-flex", textDecoration: "none" }}>
            Browse the full harvest <span style={{ marginLeft: 8 }}><Icon name="chevron" size={15} stroke="var(--brand)" /></span>
          </a>
        </Reveal>
      </section>
    </div>
  );
}

Object.assign(window, { CategoriesPage });
