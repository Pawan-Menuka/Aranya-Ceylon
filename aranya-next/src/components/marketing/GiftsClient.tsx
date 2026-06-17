"use client";

import * as React from "react";
import Link from "next/link";
import type { Market, Spice } from "@/lib/types";
import { GIFTS, GIFT_OCCASIONS, type GiftSet, giftCatalog, giftPrice, giftFmt, giftAlaCarte, giftSavePct } from "@/lib/gifts-data";
import { Reveal } from "../primitives/Reveal";
import { Liyawel, Eyebrow } from "../primitives/Motif";
import { Seal } from "../primitives/Seal";
import { ImageSlot } from "../primitives/ImageSlot";
import { useMarket } from "../MarketContext";
import { useCart } from "../CartContext";

// Gift Sets page (ported from gifts.jsx). Curated bundles priced from CATALOG;
// GiftBox is a styled top-down "ribboned box" placeholder. Adds a set to the
// shared cart as a single line.

function GIcon({ name, size = 22, stroke = "var(--brand)", w = 1.6 }: { name: string; size?: number; stroke?: string; w?: number }) {
  const p: Record<string, React.ReactNode> = {
    gift: (<><rect x="3" y="8" width="18" height="13" rx="1.5" /><path d="M3 12h18M12 8v13" /><path d="M12 8C12 5 10.5 3.5 8.7 3.5 7.3 3.5 6.5 4.4 6.5 5.5 6.5 7.3 9 8 12 8zM12 8c0-3 1.5-4.5 3.3-4.5 1.4 0 2.2.9 2.2 2 0 1.8-2.5 2.5-5.5 2.5z" /></>),
    pen: (<><path d="M14 4l6 6L9 21l-6 1.5L4.5 16 14 4z" /><path d="M12.5 6.5L17.5 11.5" /></>),
    plane: <path d="M21 4L3 11l6 2 2 6 3-5 5 5 2-15z" />,
    arrow: (<><path d="M5 12h14M13 6l6 6-6 6" /></>),
    building: (<><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M14 21V9h4a2 2 0 0 1 2 2v10M3 21h18" /><path d="M7 7h3M7 11h3M7 15h3" /></>),
    plus: (<><path d="M12 5v14M5 12h14" /></>),
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>{p[name]}</svg>;
}

function GiftBadge({ kind }: { kind: string }) {
  const map: Record<string, [string, string]> = { "Bestselling gift": ["#BA7517", "#fff"], "New": ["#1A1A1A", "#fff"], "Limited": ["#0F6E56", "#fff"] };
  const c = map[kind] || ["#1A1A1A", "#fff"];
  return <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: c[1], background: c[0], borderRadius: 999, padding: "5px 11px", lineHeight: 1, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,.18)" }}>{kind}</span>;
}

function GiftBox({ set, ratio = "4 / 3" }: { set: GiftSet; ratio?: string }) {
  const dots = set.contents.map((nm) => (giftCatalog(nm) || ({} as { color?: string })).color || set.color);
  return (
    <div className="grain" style={{ position: "relative", width: "100%", aspectRatio: ratio, overflow: "hidden", background: `radial-gradient(120% 120% at 50% 0%, ${set.surface} 0%, ${set.surface} 46%, rgba(0,0,0,.06) 100%)` }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,.28), transparent 30%, transparent 72%, rgba(40,28,12,.10))" }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 70px rgba(40,28,12,.14)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "calc(50% - 21px)", height: 42, background: `linear-gradient(180deg, ${set.base}, ${set.color} 55%, ${set.deep})`, boxShadow: "0 4px 14px rgba(0,0,0,.16)" }}>
        <span style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1.4, background: "rgba(230,184,96,.7)", transform: "translateY(-50%)" }} />
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "calc(50% - 25px)", width: 50, background: `linear-gradient(90deg, ${set.base}, ${set.color} 55%, ${set.deep})`, boxShadow: "0 0 16px rgba(0,0,0,.14)" }}>
        <span style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1.4, background: "rgba(230,184,96,.7)", transform: "translateX(-50%)" }} />
      </div>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 58, height: 58, borderRadius: 999, background: "radial-gradient(circle at 38% 32%, #FDFAF5, #F1E7D3)", border: "1px solid rgba(201,162,75,.6)", boxShadow: "0 6px 16px rgba(0,0,0,.26)", display: "grid", placeItems: "center" }}>
        <Seal size={42} />
      </div>
      <div style={{ position: "absolute", left: 16, bottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex" }}>
          {dots.map((c, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 999, background: c, border: "2px solid rgba(253,250,245,.92)", marginLeft: i ? -6 : 0, boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />)}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: set.deep }}>{set.contents.length} spices</span>
      </div>
    </div>
  );
}

