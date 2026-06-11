/* Aranya Ceylon — MOBILE FLOW: shop screens (Home, Catalog, Product) + in-flow drawer.
   Read off window by the MobileFlow controller. Depends on shared.jsx (SpicePhoto, Stars,
   Badge, Seal, Icon), mobile.jsx (SAFE_TOP, MHeart), mobile-flow.jsx (FlowMarketSeg, FlowShipMeter). */
const { useState: sfUse } = React;

const HERO_IMG = "assets/hero-spices.png";
const FORM_OF = (s) => (s.name.indexOf("Ground") === 0 ? "Ground" : "Whole");
const DESC = {
  "Ceylon Cinnamon": "True cinnamon, hand-rolled into delicate quills in the Matale hills. Sweet, floral and warm — worlds away from the harsh cassia sold as cinnamon elsewhere.",
  "Green Cardamom": "Plump, resinous pods picked green and slow-dried to lock in their eucalyptus-bright, citrus-sweet oils. The queen of spices, GI-certified to Kandy.",
  "Whole Cloves": "Sun-dried flower buds with a deep, numbing warmth and a single drop of sweetness. Pungent enough to perfume a whole pot from just a few.",
  "Whole Nutmeg": "Whole seeds from Sabaragamuwa, grated fresh for a sweet, woody warmth that bottled powder can never hold. Each nut keeps for years.",
  "Black Peppercorns": "Vine-ripened and sun-dried in the hill country — sharp, fragrant and floral, with a heat that builds slowly rather than burning.",
  "Ground Turmeric": "Stone-milled from golden Southern Province roots, earthy and warm with a gentle bitterness and a colour that stains everything it touches gold.",
};

/* ---- featured photo card (tap → product) ---- */
function FlowFeaturedCard({ spice, market, onOpen }) {
  const price = market === "local" ? spice.lkr : spice.usd;
  return (
    <button onClick={onOpen} style={{ display: "block", textAlign: "left", border: 0, padding: 0, cursor: "pointer", background: "none", width: "100%" }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
        <SpicePhoto spice={spice} ratio="4 / 5" label={false} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 38%, rgba(20,16,12,.78) 100%)" }} />
        <div style={{ position: "absolute", left: 14, top: 14 }}><Badge kind={spice.badge} /></div>
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 13 }}>
          <h3 className="disp" style={{ fontSize: 23, color: "#FDFAF5", margin: 0, lineHeight: 1.05 }}>{spice.name}</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 13, color: "rgba(253,250,245,.82)" }}>{spice.latin}</span>
            <span className="disp" style={{ fontSize: 20, color: "#E6B860", fontWeight: 600 }}>{price}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ---- 2-up catalog card (tap card → product, + button → add) ---- */
function FlowGridCard({ spice, market, accent, onOpen, onAdd }) {
  const price = market === "local" ? spice.lkr : spice.usd;
  return (
    <div className="aranya" onClick={onOpen} style={{ background: "var(--surface)", borderRadius: 7, overflow: "hidden", borderTop: `5px solid ${spice.color}`, boxShadow: "var(--shadow-sm)", cursor: "pointer" }}>
      <div style={{ position: "relative", padding: 10 }}>
        <div style={{ borderRadius: 4, overflow: "hidden" }}><SpicePhoto spice={spice} ratio="1 / 1" label={false} /></div>
        <div style={{ position: "absolute", top: 16, right: 16 }} onClick={(e) => e.stopPropagation()}><MHeart size={16} /></div>
      </div>
      <div style={{ padding: "2px 12px 13px" }}>
        <div className="eyebrow" style={{ color: spice.deep, fontSize: 9.5, display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span style={{ width: 10, height: 2, background: spice.color }} />{spice.badge}
        </div>
        <h3 className="disp" style={{ fontSize: 18.5, color: "var(--ink)", margin: "0 0 1px", lineHeight: 1.08 }}>{spice.name}</h3>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 12, color: "var(--muted)", margin: "0 0 9px" }}>{spice.latin}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="disp" style={{ fontSize: 21, color: "var(--ink)", fontWeight: 600, lineHeight: 1 }}>{price}</span>
          <button aria-label="Add to cart" onClick={(e) => { e.stopPropagation(); onAdd(); }} style={{ width: 38, height: 38, borderRadius: 9, cursor: "pointer", display: "grid", placeItems: "center", background: accent, border: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M12 12v4M10 14h4" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================= HOME ============================= */
function HomeScreen({ market, setMarket, accent, nav }) {
  const all = window.SPICES;
  const featured = [all[0], all[5], all[1]];
  return (
    <div>
      {/* hero */}
      <div style={{ position: "relative", height: 470, marginTop: -104, background: "#1A1A1A", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${HERO_IMG})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.5) 0%, rgba(0,0,0,.12) 32%, rgba(0,0,0,.2) 62%, rgba(26,26,26,.92) 100%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 118, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 34, height: 1.5, background: "var(--accent)", marginBottom: 15 }} />
          <div className="disp" style={{ fontSize: 44, fontWeight: 600, color: "#FDFAF5", letterSpacing: ".1em", lineHeight: 1 }}>ARANYA</div>
          <div className="disp" style={{ fontStyle: "italic", fontSize: 15, color: "var(--accent)", letterSpacing: ".26em", marginTop: 9 }}>CEYLON</div>
        </div>
        <div style={{ position: "absolute", left: 22, right: 22, bottom: 34 }}>
          <button onClick={nav.goCatalog} className="btn btn-intl" style={{ background: "#E6B860", color: "#1A1A1A", padding: "15px", fontSize: 15 }}>Shop the Harvest</button>
        </div>
      </div>

      {/* market */}
      <div style={{ padding: "18px 18px 4px" }}>
        <FlowMarketSeg market={market} setMarket={setMarket} />
      </div>

      {/* featured */}
      <section style={{ padding: "20px 0 28px" }}>
        <div style={{ padding: "0 18px", marginBottom: 14 }}>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 6 }}>Editorial · Hand-picked</div>
          <h2 className="disp" style={{ fontSize: 28, color: "var(--brand)", margin: 0, lineHeight: 1.05 }}>The Featured Harvest</h2>
        </div>
        <div className="noscroll" style={{ display: "flex", gap: 13, overflowX: "auto", padding: "4px 18px 6px", scrollSnapType: "x mandatory" }}>
          {featured.map((s) => <div key={s.name} style={{ flex: "0 0 220px", scrollSnapAlign: "start" }}><FlowFeaturedCard spice={s} market={market} onOpen={() => nav.openProduct(s)} /></div>)}
        </div>
      </section>

      {/* Browse by Category */}
      {window.MCategoryTiles && <MCategoryTiles nav={nav} />}

      {/* Story band — forest green */}
      {window.MStoryBand && <MStoryBand />}

      {/* What People Love */}
      {window.MBestsellers && <MBestsellers market={market} accent={accent} nav={nav} />}

      {/* Heritage — near-black */}
      {window.MHeritage && <MHeritage />}

      {/* Newsletter */}
      {window.MNewsletter && <MNewsletter accent={accent} />}

      {/* Footer */}
      {window.MFooter && <MFooter market={market} setMarket={setMarket} />}
    </div>
  );
}

