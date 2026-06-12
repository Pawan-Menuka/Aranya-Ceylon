/* Aranya Ceylon — MOBILE FLOW: home page sections, ported from the desktop Home.html.
   Browse by Category · Story band · What People Love · Heritage · Newsletter · Footer.
   Mobile-adapted (single column, snug type). Read off window by HomeScreen.
   Depends on home-common.jsx (Eyebrow, Liyawel), shared.jsx (Seal), mobile-flow-shop.jsx (FlowGridCard). */
const { useState: mhUse } = React;

function MArrow({ size = 16, color = "#fff" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

const MCATEGORIES = [
  { name: "Cinnamon & Bark", count: 6, color: "#B5651D", deep: "#7E481A", blurb: "True Ceylon quills, hand-rolled" },
  { name: "Whole Spices", count: 14, color: "#3C3A36", deep: "#26241F", blurb: "Cloves, pepper, nutmeg" },
  { name: "Ground & Powders", count: 9, color: "#D99A1C", deep: "#A8740F", blurb: "Stone-milled, small batch" },
  { name: "Cardamom & Pods", count: 5, color: "#7C9A5A", deep: "#566F37", blurb: "Green pods, alpine-grown" },
  { name: "Gift Sets", count: 8, color: "#BA7517", deep: "#8A560F", blurb: "Curated wooden boxes" },
];

/* ---------- Browse by Category ---------- */
function MCatTile({ cat, onGo, wide = false }) {
  const tall = wide;
  return (
    <button onClick={onGo} style={{ position: "relative", display: "block", width: "100%", border: 0, padding: 0, cursor: "pointer", borderRadius: 9, overflow: "hidden", height: tall ? 168 : 158, background: cat.deep, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${cat.color}, ${cat.deep})` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.1) 0%, transparent 42%, rgba(0,0,0,.58) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: cat.color }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "15px 16px", textAlign: "left" }}>
        <div className="eyebrow" style={{ color: "rgba(253,250,245,.85)", marginBottom: 5, fontSize: 9 }}>{cat.count} spices</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h3 className="disp" style={{ fontSize: wide ? 25 : 20, margin: 0, color: "#fff", lineHeight: 1.04, textShadow: "0 1px 12px rgba(0,0,0,.45)" }}>{cat.name}</h3>
            {wide && <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(253,250,245,.82)", margin: "5px 0 0" }}>{cat.blurb}</p>}
          </div>
          <span style={{ flex: "0 0 auto", width: 32, height: 32, borderRadius: 999, background: "rgba(253,250,245,.16)", border: "1px solid rgba(253,250,245,.4)", display: "grid", placeItems: "center" }}><MArrow size={15} /></span>
        </div>
      </div>
    </button>
  );
}

function MCategoryTiles({ nav }) {
  return (
    <section style={{ background: "var(--bg)", padding: "52px 18px 8px" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <Eyebrow center>Explore the Pantry</Eyebrow>
        <h2 className="disp" style={{ fontSize: 30, color: "var(--brand)", margin: "10px 0 8px", lineHeight: 1.04 }}>Browse by Category</h2>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", margin: "0 auto", maxWidth: 280, lineHeight: 1.55 }}>Five families of single-origin spice, each from a different corner of the island.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        {MCATEGORIES.map((c, i) => (
          <div key={c.name} style={{ gridColumn: i === 4 ? "1 / -1" : "auto" }}>
            <MCatTile cat={c} wide={i === 4} onGo={nav.goCatalog} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Story band (forest green) ---------- */
function MStoryBand() {
  const points = [
    ["Single-origin", "One farm, one harvest — never blended or bulked."],
    ["Harvested 2026", "This season's lift, not last year's warehouse stock."],
    ["Peak aroma", "Sealed within days, at full volatile-oil strength."],
  ];
  return (
    <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "52px 20px", marginTop: 44 }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "16 / 11", marginBottom: 26, boxShadow: "0 22px 44px rgba(0,0,0,.32)" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(155deg, #2BA982 0%, #0F6E56 45%, #0B3C30 100%)" }} />
        <div style={{ position: "absolute", inset: 0, opacity: .5, background: "radial-gradient(60% 50% at 78% 22%, rgba(230,184,96,.22), transparent 60%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: .25 }}><Liyawel width={180} color="rgba(253,250,245,.5)" /></div>
        <div style={{ position: "absolute", left: 16, bottom: 14 }}><div className="eyebrow" style={{ color: "#E6B860" }}>Matale Hills · 1,200m</div></div>
      </div>
      <Eyebrow light>From Forest to Kitchen</Eyebrow>
      <h2 className="disp" style={{ fontSize: 31, margin: "12px 0 0", lineHeight: 1.08, fontWeight: 600 }}>Weeks from the tree, not years from a warehouse.</h2>
      <p className="prose" style={{ fontSize: 15.5, lineHeight: 1.7, color: "rgba(253,250,245,.85)", margin: "16px 0 26px" }}>
        Most supermarket spice is a year old before it reaches the shelf — flat, faded, anonymous. We work directly with the families who grow ours, lift each spice at its peak, and seal it while the oils are still singing.
      </p>
      <div>
        {points.map(([k, v], i) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "baseline", padding: "14px 0", borderTop: i === 0 ? "1px solid rgba(253,250,245,.2)" : "1px solid rgba(253,250,245,.12)" }}>
            <span className="disp" style={{ fontSize: 16, color: "#E6B860", fontWeight: 600, whiteSpace: "nowrap" }}>{k}</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "rgba(253,250,245,.85)", lineHeight: 1.5 }}>{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- What People Love ---------- */
function MBestsellers({ market, accent, nav }) {
  const picks = [window.SPICES[0], window.SPICES[5], window.SPICES[4], window.SPICES[1]];
  return (
    <section style={{ background: "var(--bg)", padding: "50px 18px" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <Eyebrow center>Loved by Our Kitchen Community</Eyebrow>
        <h2 className="disp" style={{ fontSize: 29, color: "var(--brand)", margin: "10px 0 0", lineHeight: 1.04 }}>What People Love</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {picks.map((s) => <FlowGridCard key={s.name} spice={s} market={market} accent={accent} onOpen={() => nav.openProduct(s)} onAdd={() => nav.addToCart(s, "100g", FORM_OF(s), 1)} />)}
      </div>
      <button onClick={nav.goCatalog} className="btn btn-ghost" style={{ marginTop: 20, padding: "14px", fontSize: 14.5 }}>Shop all spices</button>
    </section>
  );
}

/* ---------- Heritage (near-black) ---------- */
function MHeritage() {
  const stats = [["3,000+", "Years of spice trade"], ["100%", "Single-origin"], ["1,200m", "Hill elevation"]];
  return (
    <section style={{ background: "#1A1A1A", color: "#FDFAF5", padding: "62px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 65% at 50% 0%, rgba(15,110,86,.2), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <Liyawel width={160} style={{ marginBottom: 24 }} />
        <Eyebrow center light>The Name</Eyebrow>
        <h2 className="disp" style={{ fontSize: 34, margin: "16px 0 0", lineHeight: 1.05, fontWeight: 600, letterSpacing: ".01em" }}>
          <span style={{ fontStyle: "italic" }}>Aranya</span> means <span style={{ color: "#E6B860" }}>the forest.</span>
        </h2>
        <p className="prose" style={{ fontSize: 15.5, lineHeight: 1.74, color: "rgba(253,250,245,.82)", maxWidth: 330, margin: "20px auto 0" }}>
          From the Sanskrit <em style={{ color: "rgba(253,250,245,.95)" }}>araṇya</em> — the wild woodland. For three thousand years the hill forests of Ceylon have given the world its finest cinnamon. We carry that lineage forward: the same forests, the same hands, the same unhurried craft.
        </p>
        <div style={{ display: "flex", justifyContent: "center", margin: "34px auto 0", maxWidth: 360 }}>
          {stats.map((s, i) => (
            <div key={s[0]} style={{ flex: 1, padding: "0 10px", borderLeft: i === 0 ? "none" : "1px solid rgba(253,250,245,.16)" }}>
              <div className="disp" style={{ fontSize: 28, color: "#E6B860", fontWeight: 600, lineHeight: 1 }}>{s[0]}</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "rgba(253,250,245,.7)", marginTop: 7, lineHeight: 1.3 }}>{s[1]}</div>
            </div>
          ))}
        </div>
        <Liyawel width={160} style={{ marginTop: 34 }} />
      </div>
    </section>
  );
}

/* ---------- Newsletter ---------- */
function MNewsletter({ accent }) {
  const [email, setEmail] = mhUse("");
  const [done, setDone] = mhUse(false);
  return (
    <section style={{ background: "var(--surface)", padding: "52px 24px", borderTop: "1px solid var(--line)", textAlign: "center" }}>
      <Eyebrow center>The Harvest List</Eyebrow>
      <h2 className="disp" style={{ fontSize: 29, color: "var(--brand)", margin: "12px 0 10px", lineHeight: 1.08 }}>First pick of every harvest</h2>
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", margin: "0 auto 22px", maxWidth: 290, lineHeight: 1.6 }}>
        Occasional notes on new lots, the stories behind them, and recipes worth your time.
      </p>
      {done ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--brand)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 24, height: 24, borderRadius: 999, background: "var(--brand)", display: "grid", placeItems: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
          </span>
          Welcome to the list.
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) setDone(true); }} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 16px", fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink)", outline: "none", textAlign: "center" }} />
          <button type="submit" className="btn" style={{ background: accent, color: "#fff", padding: "14px", fontSize: 14.5 }}>Join the list</button>
        </form>
      )}
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", marginTop: 16, opacity: .8 }}>No spam, ever. Unsubscribe in one click.</p>
    </section>
  );
}

/* ---------- Footer (forest green) ---------- */
function MFootCol({ title, links }) {
  return (
    <div>
      <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 14, fontSize: 9.5 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map((l) => <span key={l} style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.82)" }}>{l}</span>)}
      </div>
    </div>
  );
}

function MFooter({ market, setMarket }) {
  return (
    <footer style={{ background: "var(--brand)", color: "#FDFAF5" }}>
      <div style={{ borderBottom: "1px solid rgba(253,250,245,.14)", display: "flex", justifyContent: "center", padding: "20px 0" }}><Liyawel width={170} color="rgba(230,184,96,.5)" /></div>
      <div style={{ padding: "30px 24px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
          <Seal size={38} tone="light" />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span className="disp" style={{ fontSize: 23, color: "#FDFAF5", letterSpacing: ".02em" }}>Aranya Ceylon</span>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 8, letterSpacing: ".32em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>Forest Sourced Spices</span>
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "rgba(253,250,245,.78)", lineHeight: 1.65, margin: "0 0 20px", maxWidth: 280 }}>
          Single-origin spice, lifted from the hill forests of Sri Lanka and shipped at peak aroma.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, padding: "8px 24px 30px" }}>
        <MFootCol title="Shop" links={["All Spices", "Whole Spices", "Ground & Powders", "Gift Sets", "Bestsellers"]} />
        <MFootCol title="Company" links={["Our Story", "Sourcing", "Recipes", "Journal", "Stockists"]} />
        <MFootCol title="Support" links={["Contact", "Shipping & Returns", "Track Order", "FAQ", "Wholesale"]} />
        <div>
          <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 14, fontSize: 9.5 }}>Shipping to</div>
          <FlowMarketSeg market={market} setMarket={setMarket} light />
        </div>
      </div>
      {/* trust strip */}
      <div style={{ padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 14px", padding: "22px 0", borderTop: "1px solid rgba(253,250,245,.14)", borderBottom: "1px solid rgba(253,250,245,.14)" }}>
          {[["GI Certified", "Protected origin"], ["Organic", "EU & USDA"], ["Secure Checkout", "256-bit SSL"], ["Worldwide", "Tracked & insured"]].map((t) => (
            <div key={t[0]} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid rgba(230,184,96,.45)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <span style={{ width: 6, height: 6, borderRadius: 9, background: "#E6B860" }} />
              </span>
              <span style={{ lineHeight: 1.2 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, color: "#FDFAF5", display: "block" }}>{t[0]}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "rgba(253,250,245,.6)" }}>{t[1]}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* bottom bar */}
      <div style={{ padding: "22px 24px 30px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 14 }}>
          {["Privacy", "Terms", "Cookies"].map((l) => <span key={l} style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(253,250,245,.7)" }}>{l}</span>)}
        </div>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(253,250,245,.55)" }}>© 2026 Aranya Ceylon. All rights reserved.</span>
      </div>
    </footer>
  );
}

Object.assign(window, { MCategoryTiles, MStoryBand, MBestsellers, MHeritage, MNewsletter, MFooter });