function GiftContents({ set, columns = 2 }: { set: GiftSet; columns?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, gap: "8px 16px" }}>
      {set.contents.map((nm) => {
        const c = (giftCatalog(nm) || ({} as { color?: string })).color || set.color;
        return (
          <div key={nm} style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: c, flex: "0 0 auto" }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm}</span>
          </div>
        );
      })}
    </div>
  );
}

function GiftPrice({ set, market, size = 30 }: { set: GiftSet; market: Market; size?: number }) {
  const alc = giftAlaCarte(set, market), save = giftSavePct(set, market);
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
      <span className="disp" style={{ fontSize: size, color: "var(--ink)", fontWeight: 600, lineHeight: 1 }}>{giftPrice(set, market)}</span>
      {save > 0 && <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--muted)", textDecoration: "line-through" }}>{giftFmt(alc, market)}</span>}
      {save > 0 && <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--brand)", background: "rgba(15,110,86,.1)", borderRadius: 999, padding: "4px 9px" }}>Save {save}%</span>}
    </div>
  );
}

function useGiftAdd() {
  const cart = useCart();
  return React.useCallback((set: GiftSet) => {
    cart.add(set as unknown as Spice, "Gift box", "Set", 1);
    cart.openCart();
  }, [cart]);
}

function GiftHero({ market, onShop }: { market: Market; onShop: () => void }) {
  const btn = market === "local" ? "btn btn-local" : "btn btn-intl";
  return (
    <header data-hero style={{ position: "relative", minHeight: "90vh", background: "#161412", color: "#FDFAF5", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
      <ImageSlot id="gift-hero" shape="rect" fit="cover" placeholder="Drop a gifting photo — ribboned spice boxes, a wrapped gift being handed over" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, rgba(15,110,86,.34), rgba(11,16,13,.6))", mixBlendMode: "multiply", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,8,6,.5) 0%, transparent 28%, transparent 46%, rgba(10,8,6,.84) 100%)", pointerEvents: "none" }} />
      <div className="home-section-pad" style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 40px 84px", width: "100%" }}>
        <Reveal><Eyebrow light>Gifts &amp; Sets</Eyebrow></Reveal>
        <Reveal delay={80}>
          <h1 className="disp disp-hero-h2" style={{ fontSize: "clamp(46px,6.6vw,98px)", lineHeight: 0.98, margin: "20px 0 0", fontWeight: 600, letterSpacing: ".005em", maxWidth: 1040 }}>
            Spice, <span style={{ fontStyle: "italic", color: "#E6B860" }}>beautifully</span><br />given.
          </h1>
        </Reveal>
        <Reveal delay={150}>
          <p className="prose" style={{ fontSize: "clamp(17px,1.5vw,21px)", color: "rgba(253,250,245,.85)", margin: "26px 0 0", maxWidth: 560 }}>
            Curated boxes of single-origin Ceylon spice — hand-wrapped, ribboned, and ready to give. For the cook who has everything but this.
          </p>
        </Reveal>
        <Reveal delay={210}>
          <div style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
            <button className={btn} style={{ width: "auto", padding: "15px 28px" }} onClick={onShop}>Shop the gift sets</button>
            <a href="#finishing" style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, letterSpacing: ".02em", padding: "15px 26px", borderRadius: "var(--radius)", background: "rgba(253,250,245,.12)", color: "#FDFAF5", border: "1px solid rgba(253,250,245,.34)", backdropFilter: "blur(4px)", display: "inline-block" }}>How gifting works</a>
          </div>
        </Reveal>
        <Reveal delay={270}>
          <div style={{ display: "flex", gap: 26, marginTop: 46, flexWrap: "wrap", borderTop: "1px solid rgba(253,250,245,.18)", paddingTop: 22, maxWidth: 640 }}>
            {([["gift", "Complimentary gift wrap"], ["pen", "Handwritten note card"], ["plane", "Ships worldwide"]] as [string, string][]).map(([ic, t]) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <GIcon name={ic} size={19} stroke="#E6B860" />
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "rgba(253,250,245,.82)", fontWeight: 500 }}>{t}</span>
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </header>
  );
}

