"use client";

import * as React from "react";
import Link from "next/link";
import { Reveal } from "../primitives/Reveal";
import { Liyawel, Eyebrow } from "../primitives/Motif";
import { ImageSlot } from "../primitives/ImageSlot";
import { useMarket } from "../MarketContext";

// About / Our Story (ported from about.jsx + about-2.jsx). Hero · Statement ·
// Origin · Sourcing · Region · Process · Closing CTA.

function AboutHero() {
  return (
    <header data-hero style={{ position: "relative", minHeight: "100vh", background: "#161412", color: "#FDFAF5", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
      <ImageSlot id="about-hero" shape="rect" fit="cover" placeholder="Drop a hero forest / estate photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, rgba(15,110,86,.34), rgba(11,16,13,.6))", mixBlendMode: "multiply", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,6,.5) 0%, transparent 26%, transparent 48%, rgba(10,8,6,.82) 100%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 40px 92px", width: "100%" }}>
        <Reveal><Eyebrow light>Our Story</Eyebrow></Reveal>
        <Reveal delay={80}>
          <h1 className="disp" style={{ fontSize: "clamp(48px,7vw,104px)", lineHeight: 0.98, margin: "20px 0 0", fontWeight: 600, letterSpacing: ".005em", maxWidth: 1000 }}>
            Spice, as the<br /><span style={{ fontStyle: "italic", color: "#E6B860" }}>forest</span> intended.
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p className="prose" style={{ fontSize: "clamp(17px,1.5vw,21px)", color: "rgba(253,250,245,.84)", margin: "26px 0 0", maxWidth: 560 }}>
            We are a small house of spice from the hill forests of Sri Lanka — peeling, drying and milling by hand, and shipping at the height of aroma rather than the convenience of a warehouse.
          </p>
        </Reveal>
      </div>
      <div style={{ position: "absolute", left: "50%", bottom: 26, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "rgba(253,250,245,.6)" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: ".22em", textTransform: "uppercase" }}>Scroll</span>
        <span style={{ width: 1, height: 34, background: "linear-gradient(180deg, rgba(230,184,96,.7), transparent)" }} />
      </div>
    </header>
  );
}

function StatementBand() {
  return (
    <section style={{ background: "var(--bg)", padding: "110px 0 96px" }}>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
        <Reveal><Liyawel width={220} style={{ marginBottom: 38 }} /></Reveal>
        <Reveal delay={60}>
          <p className="disp" style={{ fontSize: "clamp(28px,3.4vw,44px)", lineHeight: 1.28, color: "var(--ink)", margin: 0, fontWeight: 500, letterSpacing: ".005em", textWrap: "balance" }}>
            Most spice is grown to be stored. <span style={{ color: "var(--brand)" }}>Ours is grown to be smelled</span> — picked on its own clock, cured in the shade, and sent to you while the oils are still loud.
          </p>
        </Reveal>
        <Reveal delay={140}>
          <p className="prose" style={{ fontSize: 17.5, color: "var(--muted)", margin: "34px auto 0", maxWidth: 600 }}>
            Aranya began with a simple frustration: the cinnamon, cardamom and pepper sold the world over bore little resemblance to what grew on the hillsides we knew. Bulked, blended, and years from the tree, they had lost the thing that made them worth growing. So we went back to the forest.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function OriginStory() {
  return (
    <section style={{ background: "var(--bg)", padding: "20px 0 104px" }}>
      <div className="ab-two" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 72, alignItems: "center" }}>
        <Reveal>
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4 / 5", boxShadow: "var(--shadow-lg)" }}>
            <ImageSlot id="about-origin" shape="rect" fit="cover" placeholder="Drop a founder / hillside photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(15,110,86,.16), rgba(11,16,13,.34))", mixBlendMode: "multiply", pointerEvents: "none" }} />
          </div>
        </Reveal>
        <div>
          <Reveal><Eyebrow>How it began</Eyebrow></Reveal>
          <Reveal delay={60}>
            <h2 className="disp" style={{ fontSize: "clamp(34px,3.6vw,48px)", color: "var(--brand)", margin: "16px 0 24px", lineHeight: 1.05 }}>
              A walk back into the hill country
            </h2>
          </Reveal>
          <Reveal delay={110}>
            <div className="prose" style={{ fontSize: 17.5, color: "var(--ink)", display: "flex", flexDirection: "column", gap: 18 }}>
              <p style={{ margin: 0 }}>
                The first quills we ever sold came from a single family&rsquo;s plot above Matale — bark peeled in long, supple ribbons and rolled by hand the way it had been for generations. They snapped clean, dissolved to silk, and smelled of honey and citrus rather than the blunt heat most of us had come to accept as cinnamon.
              </p>
              <p style={{ margin: 0 }}>
                We realised the difference was not a secret recipe but a chain of small, unhurried decisions — which plant to pick, which day to peel, how long to let the sun do its work. Keep that chain intact and the spice arrives extraordinary. Break it for scale and speed, and you get the jar everyone settles for.
              </p>
              <p style={{ margin: 0 }}>
                Aranya is our attempt to keep the chain intact, and to pay the people who hold it what their craft is worth.
              </p>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 30 }}>
              <span style={{ width: 46, height: 1, background: "var(--gold-line)" }} />
              <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, color: "var(--muted)" }}>The Aranya family</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Sourcing() {
  const growers: [string, string, string][] = [
    ["about-grower-1", "Matale Hills", "Cinnamon peelers"],
    ["about-grower-2", "Kandy District", "Cardamom pickers"],
    ["about-grower-3", "Southern Province", "Turmeric curers"],
  ];
  return (
    <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "104px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 80% at 12% 0%, rgba(29,158,117,.4), transparent 55%)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", position: "relative" }}>
        <div style={{ maxWidth: 680 }}>
          <Reveal><Eyebrow light>The growers</Eyebrow></Reveal>
          <Reveal delay={60}>
            <h2 className="disp" style={{ fontSize: "clamp(34px,3.8vw,52px)", margin: "16px 0 22px", lineHeight: 1.05, fontWeight: 600 }}>
              We buy from the hands that grow it
            </h2>
          </Reveal>
          <Reveal delay={110}>
            <p className="prose" style={{ fontSize: 18, color: "rgba(253,250,245,.84)", margin: 0 }}>
              No brokers, no anonymous lots. Every spice we sell is traced to a named estate or smallholding, bought at a price set with the grower rather than against them. We visit at harvest, taste at the source, and carry only what we would keep for our own kitchen — which means we leave most of what we are offered behind.
            </p>
          </Reveal>
        </div>
        <div className="ab-growers" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 56 }}>
          {growers.map(([id, place, role], i) => (
            <Reveal key={id} delay={i * 80}>
              <figure style={{ margin: 0 }}>
                <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "3 / 4", boxShadow: "0 24px 50px rgba(0,0,0,.3)" }}>
                  <ImageSlot id={id} shape="rect" fit="cover" placeholder={`Drop a ${role.toLowerCase()} photo`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(11,16,13,.7))", pointerEvents: "none" }} />
                  <figcaption style={{ position: "absolute", left: 18, bottom: 16, pointerEvents: "none" }}>
                    <div className="disp" style={{ fontSize: 24, color: "#fff", lineHeight: 1 }}>{place}</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: ".06em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 6 }}>{role}</div>
                  </figcaption>
                </div>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function RegionBleed() {
  const stats: [string, string][] = [
    ["1,200m", "Average hill-country elevation"],
    ["6", "Single-origin growing regions"],
    ["< 3 wks", "From harvest to sealed pouch"],
  ];
  return (
    <section style={{ position: "relative", color: "#FDFAF5", overflow: "hidden" }}>
      <ImageSlot id="about-region" shape="rect" fit="cover" placeholder="Drop a hill-country landscape photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
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

function Process() {
  const steps: [string, string][] = [
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

function ClosingCTA() {
  const { market } = useMarket();
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
            <Link href="/products" className={market === "local" ? "btn btn-local" : "btn btn-intl"} style={{ width: "auto", padding: "15px 34px", display: "inline-flex", textDecoration: "none" }}>
              Shop all spices
            </Link>
            <Link href="/products?sort=best" className="btn btn-ghost" style={{ width: "auto", padding: "15px 34px", display: "inline-flex", textDecoration: "none" }}>
              Browse bestsellers
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function AboutClient() {
  return (
    <div data-screen-label="About">
      <AboutHero />
      <StatementBand />
      <OriginStory />
      <Sourcing />
      <RegionBleed />
      <Process />
      <ClosingCTA />
    </div>
  );
}
