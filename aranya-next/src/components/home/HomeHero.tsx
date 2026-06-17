"use client";

import * as React from "react";
import Link from "next/link";
import { Seal } from "../primitives/Seal";
import { Icon } from "../primitives/Icon";
import { useMarket } from "../MarketContext";

// Homepage hero (ported from home2-hero.jsx): 300vh pinned frame-sequence +
// entrance choreography + amber spice-dust canvas + kinetic letter-spacing.
// Real frames: host 0001…0192 on NEXT_PUBLIC_ASSETS_URL and set USE_REAL_FRAMES.
const ASSETS = process.env.NEXT_PUBLIC_ASSETS_URL || "";
const USE_REAL_FRAMES = false;
const FRAME_COUNT = 192;
const FRAME_SRC = (i: number) => `${ASSETS}/frames/${String(i).padStart(4, "0")}.webp`;
const SIM_STILL = "/assets/hero-spices.png";

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Drifting amber spice-dust — sparse, slow, fades out as the user scrolls deeper.
function HeroDust({ progress, enabled }: { progress: number; enabled: boolean }) {
  const cvRef = React.useRef<HTMLCanvasElement | null>(null);
  const progRef = React.useRef(0);
  progRef.current = progress;
  React.useEffect(() => {
    if (!enabled) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0;
    const resize = () => {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * DPR; cv.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const COLORS = ["#E6B860", "#BA7517", "#FDFAF5", "#C9881A"];
    const P = Array.from({ length: 56 }, (_, i) => ({
      x: Math.random(), y: Math.random(), r: 0.7 + Math.random() * 1.7,
      s: 0.018 + Math.random() * 0.05, sway: 6 + Math.random() * 22,
      ph: Math.random() * Math.PI * 2, c: COLORS[i % 4], a: 0.2 + Math.random() * 0.5,
    }));
    let last = performance.now();
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(60, t - last) / 1000; last = t;
      ctx.clearRect(0, 0, w, h);
      const fade = Math.max(0, 1 - progRef.current * 1.6) * 0.85;
      if (fade < 0.02) return;
      for (const s of P) {
        s.y -= s.s * dt;
        if (s.y < -0.04) { s.y = 1.04; s.x = Math.random(); }
        const x = s.x * w + Math.sin(t * 0.0004 + s.ph) * s.sway;
        const tw = 0.55 + 0.45 * Math.sin(t * 0.0016 + s.ph * 3);
        ctx.globalAlpha = s.a * tw * fade;
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(x, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [enabled]);
  if (!enabled) return null;
  return <canvas ref={cvRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

export function HomeHero({ dust = true }: { dust?: boolean }) {
  const [p, setP] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const wrap = wrapRef.current;
        if (!wrap) return;
        const span = wrap.offsetHeight - window.innerHeight;
        const prog = Math.min(1, Math.max(0, -wrap.getBoundingClientRect().top / Math.max(1, span)));
        setP(prog);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scale = 1 + p * 0.7;
  const bright = 1 + p * 0.32;
  const sat = 1 + p * 0.22;
  const blur = Math.max(0, p - 0.85) * 6;
  const glow = smooth(0.25, 1, p) * 0.66;
  const brandFade = 1 - smooth(0.4, 0.74, p);
  const scrollFade = 1 - smooth(0.02, 0.12, p);
  const frameIdx = Math.min(FRAME_COUNT, Math.max(1, Math.round(1 + p * (FRAME_COUNT - 1))));
  const track = (0.14 + smooth(0, 0.74, p) * 0.16).toFixed(3);
  const lift = (smooth(0, 0.74, p) * 36).toFixed(1);

  return (
    <div ref={wrapRef} data-hero data-screen-label="Hero" style={{ height: "300vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "#1A1A1A" }}>
        {USE_REAL_FRAMES ? (
          <img src={FRAME_SRC(frameIdx)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${SIM_STILL})`, backgroundSize: "cover", backgroundPosition: "center 46%", transform: `scale(${scale})`, filter: `brightness(${bright}) saturate(${sat}) blur(${blur}px)`, transformOrigin: "50% 46%" }} />
            <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen", opacity: glow, background: "radial-gradient(42% 42% at 50% 46%, rgba(230,160,60,.85), rgba(186,117,23,.22) 46%, transparent 70%)" }} />
          </>
        )}
        <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${120 + p * 160}px rgba(0,0,0,${0.42 + p * 0.28})`, pointerEvents: "none" }} />
        <HeroDust progress={p} enabled={dust} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 180, background: "linear-gradient(180deg, transparent, var(--bg))", opacity: smooth(0.88, 1, p) }} />

        {/* brand overlay — choreographed entrance, kinetic on scroll */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: `translateY(calc(-50% - ${lift}px))`, display: "flex", flexDirection: "column", alignItems: "center", opacity: brandFade, pointerEvents: "none" }}>
          <div className="hero-anim-seal"><Seal size={62} tone="light" /></div>
          <div className="hero-anim-rule" style={{ width: 44, height: 1.5, background: "var(--accent)", margin: "26px 0 22px" }} />
          <div className="disp" aria-label="ARANYA" style={{ fontSize: "clamp(48px,7vw,92px)", fontWeight: 600, color: "#FDFAF5", letterSpacing: track + "em", lineHeight: 1, textIndent: track + "em", whiteSpace: "nowrap" }}>
            {"ARANYA".split("").map((ch, i) => (
              <span key={i} className="hero-letter" aria-hidden="true" style={{ display: "inline-block", animationDelay: 0.7 + i * 0.07 + "s" }}>{ch}</span>
            ))}
          </div>
          <div className="disp hero-anim-ceylon" style={{ fontStyle: "italic", fontSize: "clamp(16px,2.2vw,24px)", color: "var(--accent)", letterSpacing: ".34em", marginTop: 16, textIndent: ".34em" }}>CEYLON</div>
          <div className="hero-anim-rule2" style={{ width: 44, height: 1.5, background: "var(--accent)", margin: "22px 0 0" }} />
          <p className="hero-anim-tag" style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: ".04em", color: "rgba(253,250,245,.7)", marginTop: 22 }}>Spice, as the forest intended.</p>
          <Link href="/products" className="btn btn-intl hero-anim-cta" style={{ width: "auto", padding: "14px 32px", marginTop: 28, fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 10, pointerEvents: brandFade > 0.4 ? "auto" : "none" }}>
            Discover our spices
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>

        {/* scroll indicator */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: scrollFade, pointerEvents: "none" }}>
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