function FeaturedSet({ market, gridRef }: { market: Market; gridRef: React.RefObject<HTMLElement> }) {
  const set = GIFTS.find((g) => g.featured) || GIFTS[0];
  const [added, setAdded] = React.useState(false);
  const giftAdd = useGiftAdd();
  const onAdd = () => { giftAdd(set); setAdded(true); setTimeout(() => setAdded(false), 1300); };
  const btn = market === "local" ? "btn btn-local" : "btn btn-intl";
  return (
    <section style={{ background: "var(--bg)", padding: "92px 0 86px" }}>
      <div className="home-section-pad gift-feature" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 60, alignItems: "center" }}>
        <Reveal>
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-lg)", border: "1px solid var(--line)" }}>
            <GiftBox set={set} ratio="5 / 4" />
            {set.badge && <div style={{ position: "absolute", top: 16, left: 16 }}><GiftBadge kind={set.badge} /></div>}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: set.color }} />
          </div>
        </Reveal>
        <div>
          <Reveal><Eyebrow>The signature gift</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(34px,4.2vw,58px)", color: "var(--brand)", margin: "14px 0 6px", lineHeight: 1.02 }}>{set.name}</h2></Reveal>
          <Reveal delay={100}><p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 19, color: "var(--muted)", margin: "0 0 18px" }}>{set.tagline}</p></Reveal>
          <Reveal delay={140}><p className="prose" style={{ fontSize: 17, color: "var(--ink)", margin: "0 0 26px", maxWidth: 480 }}>{set.blurb}</p></Reveal>
          <Reveal delay={180}>
            <div style={{ padding: "20px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", marginBottom: 24 }}>
              <div className="eyebrow" style={{ color: "var(--muted)", marginBottom: 14 }}>In the box · {set.contents.length} × {set.jar} jars</div>
              <GiftContents set={set} columns={2} />
            </div>
          </Reveal>
          <Reveal delay={210}>
            <div style={{ marginBottom: 22 }}><GiftPrice set={set} market={market} size={34} /></div>
          </Reveal>
          <Reveal delay={240}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className={btn} style={{ width: "auto", padding: "15px 30px" }} onClick={onAdd}>{added ? "Added to basket ✓" : "Add gift box"}</button>
              <button onClick={() => gridRef.current && gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" })} className="btn btn-ghost" style={{ width: "auto", padding: "15px 26px" }}>See all sets</button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function GiftCard({ set, market }: { set: GiftSet; market: Market }) {
  const [h, setH] = React.useState(false);
  const [added, setAdded] = React.useState(false);
  const giftAdd = useGiftAdd();
  const onAdd = () => { giftAdd(set); setAdded(true); setTimeout(() => setAdded(false), 1300); };
  const accent = market === "local" ? "var(--brand)" : "var(--accent)";
  return (
    <div id={"set-" + set.id} className="aranya" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", background: "var(--surface)", borderRadius: 12, overflow: "hidden", borderTop: `5px solid ${set.color}`, boxShadow: h ? "var(--shadow-md)" : "var(--shadow-sm)", transform: h ? "translateY(-3px)" : "none", transition: "box-shadow .2s, transform .2s" }}>
      <div style={{ position: "relative" }}>
        <GiftBox set={set} ratio="4 / 3" />
        {set.badge && <div style={{ position: "absolute", top: 14, left: 14 }}><GiftBadge kind={set.badge} /></div>}
      </div>
      <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.08 }}>{set.name}</h3>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 15.5, color: "var(--muted)", margin: "0 0 16px" }}>{set.tagline}</p>
        <div style={{ marginBottom: 18 }}><GiftContents set={set} columns={2} /></div>
        <div style={{ height: 1, background: "var(--line)", margin: "auto 0 16px" }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <GiftPrice set={set} market={market} size={27} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--muted)", fontWeight: 600, whiteSpace: "nowrap", paddingBottom: 3 }}>{set.contents.length} × {set.jar}</span>
        </div>
        <button onClick={onAdd}
          style={{ width: "100%", borderRadius: "var(--radius)", padding: "13px", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 700, cursor: "pointer", background: added ? accent : "transparent", color: added ? "#fff" : accent, border: `1.5px solid ${accent}`, transition: "background .15s, color .15s" }}
          onMouseEnter={(e) => { if (added) return; e.currentTarget.style.background = accent; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { if (added) return; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accent; }}>
          {added ? "Added to basket ✓" : "Add gift box"}
        </button>
      </div>
    </div>
  );
}

