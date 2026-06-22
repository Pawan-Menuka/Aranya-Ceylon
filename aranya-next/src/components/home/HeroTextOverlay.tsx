"use client";

/* =============================================================================
   Aranya Ceylon — Hero Text Overlay (drop-in)
   -----------------------------------------------------------------------------
   Contains ONLY the text layer:
     • two editorial side captions (fade out as the brand reveals)
     • the centered brand stack: Seal → ARANYA → CEYLON → tagline → CTA button
   …plus the reveal timing. It renders NOTHING for the background — the existing
   hero background, frame sequence, glow, etc. stay exactly as they are.

   Mount this INSIDE the hero's sticky/pinned 100vh container, layered on top of
   the background. It paints a full-bleed overlay (position:absolute; inset:0).

   PROGRESS: pass `progress` (0→1) — the SAME scroll value that drives the frame
   index (0 = first frame, 1 = 192nd / last frame). The brand reaches full opacity
   right as the sequence finishes, then HOLDS for the tail. If `progress` is
   omitted the component self-measures from the nearest `[data-hero]` wrapper.

   `holdTail` (default 0.38) = fraction of scroll reserved as a HOLD after the text
   is fully in. Set holdTail={0} to peg the text exactly to progress === 1.
   ========================================================================== */

import * as React from "react";
import Link from "next/link";
import { Seal } from "../primitives/Seal";

const FONT_DISPLAY = "var(--font-display, 'Cormorant Garamond', Georgia, serif)";
const FONT_UI = "var(--font-ui, 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif)";
const ACCENT = "var(--accent, #BA7517)";
const GOLD = "#E6B860";
const CREAM = "#FDFAF5";

// smoothstep — eased 0→1 ramp between a and b
function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export type HeroTextOverlayProps = {
  /** 0→1 scroll/frame progress (1 = last frame). Omit to self-measure from [data-hero]. */
  progress?: number | null;
  wrapSelector?: string;
  /** share of scroll held AFTER the text is fully in */
  holdTail?: number;
  ctaHref?: string;
  ctaLabel?: string;
  brandTop?: string;
  brandBottom?: string;
  tagline?: string;
  leftEyebrow?: string;
  leftText?: string;
  rightEyebrow?: string;
  rightText?: string;
};

export default function HeroTextOverlay({
  progress = null,
  wrapSelector = "[data-hero]",
  holdTail = 0.38,
  ctaHref = "#",
  ctaLabel = "Discover our spices",
  brandTop = "ARANYA",
  brandBottom = "CEYLON",
  tagline = "Spice, as the forest intended.",
  leftEyebrow = "The forest larder",
  leftText = "Gathered by hand where the canopy keeps them cool.",
  rightEyebrow = "Single origin",
  rightText = "Cured & sealed in Ceylon — never blended, never rushed.",
}: HeroTextOverlayProps) {
  const [selfP, setSelfP] = React.useState(0);

  // Self-measure scroll progress from the pinned wrapper (only if no prop given).
  React.useEffect(() => {
    if (progress != null) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const wrap = document.querySelector(wrapSelector) as HTMLElement | null;
        if (!wrap) return;
        const span = wrap.offsetHeight - window.innerHeight;
        const prog = Math.min(1, Math.max(0, -wrap.getBoundingClientRect().top / Math.max(1, span)));
        setSelfP(prog);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [progress, wrapSelector]);

  const p = progress != null ? progress : selfP;

  // Reveal timing: text eases in GRADUALLY, full as the sequence finishes, then HOLDS.
  const cp = Math.min(1, p / Math.max(0.0001, 1 - holdTail)); // cinematic/appear progress
  const appear = smooth(0.3, 1, cp); // graceful, slow reveal — full at the last frame
  const brandFade = appear; // brand stack opacity
  const sideFade = 1 - appear; // captions crossfade out as the brand arrives
  const enterY = ((1 - appear) * 22).toFixed(1); // rises gently into place
  const track = (0.14 + appear * 0.16).toFixed(3); // tracking widens as it appears
  const interactive = sideFade > 0.5; // captions clickable only while clearly visible

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <style>{`
        .hto-cta{display:inline-flex;align-items:center;gap:10px;font-family:${FONT_UI};font-weight:700;
          font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:${ACCENT};
          border:0;border-radius:var(--radius,10px);padding:14px 32px;text-decoration:none;
          transition:filter .15s, transform .15s;}
        .hto-cta:hover{filter:brightness(1.06);}
        .hto-cta:active{transform:translateY(1px);}
        @media (max-width:900px){ .hto-side{display:none !important;} }
      `}</style>

      {/* editorial side captions — fill the empty frame, crossfade out as the brand reveals */}
      <div className="hto-side" style={{ position: "absolute", left: "clamp(24px,5vw,80px)", top: "50%", transform: "translateY(-50%)", maxWidth: 300, width: 300, textAlign: "left", opacity: sideFade, pointerEvents: interactive ? "auto" : "none" }}>
        <div style={{ width: 44, height: 1.5, background: ACCENT, marginBottom: 20 }}></div>
        <div style={{ fontFamily: FONT_UI, fontSize: 12, letterSpacing: ".3em", textTransform: "uppercase", color: GOLD, fontWeight: 600, marginBottom: 16 }}>{leftEyebrow}</div>
        <p style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: "clamp(27px,2.5vw,36px)", lineHeight: 1.22, color: "rgba(253,250,245,.9)", margin: 0 }}>{leftText}</p>
      </div>
      <div className="hto-side" style={{ position: "absolute", right: "clamp(24px,5vw,80px)", top: "50%", transform: "translateY(-50%)", maxWidth: 300, width: 300, textAlign: "right", opacity: sideFade, pointerEvents: interactive ? "auto" : "none" }}>
        <div style={{ width: 44, height: 1.5, background: ACCENT, marginBottom: 20, marginLeft: "auto" }}></div>
        <div style={{ fontFamily: FONT_UI, fontSize: 12, letterSpacing: ".3em", textTransform: "uppercase", color: GOLD, fontWeight: 600, marginBottom: 16 }}>{rightEyebrow}</div>
        <p style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: "clamp(27px,2.5vw,36px)", lineHeight: 1.22, color: "rgba(253,250,245,.9)", margin: 0 }}>{rightText}</p>
      </div>

      {/* brand stack — eases in, full at the last frame, then holds */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: `translateY(calc(-50% + ${enterY}px))`, display: "flex", flexDirection: "column", alignItems: "center", opacity: brandFade, pointerEvents: "none" }}>
        <Seal size={62} tone="light" />
        <div style={{ width: 44, height: 1.5, background: ACCENT, margin: "26px 0 22px" }}></div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(48px,7vw,92px)", fontWeight: 600, color: CREAM, letterSpacing: track + "em", lineHeight: 1, textIndent: track + "em", whiteSpace: "nowrap" }}>{brandTop}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: "clamp(16px,2.2vw,24px)", color: ACCENT, letterSpacing: ".34em", marginTop: 16, textIndent: ".34em" }}>{brandBottom}</div>
        <div style={{ width: 44, height: 1.5, background: ACCENT, margin: "22px 0 0" }}></div>
        <p style={{ fontFamily: FONT_UI, fontSize: 13, letterSpacing: ".04em", color: "rgba(253,250,245,.7)", marginTop: 22 }}>{tagline}</p>
        <Link href={ctaHref} className="hto-cta" style={{ marginTop: 28, pointerEvents: brandFade > 0.4 ? "auto" : "none" }}>
          {ctaLabel}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
        </Link>
      </div>
    </div>
  );
}
