/* Aranya Ceylon — homepage content sections (part 2):
   Heritage (dark + motif) · Newsletter · Footer */
const { useState: hfState } = React;

/* ---------- Heritage — name etymology & Kandyan craft (near-black, kin to hero) ---------- */
function Heritage() {
  return (
    <section style={{ background: "#1A1A1A", color: "#FDFAF5", padding: "120px 0", position: "relative", overflow: "hidden" }}>
      {/* faint vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 0%, rgba(15,110,86,.18), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 40px", position: "relative", textAlign: "center" }}>
        <Reveal><Liyawel width={300} style={{ marginBottom: 40 }} /></Reveal>
        <Reveal delay={60}><Eyebrow center light>The Name</Eyebrow></Reveal>
        <Reveal delay={100}>
          <h2 className="disp" style={{ fontSize: "clamp(40px,5vw,68px)", margin: "20px 0 0", lineHeight: 1.04, fontWeight: 600, letterSpacing: ".01em" }}>
            <span style={{ fontStyle: "italic" }}>Aranya</span> means <span style={{ color: "#E6B860" }}>the forest.</span>
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <p style={{ fontFamily: "var(--font-read)", fontSize: 18.5, lineHeight: 1.78, color: "rgba(253,250,245,.82)", maxWidth: 640, margin: "30px auto 0" }}>
            From the Sanskrit <em style={{ color: "rgba(253,250,245,.95)" }}>araṇya</em> — the wild woodland. For three thousand years the hill forests of Ceylon have given the world its finest cinnamon, carried along the spice routes from the Kandyan kingdom to the courts of Rome and Cairo. We carry that lineage forward: the same forests, the same hands, the same unhurried craft.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div style={{ display: "flex", justifyContent: "center", gap: 0, margin: "52px auto 0", flexWrap: "wrap", maxWidth: 760 }}>
            {[["3,000+", "Years of Ceylon spice trade"], ["100%", "Single-origin, island-grown"], ["1,200m", "Hill-country elevation"]].map((s, i) => (
              <div key={s[0]} style={{ flex: "1 1 200px", padding: "0 28px", borderLeft: i === 0 ? "none" : "1px solid rgba(253,250,245,.16)" }}>
                <div className="disp" style={{ fontSize: 44, color: "#E6B860", fontWeight: 600, lineHeight: 1 }}>{s[0]}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.7)", marginTop: 8, letterSpacing: ".02em" }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={240}><Liyawel width={300} style={{ marginTop: 52 }} /></Reveal>
      </div>
    </section>
  );
}

/* ---------- Newsletter — restrained, no popup ---------- */
function Newsletter() {
  const [email, setEmail] = hfState("");
  const [done, setDone] = hfState(false);
  return (
    <section style={{ background: "var(--surface)", padding: "92px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
        <Reveal><Eyebrow center>The Harvest List</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h2 className="disp" style={{ fontSize: 42, color: "var(--brand)", margin: "16px 0 12px", lineHeight: 1.05 }}>First pick of every harvest</h2>
        </Reveal>
        <Reveal delay={100}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 15.5, color: "var(--muted)", margin: "0 auto 30px", maxWidth: 460, lineHeight: 1.6 }}>
            Occasional notes on new lots, the stories behind them, and recipes worth your time. No noise — just the good stuff.
          </p>
        </Reveal>
        <Reveal delay={140}>
          {done ? (
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 16, color: "var(--brand)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 24, height: 24, borderRadius: 999, background: "var(--brand)", display: "grid", placeItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
              </span>
              Welcome to the list — check your inbox.
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) setDone(true); }}
              style={{ display: "flex", gap: 10, maxWidth: 480, margin: "0 auto" }}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                style={{ flex: 1, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "14px 18px", fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink)", outline: "none" }} />
              <button type="submit" className="btn btn-intl" style={{ width: "auto", padding: "14px 26px", whiteSpace: "nowrap" }}>Join the list</button>
            </form>
          )}
        </Reveal>
        <Reveal delay={180}>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)", marginTop: 18, opacity: .8 }}>No spam, ever. Unsubscribe in one click.</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Footer — forest green mega footer ---------- */
function FootCol({ title, links }) {
  return (
    <div>
      <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 18 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map(([label, href]) => <a key={label} href={href || "#"} style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "rgba(253,250,245,.82)", transition: "color .15s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(253,250,245,.82)"}>{label}</a>)}
      </div>
    </div>
  );
}

