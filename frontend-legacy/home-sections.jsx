/* Aranya Ceylon — homepage content sections (part 1):
   CategoryTiles · StoryBand · Bestsellers */
const { useState: hsState, useEffect: hsEffect } = React;

const CATEGORIES = [
  { name: "Cinnamon & Bark", count: 6, color: "#B5651D", deep: "#7E481A", slot: "cat-cinnamon", blurb: "True Ceylon quills, hand-rolled" },
  { name: "Whole Spices", count: 14, color: "#3C3A36", deep: "#26241F", slot: "cat-whole", blurb: "Cloves, pepper, nutmeg" },
  { name: "Ground & Powders", count: 9, color: "#D99A1C", deep: "#A8740F", slot: "cat-ground", blurb: "Stone-milled, small batch" },
  { name: "Cardamom & Pods", count: 5, color: "#7C9A5A", deep: "#566F37", slot: "cat-cardamom", blurb: "Green pods, alpine-grown" },
  { name: "Gift Sets", count: 8, color: "#BA7517", deep: "#8A560F", slot: "cat-gift", blurb: "Curated wooden boxes" },
];

function Arrow({ color = "#fff", size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function CatTile({ cat, big = false }) {
  const [h, setH] = hsState(false);
  return (
    <a href="#" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ position: "relative", display: "block", borderRadius: 8, overflow: "hidden", height: "100%", minHeight: big ? 460 : 222,
        background: cat.deep, boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-sm)", transition: "box-shadow .3s" }}>
      {/* photo slot */}
      <image-slot id={cat.slot} shape="rect" fit="cover" placeholder={`Drop ${cat.name} photo`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}></image-slot>
      {/* spice-tinted base so empty slots still read on-brand */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${cat.color}55, ${cat.deep}cc)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
      {/* legibility scrim */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.12) 0%, transparent 38%, rgba(0,0,0,.16) 62%, rgba(0,0,0,.62) 100%)", pointerEvents: "none" }} />
      {/* spice colour seam */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: cat.color, pointerEvents: "none" }} />
      {/* content */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: big ? "28px 30px" : "20px 22px", color: "#fff", pointerEvents: "none" }}>
        <div className="eyebrow" style={{ color: "rgba(253,250,245,.82)", marginBottom: 8 }}>{cat.count} spices</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 className="disp" style={{ fontSize: big ? 38 : 26, margin: 0, lineHeight: 1.02, color: "#fff", textShadow: "0 1px 14px rgba(0,0,0,.4)" }}>{cat.name}</h3>
            {big && <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "rgba(253,250,245,.82)", margin: "8px 0 0" }}>{cat.blurb}</p>}
          </div>
          <span style={{ flex: "0 0 auto", width: big ? 46 : 38, height: big ? 46 : 38, borderRadius: 999, background: h ? "var(--accent)" : "rgba(253,250,245,.16)",
            border: "1px solid rgba(253,250,245,.4)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", transition: "background .25s, transform .25s", transform: h ? "translateX(3px)" : "none" }}>
            <Arrow size={big ? 20 : 17} />
          </span>
        </div>
      </div>
    </a>
  );
}

