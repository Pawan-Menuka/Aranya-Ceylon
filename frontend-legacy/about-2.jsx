/* Aranya Ceylon — About / Our Story (part 2): Region · Process · Closing CTA.
   Depends on home-common.jsx (Reveal, Liyawel, Eyebrow), image-slot.js.
   Exports RegionBleed, Process, ClosingCTA. */

/* ============ The region — full-bleed dark photo with overlay copy + stats ============ */
function RegionBleed() {
  const stats = [
    ["1,200m", "Average hill-country elevation"],
    ["6", "Single-origin growing regions"],
    ["< 3 wks", "From harvest to sealed pouch"],
  ];
  return (
    <section style={{ position: "relative", color: "#FDFAF5", overflow: "hidden" }}>
      <image-slot id="about-region" shape="rect" fit="cover" placeholder="Drop a hill-country landscape photo"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}></image-slot>
      <div style={{ position: "absolute", inset: 0, background: "#161412", opacity: .5 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,16,13,.7), rgba(15,110,86,.32))", mixBlendMode: "multiply", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "150px 40px 120px", textAlign: "center" }}>
        <Reveal><Eyebrow center light>The land</Eyebrow></Reveal>
        <Reveal delay={70}>
          <h2 className="disp" style={{ fontSize: "clamp(36px,4.6vw,64px)", margin: "20px 0 24px", lineHeight: 1.05, fontWeight: 600 }}>
            Grown in the mist of the Central Highlands
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="prose" style={{ fontSize: 18.5, color: "rgba(253,250,245,.86)", margin: "0 auto", maxWidth: 660 }}>
            Cool air, shaded slopes and slow ripening are what give Ceylon spice its perfume. The same wet hills that the spice routes once emptied into the holds of Rome and Cairo still grow the finest cinnamon and pepper on earth — and we work only within them.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="ab-stats" style={{ display: "flex", justifyContent: "center", gap: 0, margin: "56px auto 0", flexWrap: "wrap", maxWidth: 760 }}>
            {stats.map((s, i) => (
              <div key={s[0]} style={{ flex: "1 1 200px", padding: "8px 30px", borderLeft: i === 0 ? "none" : "1px solid rgba(253,250,245,.22)" }}>
                <div className="disp" style={{ fontSize: 46, color: "#E6B860", fontWeight: 600, lineHeight: 1 }}>{s[0]}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.74)", marginTop: 9, letterSpacing: ".02em" }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============ Freshness & process — four steps on surface ============ */
function Process() {
  const steps = [
    ["Peel & pick", "Bark is peeled in supple ribbons and pods picked by hand, plant by plant, each at the precise moment its oils peak."],
    ["Cure in shade", "We dry slowly in the shade — never forced with heat — so colour sets and aroma concentrates instead of flashing off."],
    ["Mill to order", "Whole spices are graded and sealed whole; powders are stone-milled in small lots only as orders come in."],
    ["Seal & ship", "Each pouch is sealed within 24 hours and sent at the height of aroma — tracked, insured, and never warehoused."],
  ];
  return (
    <section style={{ background: "var(--surface)", padding: "104px 0" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <Reveal><Eyebrow center>From tree to table</Eyebrow></Reveal>
          <Reveal delay={60}>
            <h2 className="disp" style={{ fontSize: "clamp(34px,3.8vw,52px)", color: "var(--brand)", margin: "16px 0 0", lineHeight: 1.05 }}>
              Four steps, none of them hurried
            </h2>
          </Reveal>
        </div>
        <div className="ab-steps" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 26 }}>
          {steps.map(([title, body], i) => (
            <Reveal key={title} delay={i * 80}>
              <div style={{ position: "relative", paddingTop: 30, borderTop: "2px solid var(--brand)" }}>
                <span style={{ position: "absolute", top: -20, left: 0, fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 600, color: "var(--brand)", background: "var(--surface)", paddingRight: 14, lineHeight: 1 }}>
                  0{i + 1}
                </span>
                <h3 className="disp" style={{ fontSize: 26, color: "var(--ink)", margin: "0 0 12px", lineHeight: 1.1 }}>{title}</h3>
                <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: 0 }}>{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ Closing CTA — cream, centered invitation to shop ============ */
function ClosingCTA({ market }) {
  return (
    <section style={{ background: "var(--bg)", padding: "112px 0" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
        <Reveal><Liyawel width={200} style={{ marginBottom: 36 }} /></Reveal>
        <Reveal delay={60}>
          <h2 className="disp" style={{ fontSize: "clamp(36px,4.4vw,58px)", color: "var(--brand)", margin: "0 0 18px", lineHeight: 1.04, fontWeight: 600 }}>
            Taste the difference the forest makes
          </h2>
        </Reveal>
        <Reveal delay={110}>
          <p className="prose" style={{ fontSize: 18, color: "var(--muted)", margin: "0 auto 36px", maxWidth: 520 }}>
            Start with a hill-country bestseller, or explore the full harvest — every lot single-origin, sealed at peak aroma.
          </p>
        </Reveal>
        <Reveal delay={160}>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="Catalog.html" className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "15px 34px", display: "inline-flex", textDecoration: "none" }}>
              Shop all spices
            </a>
            <a href="Catalog.html" className="btn btn-ghost" style={{ width: "auto", padding: "15px 34px", display: "inline-flex", textDecoration: "none" }}>
              Browse bestsellers
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

Object.assign(window, { RegionBleed, Process, ClosingCTA });