function Footer({ market, setMarket }) {
  return (
    <footer style={{ background: "var(--brand)", color: "#FDFAF5" }}>
      <div style={{ borderBottom: "1px solid rgba(253,250,245,.14)" }}><Liyawel width={240} color="rgba(230,184,96,.5)" style={{ padding: "30px 0" }} /></div>
      <div className="foot-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 40px 40px", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 48 }}>
        <div style={{ maxWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
            <Seal size={42} tone="light" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="disp" style={{ fontSize: 26, color: "#FDFAF5", letterSpacing: ".02em" }}>Aranya Ceylon</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>Forest Sourced Spices</span>
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "rgba(253,250,245,.78)", lineHeight: 1.65, margin: "0 0 22px" }}>
            Single-origin spice, lifted from the hill forests of Sri Lanka and shipped at peak aroma. Spice, as the forest intended.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {["instagram", "facebook", "pinterest"].map((s) => (
              <a key={s} href="#" aria-label={s} style={{ width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(253,250,245,.28)", display: "grid", placeItems: "center" }}>
                <span style={{ width: 7, height: 7, borderRadius: 9, background: "#E6B860" }} />
              </a>
            ))}
          </div>
        </div>
        <FootCol title="Shop" links={[["All Spices", "Catalog.html"], ["Whole Spices", "Catalog.html"], ["Ground & Powders", "Catalog.html"], ["Gift Sets", "Gifts.html"], ["Bestsellers", "Catalog.html"]]} />
        <FootCol title="Company" links={[["Our Story", "About.html"], ["Sourcing", "About.html"], ["Recipes", "Recipes.html"], ["Journal", "Journal.html"], ["Stockists", "About.html"]]} />
        <FootCol title="Support" links={[["Contact", "Contact.html"], ["Shipping & Returns", "Shipping.html"], ["Track Order", "Account.html"], ["FAQ", "FAQ.html"], ["Wholesale", "Wholesale.html"]]} />
      </div>
      {/* trust strip */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", padding: "26px 0", borderTop: "1px solid rgba(253,250,245,.14)", borderBottom: "1px solid rgba(253,250,245,.14)" }}>
          {[["GI Certified", "Protected origin"], ["Organic", "EU & USDA"], ["Secure Checkout", "256-bit SSL"], ["Worldwide Shipping", "Tracked & insured"]].map((t) => (
            <div key={t[0]} style={{ display: "flex", alignItems: "center", gap: 11, flex: "1 1 200px" }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(230,184,96,.45)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <span style={{ width: 6, height: 6, borderRadius: 9, background: "#E6B860" }} />
              </span>
              <span style={{ lineHeight: 1.2 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "#FDFAF5", display: "block" }}>{t[0]}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "rgba(253,250,245,.6)" }}>{t[1]}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* bottom bar */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "22px 40px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.6)" }}>© 2026 Aranya Ceylon. All rights reserved.</span>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", background: "rgba(253,250,245,.1)", borderRadius: 999, padding: 3 }}>
            <button onClick={() => setMarket("intl")} style={{ border: 0, cursor: "pointer", borderRadius: 999, padding: "6px 13px", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
              background: market === "intl" ? "#E6B860" : "transparent", color: market === "intl" ? "#1A1A1A" : "rgba(253,250,245,.8)" }}>USD</button>
            <button onClick={() => setMarket("local")} style={{ border: 0, cursor: "pointer", borderRadius: 999, padding: "6px 13px", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700,
              background: market === "local" ? "#E6B860" : "transparent", color: market === "local" ? "#1A1A1A" : "rgba(253,250,245,.8)" }}>LKR</button>
          </div>
          {[["Privacy", "Privacy.html"], ["Terms", "Terms.html"], ["Cookies", "Cookies.html"]].map(([l, href]) => <a key={l} href={href} style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.6)", transition: "color .15s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(253,250,245,.6)"}>{l}</a>)}
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Heritage, Newsletter, Footer });