function CategoryTiles() {
  return (
    <section style={{ background: "var(--bg)", padding: "100px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 18 }}>
          <Eyebrow center>Explore the Pantry</Eyebrow>
        </Reveal>
        <Reveal delay={60} style={{ textAlign: "center", marginBottom: 14 }}>
          <h2 className="disp" style={{ fontSize: 50, color: "var(--brand)", margin: 0, lineHeight: 1.03 }}>Browse by Category</h2>
        </Reveal>
        <Reveal delay={120} style={{ textAlign: "center", marginBottom: 44 }}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 16, color: "var(--muted)", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            Five families of single-origin spice, each lifted from a different corner of the island.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="cat-feature" style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 18, marginBottom: 18 }}>
            <CatTile cat={CATEGORIES[0]} big />
            <CatTile cat={CATEGORIES[1]} big />
          </div>
          <div className="cat-trio" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            <CatTile cat={CATEGORIES[2]} />
            <CatTile cat={CATEGORIES[3]} />
            <CatTile cat={CATEGORIES[4]} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Story band — sourcing & freshness (forest green) ---------- */
function StoryBand() {
  const points = [
    { k: "Single-origin", v: "One farm, one harvest — never blended or bulked." },
    { k: "Harvested 2026", v: "This season's lift, not last year's warehouse stock." },
    { k: "Peak aroma", v: "Sealed within days, shipped at full volatile-oil strength." },
  ];
  return (
    <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "104px 0", position: "relative", overflow: "hidden" }}>
      <div className="story-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
        <Reveal>
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4 / 5", boxShadow: "0 30px 60px rgba(0,0,0,.3)" }}>
            <image-slot id="story-sourcing" shape="rect" fit="cover" placeholder="Drop a sourcing / farm photo"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}></image-slot>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(15,110,86,.25), rgba(11,60,48,.5))", mixBlendMode: "multiply", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: 22, bottom: 20, color: "#fff", pointerEvents: "none" }}>
              <div className="eyebrow" style={{ color: "#E6B860" }}>Matale Hills · 1,200m</div>
            </div>
          </div>
        </Reveal>
        <div>
          <Reveal><Eyebrow light>From Forest to Kitchen</Eyebrow></Reveal>
          <Reveal delay={60}>
            <h2 className="disp" style={{ fontSize: 50, margin: "16px 0 0", lineHeight: 1.05, color: "#FDFAF5", fontWeight: 600 }}>
              Weeks from the tree,<br />not years from a warehouse.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p style={{ fontFamily: "var(--font-read)", fontSize: 17.5, lineHeight: 1.72, color: "rgba(253,250,245,.85)", margin: "22px 0 34px", maxWidth: 480 }}>
              Most supermarket spice is a year old before it reaches the shelf — flat, faded, anonymous. We work directly with the families who grow ours, lift each spice at its peak, and seal it while the oils are still singing.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div style={{ display: "grid", gap: 0 }}>
              {points.map((pt, i) => (
                <div key={pt.k} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "baseline",
                  padding: "18px 0", borderTop: i === 0 ? "1px solid rgba(253,250,245,.2)" : "1px solid rgba(253,250,245,.12)" }}>
                  <span className="disp" style={{ fontSize: 18, color: "#E6B860", fontWeight: 600, whiteSpace: "nowrap" }}>{pt.k}</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "rgba(253,250,245,.85)", lineHeight: 1.55 }}>{pt.v}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- Bestsellers — "What People Love" — Card C grid ---------- */
function Bestsellers({ market }) {
  /* Seed from dummy data immediately so the section is never blank on first
     paint, then swap in live bestsellers once the API resolves. */
  const [picks, setPicks] = hsState(() => {
    const s = window.SPICES || [];
    return [s[0], s[5], s[4], s[1]].filter(Boolean);
  });

  hsEffect(() => {
    let alive = true;
    if (!window.AranyaAPI) return;
    window.AranyaAPI.getAllProducts()
      .then((r) => {
        if (!alive) return;
        const all = (r.items || []);
        if (!all.length) return;
        const bs = all.filter((s) => s.certifications && s.certifications.includes("BESTSELLER"));
        setPicks(bs.length >= 4 ? bs.slice(0, 4) : all.slice(0, 4));
      })
      .catch(() => {/* keep fallback */});
    return () => { alive = false; };
  }, []);

  return (
    <section style={{ background: "var(--bg)", padding: "100px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 44, flexWrap: "wrap", gap: 16 }}>
          <div>
            <Reveal><Eyebrow>Loved by Our Kitchen Community</Eyebrow></Reveal>
            <Reveal delay={60}><h2 className="disp" style={{ fontSize: 50, color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.03 }}>What People Love</h2></Reveal>
          </div>
          <Reveal delay={100}>
            <a href="Catalog.html" style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 7, paddingBottom: 8 }}>
              Shop all spices <Arrow color="var(--brand)" size={15} />
            </a>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <div className="best-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
            {picks.map((s) => <CardCFinal key={s.slug || s.name} spice={s} market={market} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

Object.assign(window, { CategoryTiles, StoryBand, Bestsellers });
