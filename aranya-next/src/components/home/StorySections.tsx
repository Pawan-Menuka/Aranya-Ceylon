"use client";

import * as React from "react";
import Link from "next/link";
import type { Spice } from "@/lib/types";
import { Reveal } from "../primitives/Reveal";
import { Eyebrow } from "../primitives/Motif";
import { ImageSlot } from "../primitives/ImageSlot";
import { CardCFinal } from "../cards/Cards";
import { useMarket } from "../MarketContext";

function Arrow({ color = "#fff", size = 18 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

// ---------- Story band — sourcing & freshness (forest green) ----------
export function StoryBand() {
  const points = [
    { k: "Single-origin", v: "One farm, one harvest — never blended or bulked." },
    { k: "Harvested 2026", v: "This season's lift, not last year's warehouse stock." },
    { k: "Peak aroma", v: "Sealed within days, shipped at full volatile-oil strength." },
  ];
  return (
    <section style={{ background: "var(--brand)", color: "#FDFAF5", padding: "104px 0", position: "relative", overflow: "hidden" }}>
      <div className="story-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
        <Reveal>
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4 / 5", boxShadow: "0 30px 60px rgba(0,0,0,.3)" }}>
            <ImageSlot id="story-sourcing" shape="rect" fit="cover" placeholder="Drop a sourcing / farm photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(15,110,86,.25), rgba(11,60,48,.5))", mixBlendMode: "multiply", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: 22, bottom: 20, color: "#fff", pointerEvents: "none" }}>
              <div className="eyebrow" style={{ color: "#E6B860" }}>Matale Hills · 1,200m</div>
            </div>
          </div>
        </Reveal>
        <div>
          <Reveal><Eyebrow light>From Forest to Kitchen</Eyebrow></Reveal>
          <Reveal delay={60}>
            <h2 className="disp" style={{ fontSize: 50, margin: "16px 0 0", lineHeight: 1.05, color: "#FDFAF5", fontWeight: 600 }}>
              Weeks from the tree,<br />not years from a warehouse.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="prose" style={{ fontSize: 17.5, lineHeight: 1.72, color: "rgba(253,250,245,.85)", margin: "22px 0 34px", maxWidth: 480 }}>
              Most supermarket spice is a year old before it reaches the shelf — flat, faded, anonymous. We work directly with the families who grow ours, lift each spice at its peak, and seal it while the oils are still singing.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div style={{ display: "grid", gap: 0 }}>
              {points.map((pt, i) => (
                <div key={pt.k} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "baseline", padding: "18px 0", borderTop: i === 0 ? "1px solid rgba(253,250,245,.2)" : "1px solid rgba(253,250,245,.12)" }}>
                  <span className="disp" style={{ fontSize: 18, color: "#E6B860", fontWeight: 600, whiteSpace: "nowrap" }}>{pt.k}</span>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "rgba(253,250,245,.85)", lineHeight: 1.55 }}>{pt.v}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ---------- Bestsellers — "What People Love" — CardCFinal grid ----------
export function Bestsellers({ spices }: { spices: Spice[] }) {
  const { market } = useMarket();
  const picks = spices.slice(0, 4);
  return (
    <section style={{ background: "var(--bg)", padding: "100px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 44, flexWrap: "wrap", gap: 16 }}>
          <div>
            <Reveal><Eyebrow>Loved by Our Kitchen Community</Eyebrow></Reveal>
            <Reveal delay={60}><h2 className="disp" style={{ fontSize: 50, color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.03 }}>What People Love</h2></Reveal>
          </div>
          <Reveal delay={100}>
            <Link href="/products" style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 7, paddingBottom: 8 }}>
              Shop all spices <Arrow color="var(--brand)" size={15} />
            </Link>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <div className="best-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
            {picks.map((s) => <CardCFinal key={s.name} spice={s} market={market} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