function BuildYourOwn() {
  const [h, setH] = React.useState(false);
  return (
    <Link href="/products" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", borderRadius: 12, border: "1.5px dashed var(--gold-line)", background: h ? "var(--surface)" : "transparent", padding: "40px 28px", minHeight: 260, transition: "background .2s, transform .2s", transform: h ? "translateY(-3px)" : "none" }}>
      <span style={{ width: 60, height: 60, borderRadius: 999, display: "grid", placeItems: "center", background: "#fff", border: "1px solid var(--line)", marginBottom: 18, transform: h ? "rotate(90deg)" : "none", transition: "transform .3s" }}>
        <GIcon name="plus" size={26} stroke="var(--brand)" w={2} />
      </span>
      <h3 className="disp" style={{ fontSize: 25, color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.1 }}>Build your own box</h3>
      <p className="prose" style={{ fontSize: 14.5, color: "var(--muted)", margin: "0 0 18px", maxWidth: 260 }}>Hand-pick any spices from the range and we&rsquo;ll wrap them together as a gift.</p>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 7 }}>Start from the shop <GIcon name="arrow" size={16} stroke="var(--accent)" w={2} /></span>
    </Link>
  );
}

function GiftGrid({ market, gridRef }: { market: Market; gridRef: React.RefObject<HTMLElement> }) {
  const sets = GIFTS.filter((g) => !g.featured);
  return (
    <section ref={gridRef as React.RefObject<HTMLDivElement>} id="sets" style={{ background: "var(--bg)", padding: "20px 0 100px", scrollMarginTop: 90 }}>
      <div className="home-section-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Reveal><Eyebrow center>All gift sets</Eyebrow></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(30px,3.6vw,48px)", color: "var(--brand)", margin: "14px 0 0", lineHeight: 1.05 }}>A box for every kind of cook</h2></Reveal>
        </div>
        <div className="gift-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
          {sets.map((s, i) => <Reveal key={s.id} delay={(i % 3) * 70} style={{ display: "flex" }}><div style={{ flex: 1, display: "flex" }}><GiftCard set={s} market={market} /></div></Reveal>)}
          <Reveal delay={(sets.length % 3) * 70} style={{ display: "flex" }}><div style={{ flex: 1, display: "flex" }}><BuildYourOwn /></div></Reveal>
        </div>
      </div>
    </section>
  );
}

