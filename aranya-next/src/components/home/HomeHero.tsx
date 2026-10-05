"use client";

import * as React from "react";
import { Icon } from "../primitives/Icon";
import { useMarket } from "../MarketContext";
import HeroTextOverlay from "./HeroTextOverlay";
import { HeroFrames, HeroDust } from "./HeroCanvas";
import { createHeroMotion } from "./hero-motion";
import Image from "next/image";
import { HERO_POSTER } from "@/lib/media";

// Homepage hero: 300vh pinned scroll-driven frame sequence (AranyaHero design)
// + entrance choreography + amber spice-dust canvas + kinetic letter-spacing.
// Frames are served from /public/hero/{desktop,mobile}/frame_0001.jpg … 0192.jpg.
// Hero pinned-scroll budget, expressed in units of 100vh:
//   FRAME_SCROLL = distance over which the 192 frames play (keeps the playback pace).
//   FRAME_HOLD   = extra distance that HOLDS on the final frame before the hero un-pins.
// Total wrapper height = (FRAME_SCROLL + FRAME_HOLD + 1) × 100vh; the +1 is the sticky
// 100vh viewport itself, which is subtracted out to form the 0→1 scroll span.
const FRAME_SCROLL = 4;   // 400vh of frame playback (unchanged pace)
const FRAME_HOLD = 1.6;   // 160vh holding on the last frame before scrolling on
const SCROLL_MULTIPLIER = FRAME_SCROLL + FRAME_HOLD + 1;
// Fraction of the 0→1 scroll reserved as the final-frame hold tail.
const FRAME_HOLD_TAIL = FRAME_HOLD / (FRAME_SCROLL + FRAME_HOLD);
function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function HomeHero({ dust = true }: { dust?: boolean }) {
  const motion = React.useMemo(createHeroMotion, []);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const shadowRef = React.useRef<HTMLDivElement>(null);
  const gradientRef = React.useRef<HTMLDivElement>(null);
  const hintRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const wrap = wrapRef.current!, reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    let raf = 0, top = 0, height = 0, span = 1;
    const measure = () => { const rect = wrap.getBoundingClientRect(); top = rect.top + window.scrollY; height = rect.height; span = Math.max(1, height - window.innerHeight); };
    const update = () => {
      raf = 0;
      const y = window.scrollY, p = Math.min(1, Math.max(0, (y - top) / span));
      const staticMode = reduced.matches || !!connection?.saveData;
      wrap.dataset.heroStatic = String(staticMode);
      motion.update({ progress: p, active: !document.hidden && y + window.innerHeight > top && y < top + height, mobile: window.innerWidth < 768, staticMode });
      if (shadowRef.current) shadowRef.current.style.boxShadow = `inset 0 0 ${120 + p * 160}px rgba(0,0,0,${0.42 + p * 0.28})`;
      if (gradientRef.current) gradientRef.current.style.opacity = String(smooth(0.88, 1, p));
      if (hintRef.current) hintRef.current.style.opacity = String(1 - smooth(0.02, 0.12, p));
    };
    const onScroll = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(update); };
    const onResize = () => { measure(); onScroll(); };
    const onVisibility = () => { cancelAnimationFrame(raf); raf = 0; update(); };
    const observer = new ResizeObserver(onResize);
    measure(); update(); observer.observe(wrap);
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility); reduced.addEventListener("change", onVisibility);
    connection?.addEventListener("change", onVisibility);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility); reduced.removeEventListener("change", onVisibility); connection?.removeEventListener("change", onVisibility); };
  }, [motion]);

  return (
    <div ref={wrapRef} data-hero data-screen-label="Hero" style={{ height: `${SCROLL_MULTIPLIER * 100}vh`, position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", backgroundColor: "#1A1A1A" }}>
        <Image src={HERO_POSTER} alt="" fill priority unoptimized style={{ objectFit: "cover", objectPosition: "center" }} />
        <HeroFrames motion={motion} />
        <div ref={shadowRef} style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 120px rgba(0,0,0,0.42)", pointerEvents: "none" }} />
        <HeroDust motion={motion} enabled={dust} />
        <div ref={gradientRef} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 180, background: "linear-gradient(180deg, transparent, var(--bg))", opacity: 0 }} />
        <HeroTextOverlay progressSource={motion} holdTail={FRAME_HOLD_TAIL} ctaHref="/products" />
        <div ref={hintRef} style={{ position: "absolute", left: 0, right: 0, bottom: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 1, pointerEvents: "none" }}>
          <span className="hero-anim-scrollhint" style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: ".24em", textTransform: "uppercase", color: "rgba(253,250,245,.55)", fontWeight: 500 }}>Scroll to enter</span>
          <div className="hero-anim-scrollhint" style={{ width: 23, height: 35, borderRadius: 12, border: "1.5px solid rgba(253,250,245,.45)", position: "relative" }}>
            <span className="hero-dot" style={{ position: "absolute", left: "50%", top: 7, width: 3.5, height: 3.5, borderRadius: 9, background: "rgba(253,250,245,.85)", transform: "translateX(-50%)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
// One-time slim market-confirm strip, pinned just under the nav on first visit.
export function MarketStrip() {
  const { market, setMarket } = useMarket();
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    try {
      if (!localStorage.getItem("aranya-market-ack")) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem("aranya-market-ack", "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  const intl = market === "intl";
  return (
    <div style={{ position: "fixed", top: 106, left: 0, right: 0, zIndex: 55, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div className="aranya" style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 16, background: "rgba(26,26,26,.92)", backdropFilter: "blur(10px)", color: "#FDFAF5", borderRadius: 999, padding: "9px 10px 9px 20px", boxShadow: "0 12px 36px rgba(0,0,0,.32)", border: "1px solid rgba(230,184,96,.3)" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="globe" size={15} stroke="#E6B860" /> Shipping to <b style={{ color: "#E6B860" }}>{intl ? "International" : "Sri Lanka"}</b> · prices in {intl ? "USD" : "LKR"}
        </span>
        <button onClick={() => setMarket(intl ? "local" : "intl")} style={{ background: "transparent", border: "1px solid rgba(253,250,245,.3)", color: "#FDFAF5", borderRadius: 999, padding: "6px 13px", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Switch to {intl ? "Sri Lanka · LKR" : "International · USD"}
        </button>
        <button onClick={dismiss} aria-label="Confirm" style={{ background: "var(--accent)", border: 0, color: "#fff", borderRadius: 999, padding: "7px 16px", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Got it</button>
      </div>
    </div>
  );
}