/* ============================= CATALOG ============================= */
function CatalogScreen({ market, accent, nav }) {
  const all = window.SPICES;
  const [filter, setFilter] = sfUse("All");
  const chips = ["All", "Whole", "Ground", "Bestseller", "GI Certified"];
  const list = all.filter((s) => {
    if (filter === "All") return true;
    if (filter === "Whole" || filter === "Ground") return FORM_OF(s) === filter;
    return s.badge === filter;
  });
  return (
    <div style={{ background: "var(--surface)", minHeight: "100%" }}>
      <div style={{ background: "var(--bg)", padding: "22px 18px 18px", borderBottom: "1px solid var(--line)" }}>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 6 }}>Shop · All spices</div>
        <h1 className="disp" style={{ fontSize: 30, color: "var(--brand)", margin: 0, lineHeight: 1.04 }}>The 2026 Collection</h1>
        <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: "8px 0 0" }}>Single-origin, milled to order in the Kandy hills.</p>
      </div>
      <div className="noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "14px 18px", background: "var(--bg)" }}>
        {chips.map((c) => {
          const on = filter === c;
          return <button key={c} onClick={() => setFilter(c)} style={{ flex: "0 0 auto", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, padding: "8px 15px", borderRadius: 999, cursor: "pointer",
            border: on ? "1px solid var(--brand)" : "1px solid var(--line)", background: on ? "var(--brand)" : "#fff", color: on ? "#fff" : "var(--muted)" }}>{c === "Bestseller" ? "Bestsellers" : c}</button>;
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 18px 44px" }}>
        {list.map((s) => <FlowGridCard key={s.name} spice={s} market={market} accent={accent} onOpen={() => nav.openProduct(s)} onAdd={() => nav.addToCart(s, "100g", FORM_OF(s), 1)} />)}
      </div>
    </div>
  );
}

/* ============================= PRODUCT ============================= */
function ProductScreen({ spice, market, accent, nav, flowFmt, flowUnit, FLOW_MULT }) {
  const [weight, setWeight] = sfUse("100g");
  const [qty, setQty] = sfUse(1);
  const form = FORM_OF(spice);
  const unit = flowUnit({ spice, weight }, market);
  const promises = [["leaf", "Milled to order"], ["truck", "Ships within 24h"], ["shield", "Lab-tested purity"]];
  return (
    <div style={{ paddingBottom: 96 }}>
      {/* hero photo */}
      <div style={{ position: "relative", marginTop: -104 }}>
        <SpicePhoto spice={spice} ratio="1 / 1" label={false} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,12,.5) 0%, transparent 26%, transparent 70%, rgba(253,250,245,1) 100%)" }} />
        <div style={{ position: "absolute", left: 18, bottom: 16 }}><Badge kind={spice.badge} solid /></div>
      </div>

      <div style={{ padding: "4px 20px 0" }}>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 7 }}>{spice.origin}</div>
        <h1 className="disp" style={{ fontSize: 34, color: "var(--ink)", margin: "0 0 3px", lineHeight: 1.02 }}>{spice.name}</h1>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 16, color: "var(--muted)", margin: "0 0 10px" }}>{spice.latin}</p>
        <div style={{ marginBottom: 16 }}><Stars rating={spice.rating} reviews={spice.reviews} size={15} /></div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 20 }}>
          <span className="disp" style={{ fontSize: 32, color: "var(--brand)", fontWeight: 600, lineHeight: 1 }}>{flowFmt(unit, market)}</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)" }}>/ {weight} · {form}</span>
        </div>

        {/* weight selector */}
        <div className="eyebrow" style={{ color: "var(--muted)", marginBottom: 9 }}>Weight</div>
        <div style={{ display: "flex", gap: 9, marginBottom: 20 }}>
          {(spice.weights || ["50g", "100g", "250g"]).map((w) => {
            const on = w === weight;
            return <button key={w} onClick={() => setWeight(w)} style={{ flex: 1, padding: "13px 6px", borderRadius: 10, cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14,
              border: on ? `1.5px solid var(--brand)` : "1.5px solid var(--line)", background: on ? "rgba(15,110,86,.07)" : "#fff", color: on ? "var(--brand)" : "var(--ink)" }}>{w}</button>;
          })}
        </div>

        {/* qty */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <span className="eyebrow" style={{ color: "var(--muted)" }}>Quantity</span>
          <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 9, background: "#fff" }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" style={{ width: 42, height: 44, border: 0, background: "none", cursor: "pointer", fontSize: 20, color: "var(--ink)" }}>−</button>
            <span style={{ width: 34, textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 700 }}>{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} aria-label="Increase" style={{ width: 42, height: 44, border: 0, background: "none", cursor: "pointer", fontSize: 20, color: "var(--ink)" }}>+</button>
          </div>
        </div>

        {/* description */}
        <p className="prose" style={{ fontSize: 16, color: "var(--ink)", margin: "0 0 22px", lineHeight: 1.66 }}>{DESC[spice.name] || "Single-origin Ceylon spice, sourced direct from smallholder farms and milled to order for peak aroma."}</p>

        {/* promises */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {promises.map(([ic, t]) => (
            <div key={t} style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 11, padding: "13px 8px", textAlign: "center" }}>
              <div style={{ display: "grid", placeItems: "center", marginBottom: 7 }}><SIcon name={ic} size={20} stroke="var(--brand)" /></div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--ink)", lineHeight: 1.25 }}>{t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* sticky add bar */}
      <div style={{ position: "sticky", bottom: 0, marginTop: 22, padding: "12px 18px calc(12px + 26px)", background: "rgba(253,250,245,.94)", backdropFilter: "blur(10px)", borderTop: "1px solid var(--line)", display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", lineHeight: 1 }}>Total</div>
          <div className="disp" style={{ fontSize: 24, color: "var(--ink)", fontWeight: 600, lineHeight: 1.1 }}>{flowFmt(unit * qty, market)}</div>
        </div>
        <button onClick={() => nav.addToCart(spice, weight, form, qty)} className="btn" style={{ background: accent, color: "#fff", flex: 1, padding: "15px", fontSize: 15 }}>Add to cart</button>
      </div>
    </div>
  );
}

/* ============================= in-flow DRAWER ============================= */
function FlowDrawer({ open, onClose, market, setMarket, nav }) {
  const links = [["Shop all spices"], ["Bestsellers"], ["Whole spices"], ["Ground & powders"]];
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 90, pointerEvents: open ? "auto" : "none" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,12,8,.5)", opacity: open ? 1 : 0, transition: "opacity .3s" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 318, background: "var(--brand)", color: "#FDFAF5",
        transform: `translateX(${open ? 0 : -100}%)`, transition: "transform .34s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column", boxShadow: "8px 0 40px rgba(0,0,0,.3)", paddingTop: SAFE_TOP }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}><Seal size={28} tone="light" /><span className="disp" style={{ fontSize: 20, color: "#FDFAF5" }}>Aranya Ceylon</span></div>
          <button aria-label="Close" onClick={onClose} style={{ background: "none", border: 0, padding: 6, cursor: "pointer" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FDFAF5" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <nav style={{ padding: "8px 0", flex: 1 }}>
          {links.map(([l]) => (
            <a key={l} onClick={() => { onClose(); nav.goCatalog(); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", cursor: "pointer",
              fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 600, color: "#FDFAF5", borderBottom: "1px solid rgba(253,250,245,.1)" }}>
              {l}<Icon name="chevron" size={18} stroke="rgba(253,250,245,.6)" />
            </a>
          ))}
        </nav>
        <div style={{ padding: "16px 20px 30px", borderTop: "1px solid rgba(253,250,245,.14)" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(253,250,245,.55)", marginBottom: 10 }}>Shipping to</div>
          <FlowMarketSeg market={market} setMarket={setMarket} light />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, CatalogScreen, ProductScreen, FlowDrawer, FlowFeaturedCard, FlowGridCard, FORM_OF });
