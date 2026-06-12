/* Aranya Ceylon — MOBILE About / Our Story (port of about.jsx + about-2.jsx).
   Hero · statement · origin story · sourcing (growers) · region bleed (stats) · process · closing CTA.
   Photo slots become on-brand tinted gradient placeholders.
   Depends on mobile-pages-common.jsx, home-common.jsx (Eyebrow, Liyawel), shared.jsx (Seal). */

function MGrad({ from, to, ratio, radius = 10, children, scrim = true }) {
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", aspectRatio: ratio, boxShadow: "var(--shadow-md)" }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${from}, ${to})` }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 55% at 72% 18%, rgba(255,255,255,.1), transparent 60%)" }} />
      {scrim && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(11,16,13,.6))" }} />}
      {children}
    </div>
  );
}

function MobileAbout({ market = "intl" }) {
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  const growers = [
    ["#3C7D63", "#0B3C30", "Matale Hills", "Cinnamon peelers"],
    ["#7C9A5A", "#566F37", "Kandy District", "Cardamom pickers"],
    ["#D99A1C", "#A8740F", "Southern Province", "Turmeric curers"],
  ];
  const stats = [["1,200m", "Average hill-country elevation"], ["6", "Single-origin growing regions"], ["< 3 wks", "From harvest to sealed pouch"]];
  const steps = [
    ["Peel & pick", "Bark is peeled in supple ribbons and pods picked by hand, plant by plant, each at the precise moment its oils peak."],
    ["Cure in shade", "We dry slowly in the shade — never forced with heat — so colour sets and aroma concentrates instead of flashing off."],
    ["Mill to order", "Whole spices are graded and sealed whole; powders are stone-milled in small lots only as orders come in."],
    ["Seal & ship", "Each pouch is sealed within 24 hours and sent at the height of aroma — tracked, insured, never warehoused."],
  ];

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      {/* hero (dark, photo overlay) */}
      <header style={{ position: "relative", minHeight: 540, background: "#161412", color: "#FDFAF5", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(155deg, rgba(15,110,86,.4), rgba(11,16,13,.72))" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 60% at 75% 12%, rgba(230,184,96,.14), transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,6,.4) 0%, transparent 30%, transparent 50%, rgba(10,8,6,.9) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2 }}><MPageBar title="Our Story" onBack={() => {}} /></div>
        <div style={{ position: "relative", marginTop: "auto", padding: "0 22px 40px" }}>
          <Eyebrow light>Our Story</Eyebrow>
          <h1 className="disp" style={{ fontSize: "clamp(40px,12vw,56px)", lineHeight: 0.98, margin: "16px 0 0", fontWeight: 600 }}>
            Spice, as the<br /><span style={{ fontStyle: "italic", color: "#E6B860" }}>forest</span> intended.
          </h1>
          <p className="prose" style={{ fontSize: 15.5, color: "rgba(253,250,245,.84)", margin: "20px 0 0", maxWidth: 330 }}>
            A small house of spice from the hill forests of Sri Lanka — peeling, drying and milling by hand, and shipping at the height of aroma.
          </p>
        </div>
      </header>

      {/* statement */}
      <section style={{ background: "var(--bg)", padding: "52px 24px 44px", textAlign: "center" }}>
        <Liyawel width={190} style={{ marginBottom: 28 }} />
        <p className="disp" style={{ fontSize: "clamp(24px,6.5vw,30px)", lineHeight: 1.3, color: "var(--ink)", margin: 0, fontWeight: 500, textWrap: "balance" }}>
          Most spice is grown to be stored. <span style={{ color: "var(--brand)" }}>Ours is grown to be smelled</span> — picked on its own clock, cured in the shade, and sent while the oils are still loud.
        </p>
        <p className="prose" style={{ fontSize: 15.5, color: "var(--muted)", margin: "26px auto 0", maxWidth: 340 }}>
          Aranya began with a simple frustration: the cinnamon, cardamom and pepper sold the world over bore little resemblance to what grew on the hillsides we knew. So we went back to the forest.
        </p>
      </section>

      {/* origin story */}
      <section style={{ background: "var(--bg)", padding: "8px 22px 52px" }}>
        <MGrad from="#1D9E75" to="#0B3C30" ratio="4 / 5" scrim={false} />
        <div style={{ marginTop: 26 }}>
          <Eyebrow>How it began</Eyebrow>
          <h2 className="disp" style={{ fontSize: 32, color: "var(--brand)", margin: "12px 0 18px", lineHeight: 1.05 }}>A walk back into the hill country</h2>
          <div className="prose" style={{ fontSize: 16, color: "var(--ink)", display: "flex", flexDirection: "column", gap: 16, lineHeight: 1.68 }}>
            <p style={{ margin: 0 }}>The first quills we ever sold came from a single family's plot above Matale — bark peeled in long, supple ribbons and rolled by hand the way it had been for generations. They snapped clean, dissolved to silk, and smelled of honey and citrus rather than the blunt heat most of us had come to accept as cinnamon.</p>
            <p style={{ margin: 0 }}>We realised the difference was not a secret recipe but a chain of small, unhurried decisions — which plant to pick, which day to peel, how long to let the sun do its work. Keep that chain intact and the spice arrives extraordinary.</p>
            <p style={{ margin: 0 }}>Aranya is our attempt to keep the chain intact, and to pay the people who hold it what their craft is worth.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 26 }}>
            <span style={{ width: 42, height: 1, background: "var(--gold-line)" }} />
            <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20, color: "var(--muted)" }}>The Aranya family</span>
          </div>
        </div>
      </section>

      {/* sourcing — forest green + grower portraits */}
      <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "52px 22px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 70% at 12% 0%, rgba(29,158,117,.4), transparent 55%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <Eyebrow light>The growers</Eyebrow>
          <h2 className="disp" style={{ fontSize: 32, margin: "12px 0 18px", lineHeight: 1.05, fontWeight: 600 }}>We buy from the hands that grow it</h2>
          <p className="prose" style={{ fontSize: 16, color: "rgba(253,250,245,.84)", margin: "0 0 30px", lineHeight: 1.68 }}>
            No brokers, no anonymous lots. Every spice we sell is traced to a named estate or smallholding, bought at a price set with the grower rather than against them. We visit at harvest, taste at the source, and carry only what we'd keep for our own kitchen.
          </p>
          <div className="noscroll" style={{ display: "flex", gap: 13, overflowX: "auto", paddingBottom: 4 }}>
            {growers.map(([f, t, place, role]) => (
              <figure key={place} style={{ margin: 0, flex: "0 0 200px" }}>
                <MGrad from={f} to={t} ratio="3 / 4">
                  <figcaption style={{ position: "absolute", left: 16, bottom: 14 }}>
                    <div className="disp" style={{ fontSize: 22, color: "#fff", lineHeight: 1 }}>{place}</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: ".06em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 6 }}>{role}</div>
                  </figcaption>
                </MGrad>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* region bleed — dark + stats */}
      <section style={{ position: "relative", color: "#FDFAF5", overflow: "hidden", padding: "64px 24px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #14110E, #0F2E25)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 60% at 50% 0%, rgba(29,158,117,.3), transparent 60%)" }} />
        <div style={{ position: "relative" }}>
          <Eyebrow center light>The land</Eyebrow>
          <h2 className="disp" style={{ fontSize: "clamp(30px,8vw,38px)", margin: "14px 0 18px", lineHeight: 1.05, fontWeight: 600 }}>Grown in the mist of the Central Highlands</h2>
          <p className="prose" style={{ fontSize: 15.5, color: "rgba(253,250,245,.86)", margin: "0 auto", maxWidth: 330, lineHeight: 1.68 }}>
            Cool air, shaded slopes and slow ripening are what give Ceylon spice its perfume. The same wet hills the spice routes once emptied into the holds of Rome and Cairo still grow the finest cinnamon and pepper on earth.
          </p>
          <div style={{ display: "flex", justifyContent: "center", margin: "36px auto 0", maxWidth: 360 }}>
            {stats.map((s, i) => (
              <div key={s[0]} style={{ flex: 1, padding: "0 10px", borderLeft: i === 0 ? "none" : "1px solid rgba(253,250,245,.22)" }}>
                <div className="disp" style={{ fontSize: 30, color: "#E6B860", fontWeight: 600, lineHeight: 1 }}>{s[0]}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "rgba(253,250,245,.74)", marginTop: 8, lineHeight: 1.3 }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* process — four steps */}
      <section style={{ background: "var(--surface)", padding: "52px 22px" }}>
        <div style={{ textAlign: "center", marginBottom: 34 }}>
          <Eyebrow center>From tree to table</Eyebrow>
          <h2 className="disp" style={{ fontSize: 30, color: "var(--brand)", margin: "12px 0 0", lineHeight: 1.05 }}>Four steps, none of them hurried</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {steps.map(([title, body], i) => (
            <div key={title} style={{ position: "relative", paddingTop: 26, borderTop: "2px solid var(--brand)" }}>
              <span style={{ position: "absolute", top: -19, left: 0, fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, color: "var(--brand)", background: "var(--surface)", paddingRight: 12, lineHeight: 1 }}>0{i + 1}</span>
              <h3 className="disp" style={{ fontSize: 24, color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.1 }}>{title}</h3>
              <p className="prose" style={{ fontSize: 15, color: "var(--muted)", margin: 0, lineHeight: 1.62 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* closing CTA */}
      <section style={{ background: "var(--bg)", padding: "56px 24px", textAlign: "center" }}>
        <Liyawel width={180} style={{ marginBottom: 28 }} />
        <h2 className="disp" style={{ fontSize: "clamp(32px,8vw,40px)", color: "var(--brand)", margin: "0 0 16px", lineHeight: 1.04, fontWeight: 600 }}>Taste the difference the forest makes</h2>
        <p className="prose" style={{ fontSize: 16, color: "var(--muted)", margin: "0 auto 28px", maxWidth: 320 }}>
          Start with a hill-country bestseller, or explore the full harvest — every lot single-origin, sealed at peak aroma.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, maxWidth: 320, margin: "0 auto" }}>
          <button className="btn" style={{ background: accent, color: "#fff", padding: "15px", fontSize: 15 }}>Shop all spices</button>
          <button className="btn btn-ghost" style={{ padding: "14px", fontSize: 14.5 }}>Browse bestsellers</button>
        </div>
      </section>

      <MPageFooter market={market} />
    </div>
  );
}

Object.assign(window, { MobileAbout });
