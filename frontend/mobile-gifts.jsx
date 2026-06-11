/* Aranya Ceylon — MOBILE Gifts page (faithful port of gifts.jsx).
   Hero · featured signature set · all sets (ribboned GiftBox) · finishing band · occasions · corporate.
   Depends on mobile-pages-common.jsx, gifts-data.js (GIFTS, GIFT_OCCASIONS), catalog-data.js,
   shared.jsx (Seal), home-common.jsx (Eyebrow, Liyawel). */
const { useState: mgUse } = React;

function mgCat(name) { return (window.CATALOG || []).find((p) => p.name === name); }
function mgNum(p) { return parseFloat(String(p).replace(/[^0-9.]/g, "")); }
const MG_JAR_MULT = { "50g": 0.6, "100g": 1, "250g": 2.3 };
function mgPrice(set, market) { return market === "local" ? set.lkr : set.usd; }
function mgFmt(n, market) { return market === "local" ? "Rs " + Math.round(n).toLocaleString("en-US") : "$" + n.toFixed(2); }
function mgAlaCarte(set, market) {
  const mult = MG_JAR_MULT[set.jar] || 1; let sum = 0;
  set.contents.forEach((nm) => { const p = mgCat(nm); if (p) sum += mgNum(market === "local" ? p.lkr : p.usd) * mult; });
  return sum;
}
function mgSavePct(set, market) { const alc = mgAlaCarte(set, market), price = mgNum(mgPrice(set, market)); return (!alc || alc <= price) ? 0 : Math.round((1 - price / alc) * 100); }

function MGiftBadge({ kind }) {
  const map = { "Bestselling gift": ["#BA7517", "#fff"], "New": ["#1A1A1A", "#fff"], "Limited": ["#0F6E56", "#fff"] };
  const c = map[kind] || ["#1A1A1A", "#fff"];
  return <span style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: c[1], background: c[0], borderRadius: 999, padding: "5px 10px", lineHeight: 1, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,.18)" }}>{kind}</span>;
}

/* ribboned box placeholder */
function MGiftBox({ set, ratio = "4 / 3" }) {
  const dots = set.contents.map((nm) => (mgCat(nm) || {}).color || set.color);
  return (
    <div className="grain" style={{ position: "relative", width: "100%", aspectRatio: ratio, overflow: "hidden",
      background: `radial-gradient(120% 120% at 50% 0%, ${set.surface} 0%, ${set.surface} 46%, rgba(0,0,0,.06) 100%)` }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,.28), transparent 30%, transparent 72%, rgba(40,28,12,.1))" }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 70px rgba(40,28,12,.14)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "calc(50% - 19px)", height: 38, background: `linear-gradient(180deg, ${set.base}, ${set.color} 55%, ${set.deep})`, boxShadow: "0 4px 14px rgba(0,0,0,.16)" }}>
        <span style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1.4, background: "rgba(230,184,96,.7)", transform: "translateY(-50%)" }} />
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "calc(50% - 22px)", width: 44, background: `linear-gradient(90deg, ${set.base}, ${set.color} 55%, ${set.deep})`, boxShadow: "0 0 16px rgba(0,0,0,.14)" }}>
        <span style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1.4, background: "rgba(230,184,96,.7)", transform: "translateX(-50%)" }} />
      </div>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 52, height: 52, borderRadius: 999,
        background: "radial-gradient(circle at 38% 32%, #FDFAF5, #F1E7D3)", border: "1px solid rgba(201,162,75,.6)", boxShadow: "0 6px 16px rgba(0,0,0,.26)", display: "grid", placeItems: "center" }}>
        <Seal size={38} />
      </div>
      <div style={{ position: "absolute", left: 14, bottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ display: "inline-flex" }}>
          {dots.map((c, i) => <span key={i} style={{ width: 14, height: 14, borderRadius: 999, background: c, border: "2px solid rgba(253,250,245,.92)", marginLeft: i ? -5 : 0, boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />)}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: set.deep }}>{set.contents.length} spices</span>
      </div>
    </div>
  );
}