function FinishingBand() {
  const feats: [string, string, string][] = [
    ["gift", "The signature box", "Each set is hand-packed into our forest-green keepsake box and tied with gold cord — no extra wrapping needed."],
    ["pen", "A note in your hand", "Add a message at checkout and we'll write it onto a cotton card, tucked inside with the spices."],
    ["plane", "Sent straight to them", "Ship direct to the recipient with a price-free packing slip — just the spices, and your words."],
  ];
  return (
    <section id="finishing" style={{ background: "var(--brand)", color: "#FDFAF5", padding: "100px 0", position: "relative", overflow: "hidden", scrollMarginTop: 80 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(110% 80% at 85% 0%, rgba(29,158,117,.4), transparent 55%)", pointerEvents: "none" }} />
      <div className="home-section-pad" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 54 }}>
          <Reveal><Liyawel width={200} color="rgba(230,184,96,.6)" style={{ marginBottom: 26 }} /></Reveal>
          <Reveal delay={60}><Eyebrow center light>The finishing</Eyebrow></Reveal>
          <Reveal delay={100}><h2 className="disp" style={{ fontSize: "clamp(32px,4vw,54px)", margin: "16px 0 0", lineHeight: 1.04, fontWeight: 600 }}>Every gift, beautifully finished</h2></Reveal>
        </div>
        <div className="gift-finish" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26 }}>
          {feats.map(([ic, t, b], i) => (
            <Reveal key={t} delay={i * 80}>
              <div style={{ background: "rgba(253,250,245,.05)", border: "1px solid rgba(253,250,245,.16)", borderRadius: 14, padding: "30px 26px", height: "100%" }}>
                <span style={{ width: 50, height: 50, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(230,184,96,.16)", border: "1px solid rgba(230,184,96,.36)", marginBottom: 20 }}><GIcon name={ic} size={23} stroke="#E6B860" /></span>
                <h3 className="disp" style={{ fontSize: 24, margin: "0 0 9px", lineHeight: 1.12, color: "#FDFAF5" }}>{t}</h3>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "rgba(253,250,245,.78)", margin: 0, lineHeight: 1.62 }}>{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function OccasionTile({ o }: { o: typeof GIFT_OCCASIONS[number] }) {
  const [h, setH] = React.useState(false);
  return (
    <a href={"#set-" + o.set} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ position: "relative", display: "block", borderRadius: 12, overflow: "hidden", aspectRatio: "3 / 4", boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-sm)", transition: "box-shadow .3s" }}>
      <ImageSlot id={o.slot} shape="rect" fit="cover" placeholder={`Drop a ${o.name} gifting photo`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${o.color}55, ${o.deep}dd)`, mixBlendMode: "multiply", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 44%, rgba(0,0,0,.58))", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: o.color, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 20, right: 20, bottom: 20, color: "#fff", pointerEvents: "none" }}>
        <div className="eyebrow" style={{ color: "rgba(253,250,245,.82)", marginBottom: 6 }}>{o.note}</div>
        <h3 className="disp" style={{ fontSize: 25, margin: 0, lineHeight: 1.05, color: "#fff", textShadow: "0 1px 12px rgba(0,0,0,.4)" }}>{o.name}</h3>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 9, fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, color: "#E6B860", transform: h ? "translateX(3px)" : "none", transition: "transform .2s" }}>See the set <GIcon name="arrow" size={14} stroke="#E6B860" w={2} /></span>
      </div>
    </a>
  );
}

function GiftOccasions() {
  return (
    <section style={{ background: "var(--bg)", padding: "96px 0" }}>
      <div className="home-section-pad" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 44 }}>
          <div>
            <Reveal><Eyebrow>Find the right one</Eyebrow></Reveal>
            <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(30px,3.6vw,48px)", color: "var(--brand)", margin: "12px 0 0", lineHeight: 1.04 }}>Gifts by occasion</h2></Reveal>
          </div>
          <Reveal delay={100}><p style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, color: "var(--muted)", maxWidth: 320, lineHeight: 1.6, paddingBottom: 6 }}>Not sure where to start? We&rsquo;ve matched a box to the moment.</p></Reveal>
        </div>
        <div className="gift-occ" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
          {GIFT_OCCASIONS.map((o, i) => <Reveal key={o.name} delay={i * 60}><OccasionTile o={o} /></Reveal>)}
        </div>
      </div>
    </section>
  );
}

function GiftCorporate({ market }: { market: Market }) {
  const btn = market === "local" ? "btn btn-local" : "btn btn-intl";
  return (
    <section style={{ background: "var(--surface)", padding: "84px 0", borderTop: "1px solid var(--line)" }}>
      <div className="home-section-pad gift-corp" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center" }}>
        <div>
          <Reveal><div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14 }}><GIcon name="building" size={20} stroke="var(--brand)" /><span className="eyebrow" style={{ color: "var(--accent)" }}>Corporate &amp; bulk gifting</span></div></Reveal>
          <Reveal delay={60}><h2 className="disp" style={{ fontSize: "clamp(28px,3.2vw,42px)", color: "var(--brand)", margin: "0 0 14px", lineHeight: 1.05, maxWidth: 560 }}>Gifting for clients, teams &amp; events?</h2></Reveal>
          <Reveal delay={100}><p className="prose" style={{ fontSize: 16, color: "var(--muted)", margin: 0, maxWidth: 520 }}>
            We produce custom-branded boxes, bespoke selections and volume orders with your own message card — shipped to one address or many. Tell us the occasion and headcount and we&rsquo;ll build a quote.
          </p></Reveal>
        </div>
        <Reveal delay={120}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}>
            <Link href="/contact" className={btn} style={{ width: "auto", padding: "14px 26px", textAlign: "center" }}>Enquire about corporate gifts</Link>
            <Link href="/wholesale" className="btn btn-ghost" style={{ width: "auto", padding: "14px 26px", textAlign: "center" }}>See wholesale &amp; trade</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function GiftsClient() {
  const { market } = useMarket();
  const gridRef = React.useRef<HTMLElement>(null);
  const scrollToGrid = () => { if (gridRef.current) gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return (
    <div data-screen-label="Gifts">
      <GiftHero market={market} onShop={scrollToGrid} />
      <FeaturedSet market={market} gridRef={gridRef} />
      <GiftGrid market={market} gridRef={gridRef} />
      <FinishingBand />
      <GiftOccasions />
      <GiftCorporate market={market} />
    </div>
  );
}
