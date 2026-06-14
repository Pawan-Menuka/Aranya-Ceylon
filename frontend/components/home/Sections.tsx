import Link from "next/link";
import { Eyebrow, Liyawel, Icon } from "../design/Primitives";
import { Reveal } from "../design/Reveal";

// ---- Browse by Category (full-bleed editorial tiles) ----
const CATEGORIES = [
  { name: "Cinnamon & Bark", count: 6, color: "#B5651D", deep: "#7E481A", blurb: "True Ceylon quills, hand-rolled", big: true },
  { name: "Whole Spices", count: 14, color: "#3C3A36", deep: "#26241F", blurb: "Cloves, pepper, nutmeg", big: true },
  { name: "Ground & Powders", count: 9, color: "#D99A1C", deep: "#A8740F", blurb: "Stone-milled, small batch" },
  { name: "Cardamom & Pods", count: 5, color: "#7C9A5A", deep: "#566F37", blurb: "Green pods, alpine-grown" },
  { name: "Gift Sets", count: 8, color: "#BA7517", deep: "#8A560F", blurb: "Curated wooden boxes" },
];

function CatTile({ cat }: { cat: (typeof CATEGORIES)[number] }) {
  const big = !!cat.big;
  return (
    <Link
      href="/products"
      style={{
        position: "relative",
        display: "block",
        borderRadius: 8,
        overflow: "hidden",
        height: "100%",
        minHeight: big ? 460 : 222,
        background: `linear-gradient(150deg, ${cat.color}, ${cat.deep})`,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.12) 0%, transparent 38%, rgba(0,0,0,.16) 62%, rgba(0,0,0,.62) 100%)" }} />
      <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: cat.color }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: big ? "28px 30px" : "20px 22px", color: "#fff" }}>
        <div className="eyebrow" style={{ color: "rgba(253,250,245,.82)", marginBottom: 8 }}>{cat.count} spices</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 className="disp" style={{ fontSize: big ? 38 : 26, margin: 0, lineHeight: 1.02, color: "#fff", textShadow: "0 1px 14px rgba(0,0,0,.4)" }}>{cat.name}</h3>
            {big && <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, color: "rgba(253,250,245,.82)", margin: "8px 0 0" }}>{cat.blurb}</p>}
          </div>
          <span style={{ flex: "0 0 auto", width: big ? 46 : 38, height: big ? 46 : 38, borderRadius: 999, background: "rgba(253,250,245,.16)", border: "1px solid rgba(253,250,245,.4)", display: "grid", placeItems: "center" }}>
            <Icon name="chevron" size={big ? 20 : 17} stroke="#fff" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CategoryTiles() {
  return (
    <section style={{ background: "var(--bg)", padding: "100px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Eyebrow center>Explore the Pantry</Eyebrow></div>
        </Reveal>
        <Reveal delay={60} style={{ textAlign: "center", marginBottom: 14 }}>
          <h2 className="disp" style={{ fontSize: "clamp(34px,5vw,50px)", color: "var(--brand)", margin: 0, lineHeight: 1.03 }}>Browse by Category</h2>
        </Reveal>
        <Reveal delay={120} style={{ textAlign: "center", marginBottom: 44 }}>
          <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 16, color: "var(--muted)", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            Five families of single-origin spice, each lifted from a different corner of the island.
          </p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, marginBottom: 18 }}>
          <CatTile cat={CATEGORIES[0]!} />
          <CatTile cat={CATEGORIES[1]!} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          <CatTile cat={CATEGORIES[2]!} />
          <CatTile cat={CATEGORIES[3]!} />
          <CatTile cat={CATEGORIES[4]!} />
        </div>
      </div>
    </section>
  );
}

// ---- Story band — sourcing & freshness (forest green) ----
const STORY_POINTS = [
  { k: "Single-origin", v: "One farm, one harvest — never blended or bulked." },
  { k: "Harvested 2026", v: "This season's lift, not last year's warehouse stock." },
  { k: "Peak aroma", v: "Sealed within days, shipped at full volatile-oil strength." },
];