function MGiftContents({ set }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 14px" }}>
      {set.contents.map((nm) => {
        const c = (mgCat(nm) || {}).color || set.color;
        return (
          <div key={nm} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: c, flex: "0 0 auto" }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm}</span>
          </div>
        );
      })}
    </div>
  );
}

function MGiftPrice({ set, market, size = 26 }) {
  const alc = mgAlaCarte(set, market), save = mgSavePct(set, market);
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
      <span className="disp" style={{ fontSize: size, color: "var(--ink)", fontWeight: 600, lineHeight: 1 }}>{mgPrice(set, market)}</span>
      {save > 0 && <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--muted)", textDecoration: "line-through" }}>{mgFmt(alc, market)}</span>}
      {save > 0 && <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--brand)", background: "rgba(15,110,86,.1)", borderRadius: 999, padding: "4px 8px" }}>Save {save}%</span>}
    </div>
  );
}

function MGIcon({ name, size = 19, stroke = "#E6B860", w = 1.7 }) {
  const p = {
    gift: <><rect x="3" y="8" width="18" height="13" rx="1.5" /><path d="M3 12h18M12 8v13" /><path d="M12 8C12 5 10.5 3.5 8.7 3.5 7.3 3.5 6.5 4.4 6.5 5.5 6.5 7.3 9 8 12 8zM12 8c0-3 1.5-4.5 3.3-4.5 1.4 0 2.2.9 2.2 2 0 1.8-2.5 2.5-5.5 2.5z" /></>,
    pen: <><path d="M14 4l6 6L9 21l-6 1.5L4.5 16 14 4z" /><path d="M12.5 6.5L17.5 11.5" /></>,
    plane: <><path d="M21 4L3 11l6 2 2 6 3-5 5 5 2-15z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
  }[name];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p}</svg>;
}

