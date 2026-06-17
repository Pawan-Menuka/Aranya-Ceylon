"use client";

import * as React from "react";
import Link from "next/link";
import type { Spice } from "@/lib/types";
import { Reveal } from "../primitives/Reveal";
import { Eyebrow } from "../primitives/Motif";
import { ImageSlot } from "../primitives/ImageSlot";
import { CardB } from "../cards/Cards";
import { useMarket } from "../MarketContext";

// Homepage v2 sections (ported from home2-sections.jsx):
// SpiceTicker (forest marquee) · FeaturedForest (numbered CardB row) · CategoryAccordion

// ---------- Spice ticker — slim forest band, Cormorant italic marquee ----------
export function SpiceTicker({ spices }: { spices: Spice[] }) {
  const items = spices.map((s) => ({ n: s.name, o: s.origin.split(",")[0] }));
  const Row = ({ hidden }: { hidden?: boolean }) => (
    <div aria-hidden={hidden ? "true" : undefined} style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 20, padding: "0 26px", whiteSpace: "nowrap" }}>
          <span className="disp" style={{ fontStyle: "italic", fontSize: 23, fontWeight: 500, color: "#FDFAF5", lineHeight: 1 }}>{it.n}</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 600, color: "rgba(230,184,96,.92)" }}>{it.o}</span>
          <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><rect x="1.8" y="1.8" width="6.4" height="6.4" transform="rotate(45 5 5)" fill="#E6B860" opacity=".7" /></svg>
        </span>
      ))}
    </div>
  );
  return (
    <div className="ticker-band" data-screen-label="Spice ticker">
      <div className="ticker-track"><Row /><Row hidden /></div>
    </div>
  );
}

// ---------- From the Forest — numbered, staggered CardB row ----------
export function FeaturedForest({ spices }: { spices: Spice[] }) {
  const { market } = useMarket();
  const picks = spices.slice(0, 3);
  return (
    <section data-screen-label="From the Forest" style={{ background: "var(--bg)", padding: "96px 0 40px" }}>
      <div className="home-section-pad" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
          <div>
            <Reveal><Eyebrow>Curated This Week</Eyebrow></Reveal>
            <Reveal delay={60}><h2 className="disp" style={{ fontSize: 50, color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.03 }}>From the Forest</h2></Reveal>
          </div>
          <Reveal delay={100}>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--muted)", maxWidth: 320, lineHeight: 1.6, paddingBottom: 6 }}>
              Three lots we&rsquo;re reaching for right now — picked for their season, not their shelf life.
            </p>
          </Reveal>
        </div>
        <div className="feat-row">
          {picks.map((s, i) => (
            <Reveal key={s.name} delay={i * 110}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <span className="disp" style={{ fontStyle: "italic", fontSize: 21, color: "var(--accent)", fontWeight: 500 }}>{"0" + (i + 1)}</span>
                <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
                <span className="eyebrow" style={{ color: "var(--muted)", fontSize: 10 }}>{s.origin.split(",")[0]}</span>
              </div>
              <CardB spice={s} market={market} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Browse by Category — horizontal expanding accordion ----------
// Same image-slot ids as the grid version, so dropped photos persist across layouts.
const ACC_CATS = [
  { name: "Cinnamon & Bark", count: 6, color: "#B5651D", deep: "#7E481A", slot: "cat-cinnamon", blurb: "True Ceylon quills, hand-rolled" },
  { name: "Whole Spices", count: 14, color: "#3C3A36", deep: "#26241F", slot: "cat-whole", blurb: "Cloves, pepper, nutmeg" },
  { name: "Ground & Powders", count: 9, color: "#D99A1C", deep: "#A8740F", slot: "cat-ground", blurb: "Stone-milled, small batch" },
  { name: "Cardamom & Pods", count: 5, color: "#7C9A5A", deep: "#566F37", slot: "cat-cardamom", blurb: "Green pods, alpine-grown" },
  { name: "Gift Sets", count: 8, color: "#BA7517", deep: "#8A560F", slot: "cat-gift", blurb: "Curated wooden boxes" },
];

function AccArrow({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

export function CategoryAccordion() {
  const [active, setActive] = React.useState(0);
  return (
    <section data-screen-label="Browse by Category" style={{ background: "var(--bg)", padding: "100px 0" }}>
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
          <div className="cat-acc">
            {ACC_CATS.map((c, i) => {
              const on = i === active;
              return (
                <Link
                  key={c.name}
                  href="/categories"
                  className={"cat-acc-item" + (on ? " on" : "")}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  aria-label={c.name + " — " + c.count + " spices"}
                  style={{ background: c.deep }}
                >
                  <ImageSlot id={c.slot} shape="rect" fit="cover" placeholder={`Drop ${c.name} photo`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${c.color}55, ${c.deep}cc)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.14) 0%, transparent 36%, rgba(0,0,0,.18) 60%, rgba(0,0,0,.64) 100%)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: c.color, pointerEvents: "none" }} />

                  <div className="acc-fade" style={{ position: "absolute", left: 20, bottom: 22, opacity: on ? 0 : 1, pointerEvents: "none" }}>
                    <span className="disp acc-vlabel" style={{ display: "block", writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 23, fontWeight: 600, color: "#fff", textShadow: "0 1px 12px rgba(0,0,0,.5)", letterSpacing: ".02em", whiteSpace: "nowrap", lineHeight: 1 }}>{c.name}</span>
                  </div>
                  <div className="acc-fade" style={{ position: "absolute", left: 0, right: 0, top: 18, display: "flex", justifyContent: "center", opacity: on ? 0 : 1, pointerEvents: "none" }}>
                    <span className="acc-count" style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 600, letterSpacing: ".16em", color: "rgba(253,250,245,.85)", border: "1px solid rgba(253,250,245,.35)", borderRadius: 999, padding: "5px 10px", lineHeight: 1, whiteSpace: "nowrap" }}>{c.count}</span>
                  </div>

                  <div className="acc-fade" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "26px 28px", opacity: on ? 1 : 0, pointerEvents: "none", color: "#fff" }}>
                    <div className="eyebrow" style={{ color: "rgba(253,250,245,.85)", marginBottom: 9 }}>{c.count} spices</div>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="disp" style={{ fontSize: 36, margin: 0, lineHeight: 1.04, color: "#fff", textShadow: "0 1px 14px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>{c.name}</h3>
                        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "rgba(253,250,245,.85)", margin: "8px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.blurb}</p>
                      </div>
                      <span style={{ flex: "0 0 auto", width: 46, height: 46, borderRadius: 999, background: "var(--accent)", border: "1px solid rgba(253,250,245,.4)", display: "grid", placeItems: "center" }}>
                        <AccArrow size={19} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