export function StoryBand() {
  return (
    <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "104px 0", overflow: "hidden" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 72, alignItems: "center" }}>
        <Reveal>
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4 / 5", boxShadow: "0 30px 60px rgba(0,0,0,.3)", background: "linear-gradient(160deg, #1D9E75, #0B3C30)" }}>
            <div aria-hidden className="grain" style={{ position: "absolute", inset: 0 }} />
            <div style={{ position: "absolute", left: 22, bottom: 20, color: "#fff" }}>
              <div className="eyebrow" style={{ color: "#E6B860" }}>Matale Hills · 1,200m</div>
            </div>
          </div>
        </Reveal>
        <div>
          <Reveal><Eyebrow light>From Forest to Kitchen</Eyebrow></Reveal>
          <Reveal delay={60}>
            <h2 className="disp" style={{ fontSize: "clamp(34px,5vw,50px)", margin: "16px 0 0", lineHeight: 1.05, color: "#FDFAF5", fontWeight: 600 }}>
              Weeks from the tree,<br />not years from a warehouse.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="prose" style={{ fontSize: 17.5, lineHeight: 1.72, color: "rgba(253,250,245,.85)", margin: "22px 0 34px", maxWidth: 480 }}>
              Most supermarket spice is a year old before it reaches the shelf — flat, faded, anonymous. We work directly with
              the families who grow ours, lift each spice at its peak, and seal it while the oils are still singing.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div style={{ display: "grid", gap: 0 }}>
              {STORY_POINTS.map((pt, i) => (
                <div key={pt.k} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "baseline", padding: "18px 0", borderTop: `1px solid rgba(253,250,245,${i === 0 ? 0.2 : 0.12})` }}>
                  <span className="disp" style={{ fontSize: 18, color: "#E6B860", fontWeight: 600, whiteSpace: "nowrap" }}>{pt.k}</span>
                  <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 15, color: "rgba(253,250,245,.85)", lineHeight: 1.55 }}>{pt.v}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ---- Heritage — name etymology (near-black + motif) ----
const STATS: [string, string][] = [
  ["3,000+", "Years of Ceylon spice trade"],
  ["100%", "Single-origin, island-grown"],
  ["1,200m", "Hill-country elevation"],
];

export function Heritage() {
  return (
    <section style={{ background: "#1A1A1A", color: "#FDFAF5", padding: "120px 0", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 0%, rgba(15,110,86,.18), transparent 60%)" }} />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 40px", position: "relative", textAlign: "center" }}>
        <Reveal><Liyawel width={300} style={{ marginBottom: 40 }} /></Reveal>
        <Reveal delay={60}>
          <div style={{ display: "flex", justifyContent: "center" }}><Eyebrow center light>The Name</Eyebrow></div>
        </Reveal>
        <Reveal delay={100}>
          <h2 className="disp" style={{ fontSize: "clamp(40px,5vw,68px)", margin: "20px 0 0", lineHeight: 1.04, fontWeight: 600, letterSpacing: ".01em" }}>
            <span style={{ fontStyle: "italic" }}>Aranya</span> means <span style={{ color: "#E6B860" }}>the forest.</span>
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <p className="prose" style={{ fontSize: 18.5, lineHeight: 1.78, color: "rgba(253,250,245,.82)", maxWidth: 640, margin: "30px auto 0" }}>
            From the Sanskrit <em style={{ color: "rgba(253,250,245,.95)" }}>araṇya</em> — the wild woodland. For three thousand years
            the hill forests of Ceylon have given the world its finest cinnamon, carried along the spice routes from the Kandyan
            kingdom to the courts of Rome and Cairo. We carry that lineage forward: the same forests, the same hands, the same
            unhurried craft.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div style={{ display: "flex", justifyContent: "center", margin: "52px auto 0", flexWrap: "wrap", maxWidth: 760 }}>
            {STATS.map(([n, label], i) => (
              <div key={n} style={{ flex: "1 1 200px", padding: "0 28px", borderLeft: i === 0 ? "none" : "1px solid rgba(253,250,245,.16)" }}>
                <div className="disp" style={{ fontSize: 44, color: "#E6B860", fontWeight: 600, lineHeight: 1 }}>{n}</div>
                <div style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13, color: "rgba(253,250,245,.7)", marginTop: 8, letterSpacing: ".02em" }}>{label}</div>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={240}><Liyawel width={300} style={{ marginTop: 52 }} /></Reveal>
      </div>
    </section>
  );
}
