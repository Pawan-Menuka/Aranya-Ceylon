/* Aranya Ceylon — canvas composition */
const { useState } = React;

function Row({ Card, market, spices }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 300px)", gap: 22 }}>
      {spices.map((s) => <Card key={s.name} spice={s} market={market} />)}
    </div>
  );
}

function MarketTag({ market }) {
  const intl = market === "intl";
  return (
    <div className="aranya" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ width: 10, height: 10, borderRadius: 9, background: intl ? "var(--accent)" : "var(--brand)" }} />
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: ".02em" }}>
        {intl ? "International" : "Local market"}
      </span>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)" }}>
        {intl ? "USD · amber CTA" : "LKR · forest CTA"}
      </span>
    </div>
  );
}

function Notes() {
  return (
    <div className="aranya" style={{ width: 1180, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "34px 40px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Seal size={48} />
        <div>
          <div className="disp" style={{ fontSize: 30, color: "var(--brand)", lineHeight: 1.05 }}>Aranya Ceylon — First Build</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", marginTop: 4 }}>First build · 3 navbar directions, 3 card directions, shown in both markets</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 28, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 8 }}>The direction I chose</div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.6, color: "var(--ink)", margin: 0 }}>
            Editorial restraint × modern luxury. Warm cream ground, Cormorant for display, Plus Jakarta for UI, gold hairlines, generous whitespace. Motifs kept minimal — the spice colour does the talking.
          </p>
        </div>
        <div>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 8 }}>What the cards explore</div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.6, color: "var(--ink)", margin: 0 }}>
            <b>A · Classic</b> — the brand-doc literal: 5px spice stripe, framed photo, hover quick-view.<br />
            <b>B · Immersive</b> — photo-forward, name over image, slide-up actions.<br />
            <b>C · Minimal</b> — type-led, spice colour as a restrained accent.
          </p>
        </div>
        <div>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 8 }}>Notes &amp; next steps</div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.6, color: "var(--muted)", margin: 0 }}>
            Imagery is styled placeholders (top-down spice on linen) — swap for real photography. Hover any card for quick-view. Mix &amp; match: e.g. Nav C + Card A. Tell me your picks and I'll refine + add mega-menu, mobile, and the rest of the grid.
          </p>
        </div>
      </div>
    </div>
  );
}

const PICK = [window.SPICES[0], window.SPICES[1], window.SPICES[5]]; // cinnamon, cardamom, turmeric
const ALL = window.SPICES;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="notes" title="Design notes" subtitle="Context & reasoning">
        <DCArtboard id="notes-a" label="Brief & approach" width={1180} height={300}><Notes /></DCArtboard>
      </DCSection>

      <DCSection id="nav-a" title="Navbar A — Symmetric seal" subtitle="Centered emblem, split utilities, cream">
        <DCArtboard id="na" label="A · Symmetric (USD)" width={1280} height={130}><NavA currency="USD" /></DCArtboard>
        <DCArtboard id="na2" label="A · Sri Lanka (LKR)" width={1280} height={130}><NavA currency="LKR" /></DCArtboard>
      </DCSection>

      <DCSection id="nav-b" title="Navbar B — Deep forest" subtitle="Dark bar, inline search, bolder">
        <DCArtboard id="nb" label="B · Forest (USD)" width={1280} height={120}><NavB currency="USD" /></DCArtboard>
        <DCArtboard id="nb2" label="B · Sri Lanka (LKR)" width={1280} height={120}><NavB currency="LKR" /></DCArtboard>
      </DCSection>

      <DCSection id="nav-c" title="Navbar C — Two-tier editorial" subtitle="Utility strip + main row">
        <DCArtboard id="nc" label="C · Two-tier (USD)" width={1280} height={130}><NavC currency="USD" /></DCArtboard>
        <DCArtboard id="nc2" label="C · Sri Lanka (LKR)" width={1280} height={130}><NavC currency="LKR" /></DCArtboard>
      </DCSection>

      <DCSection id="card-a" title="Card A — Editorial Classic" subtitle="5px spice stripe · framed photo · hover quick-view">
        <DCArtboard id="ca-i" label="International · USD" width={1010} height={620}>
          <div style={{ background: "var(--bg)", padding: 28, borderRadius: 8 }}><MarketTag market="intl" /><Row Card={CardA} market="intl" spices={PICK} /></div>
        </DCArtboard>
        <DCArtboard id="ca-l" label="Local · LKR" width={1010} height={620}>
          <div style={{ background: "var(--bg)", padding: 28, borderRadius: 8 }}><MarketTag market="local" /><Row Card={CardA} market="local" spices={PICK} /></div>
        </DCArtboard>
      </DCSection>

      <DCSection id="card-b" title="Card B — Immersive" subtitle="Photo-forward · name on image · slide-up actions">
        <DCArtboard id="cb-i" label="International · USD" width={1010} height={650}>
          <div style={{ background: "var(--bg)", padding: 28, borderRadius: 8 }}><MarketTag market="intl" /><Row Card={CardB} market="intl" spices={PICK} /></div>
        </DCArtboard>
        <DCArtboard id="cb-l" label="Local · LKR" width={1010} height={650}>
          <div style={{ background: "var(--bg)", padding: 28, borderRadius: 8 }}><MarketTag market="local" /><Row Card={CardB} market="local" spices={PICK} /></div>
        </DCArtboard>
      </DCSection>

      <DCSection id="card-c" title="Card C — Minimal Luxury" subtitle="Type-led · spice colour as accent · airy">
        <DCArtboard id="cc-i" label="International · USD" width={1010} height={600}>
          <div style={{ background: "var(--bg)", padding: 28, borderRadius: 8 }}><MarketTag market="intl" /><Row Card={CardC} market="intl" spices={PICK} /></div>
        </DCArtboard>
        <DCArtboard id="cc-l" label="Local · LKR" width={1010} height={600}>
          <div style={{ background: "var(--bg)", padding: 28, borderRadius: 8 }}><MarketTag market="local" /><Row Card={CardC} market="local" spices={PICK} /></div>
        </DCArtboard>
      </DCSection>

      <DCSection id="range" title="Full spice spectrum" subtitle="All six — how each spice colour reads on Card A">
        <DCArtboard id="range-a" label="Six spices · Card A · USD" width={2010} height={620}>
          <div style={{ background: "var(--bg)", padding: 28, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(6, 300px)", gap: 22 }}>
            {ALL.map((s) => <CardA key={s.name} spice={s} market="intl" />)}
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