function MGiftCard({ set, market, accent }) {
  const [added, setAdded] = mgUse(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", background: "var(--surface)", borderRadius: 12, overflow: "hidden", borderTop: `5px solid ${set.color}`, boxShadow: "var(--shadow-sm)" }}>
      <div style={{ position: "relative" }}>
        <MGiftBox set={set} ratio="4 / 3" />
        {set.badge && <div style={{ position: "absolute", top: 12, left: 12 }}><MGiftBadge kind={set.badge} /></div>}
      </div>
      <div style={{ padding: "16px 16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 className="disp" style={{ fontSize: 22, color: "var(--ink)", margin: "0 0 3px", lineHeight: 1.08 }}>{set.name}</h3>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14, color: "var(--muted)", margin: "0 0 14px" }}>{set.tagline}</p>
        <div style={{ marginBottom: 16 }}><MGiftContents set={set} /></div>
        <div style={{ height: 1, background: "var(--line)", margin: "auto 0 14px" }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <MGiftPrice set={set} market={market} size={24} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap", paddingBottom: 3 }}>{set.contents.length} × {set.jar}</span>
        </div>
        <button onClick={() => { setAdded(true); setTimeout(() => setAdded(false), 1300); }}
          style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, padding: "13px", borderRadius: "var(--radius)", cursor: "pointer",
            border: `1.5px solid ${accent}`, background: added ? accent : "transparent", color: added ? "#fff" : accent, transition: "background .15s, color .15s" }}>
          {added ? "Added to basket ✓" : "Add gift box"}
        </button>
      </div>
    </div>
  );
}

function MobileGifts({ market = "intl" }) {
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  const sets = window.GIFTS || [];
  const featured = sets.find((g) => g.featured) || sets[0];
  const rest = sets.filter((g) => !g.featured);
  const occ = window.GIFT_OCCASIONS || [];
  const [fAdded, setFAdded] = mgUse(false);
  const finish = [
    ["gift", "The signature box", "Hand-packed into our forest-green keepsake box and tied with gold cord — no extra wrapping needed."],
    ["pen", "A note in your hand", "Add a message at checkout and we'll write it onto a cotton card, tucked inside with the spices."],
    ["plane", "Sent straight to them", "Ship direct to the recipient with a price-free packing slip — just the spices, and your words."],
  ];

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      <MPageBar title="Gifts & Sets" onBack={() => {}} />

      {/* hero */}
      <header style={{ position: "relative", background: "#161412", color: "#FDFAF5", overflow: "hidden", padding: "44px 22px 38px" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(155deg, rgba(15,110,86,.4), rgba(11,16,13,.7))" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 70% at 80% 10%, rgba(230,184,96,.16), transparent 55%)" }} />
        <div style={{ position: "relative" }}>
          <Eyebrow light>Gifts &amp; Sets</Eyebrow>
          <h1 className="disp" style={{ fontSize: 46, lineHeight: 0.98, margin: "16px 0 0", fontWeight: 600 }}>Spice, <span style={{ fontStyle: "italic", color: "#E6B860" }}>beautifully</span> given.</h1>
          <p className="prose" style={{ fontSize: 15.5, color: "rgba(253,250,245,.85)", margin: "18px 0 0", maxWidth: 320 }}>
            Curated boxes of single-origin Ceylon spice — hand-wrapped, ribboned, and ready to give.
          </p>
          <div style={{ display: "flex", gap: 22, marginTop: 26, flexWrap: "wrap", borderTop: "1px solid rgba(253,250,245,.18)", paddingTop: 20 }}>
            {[["gift", "Gift wrap"], ["pen", "Note card"], ["plane", "Ships worldwide"]].map(([ic, t]) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <MGIcon name={ic} size={17} />
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "rgba(253,250,245,.82)", fontWeight: 500 }}>{t}</span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* featured signature set */}
      <section style={{ background: "var(--bg)", padding: "40px 18px" }}>
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)", marginBottom: 22 }}>
          <MGiftBox set={featured} ratio="5 / 4" />
          <div style={{ position: "absolute", top: 14, left: 14 }}><MGiftBadge kind={featured.badge} /></div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: featured.color }} />
        </div>
        <Eyebrow>The signature gift</Eyebrow>
        <h2 className="disp" style={{ fontSize: 32, color: "var(--brand)", margin: "10px 0 4px", lineHeight: 1.02 }}>{featured.name}</h2>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 17, color: "var(--muted)", margin: "0 0 14px" }}>{featured.tagline}</p>
        <p className="prose" style={{ fontSize: 15.5, color: "var(--ink)", margin: "0 0 20px" }}>{featured.blurb}</p>
        <div style={{ padding: "18px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
          <div className="eyebrow" style={{ color: "var(--muted)", marginBottom: 12 }}>In the box · {featured.contents.length} × {featured.jar} jars</div>
          <MGiftContents set={featured} />
        </div>
        <div style={{ marginBottom: 18 }}><MGiftPrice set={featured} market={market} size={32} /></div>
        <button onClick={() => { setFAdded(true); setTimeout(() => setFAdded(false), 1300); }} className="btn" style={{ background: accent, color: "#fff", padding: "15px", fontSize: 15 }}>{fAdded ? "Added to basket ✓" : "Add gift box"}</button>
      </section>

      {/* all sets */}
      <section style={{ background: "var(--surface)", padding: "44px 18px", borderTop: "1px solid var(--line)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Eyebrow center>All gift sets</Eyebrow>
          <h2 className="disp" style={{ fontSize: 28, color: "var(--brand)", margin: "10px 0 0", lineHeight: 1.05 }}>A box for every kind of cook</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {rest.map((s) => <MGiftCard key={s.id} set={s} market={market} accent={accent} />)}
          {/* build your own */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", borderRadius: 12, border: "1.5px dashed var(--gold-line)", padding: "34px 24px" }}>
            <span style={{ width: 54, height: 54, borderRadius: 999, display: "grid", placeItems: "center", background: "#fff", border: "1px solid var(--line)", marginBottom: 16 }}><MGIcon name="plus" size={24} stroke="var(--brand)" w={2} /></span>
            <h3 className="disp" style={{ fontSize: 23, color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.1 }}>Build your own box</h3>
            <p className="prose" style={{ fontSize: 14, color: "var(--muted)", margin: 0, maxWidth: 260 }}>Hand-pick any spices from the range and we'll wrap them together as a gift.</p>
          </div>
        </div>
      </section>

      {/* finishing band */}
      <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "48px 18px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 80% at 85% 0%, rgba(29,158,117,.4), transparent 55%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", textAlign: "center", marginBottom: 30 }}>
          <Liyawel width={170} color="rgba(230,184,96,.6)" style={{ marginBottom: 18 }} />
          <Eyebrow center light>The finishing</Eyebrow>
          <h2 className="disp" style={{ fontSize: 28, margin: "12px 0 0", lineHeight: 1.04, fontWeight: 600 }}>Every gift, beautifully finished</h2>
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14 }}>
          {finish.map(([ic, t, b]) => (
            <div key={t} style={{ background: "rgba(253,250,245,.05)", border: "1px solid rgba(253,250,245,.16)", borderRadius: 14, padding: "22px 20px" }}>
              <span style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(230,184,96,.16)", border: "1px solid rgba(230,184,96,.36)", marginBottom: 14 }}><MGIcon name={ic} size={21} /></span>
              <h3 className="disp" style={{ fontSize: 22, margin: "0 0 7px", lineHeight: 1.12 }}>{t}</h3>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "rgba(253,250,245,.78)", margin: 0, lineHeight: 1.6 }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* occasions */}
      <section style={{ background: "var(--bg)", padding: "44px 18px" }}>
        <Eyebrow>Find the right one</Eyebrow>
        <h2 className="disp" style={{ fontSize: 27, color: "var(--brand)", margin: "10px 0 20px", lineHeight: 1.04 }}>Gifts by occasion</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {occ.map((o) => (
            <div key={o.name} style={{ position: "relative", borderRadius: 12, overflow: "hidden", aspectRatio: "3 / 4", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${o.color}, ${o.deep})` }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 42%, rgba(0,0,0,.6))" }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: o.color }} />
              <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, color: "#fff" }}>
                <div className="eyebrow" style={{ color: "rgba(253,250,245,.82)", marginBottom: 5, fontSize: 9 }}>{o.note}</div>
                <h3 className="disp" style={{ fontSize: 22, margin: 0, lineHeight: 1.05, textShadow: "0 1px 12px rgba(0,0,0,.4)" }}>{o.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* corporate */}
      <section style={{ background: "var(--surface)", padding: "40px 22px", borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M14 21V9h4a2 2 0 0 1 2 2v10M3 21h18M7 7h3M7 11h3M7 15h3" /></svg>
          <span className="eyebrow" style={{ color: "var(--accent)" }}>Corporate &amp; bulk gifting</span>
        </div>
        <h2 className="disp" style={{ fontSize: 26, color: "var(--brand)", margin: "0 0 12px", lineHeight: 1.05 }}>Gifting for clients, teams &amp; events?</h2>
        <p className="prose" style={{ fontSize: 15, color: "var(--muted)", margin: "0 0 20px" }}>Custom-branded boxes, bespoke selections and volume orders with your own message card — shipped to one address or many.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <button className="btn" style={{ background: accent, color: "#fff", padding: "14px", fontSize: 14.5 }}>Enquire about corporate gifts</button>
          <button className="btn btn-ghost" style={{ padding: "14px", fontSize: 14.5 }}>See wholesale &amp; trade</button>
        </div>
      </section>

      <MPageFooter market={market} />
    </div>
  );
}

Object.assign(window, { MobileGifts });
