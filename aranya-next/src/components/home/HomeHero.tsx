"use client";

import * as React from "react";
import { Icon } from "../primitives/Icon";
import { useMarket } from "../MarketContext";
import HeroTextOverlay from "./HeroTextOverlay";

// Homepage hero: 300vh pinned scroll-driven frame sequence (AranyaHero design)
// + entrance choreography + amber spice-dust canvas + kinetic letter-spacing.
// Frames are served from /public/hero/{desktop,mobile}/frame_0001.jpg … 0192.jpg.
const TOTAL_FRAMES = 192;
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
const SMOOTHING = 0.08;      // lerp factor: lower = smoother/floatier, higher = snappier
const framePath = (index: number, isMobile: boolean) =>
  `/hero/${isMobile ? "mobile" : "desktop"}/frame_${String(index + 1).padStart(4, "0")}.webp`;

// Map raw scroll progress (0→1) to a frame target index. Frames reach the last one
// at progress === (1 - FRAME_HOLD_TAIL), then stay pinned on it through the tail.
function frameTarget(p: number) {
  const fp = Math.min(1, Math.max(0, p) / (1 - FRAME_HOLD_TAIL));
  return Math.min(TOTAL_FRAMES - 1, Math.max(0, fp * (TOTAL_FRAMES - 1)));
}

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

// Scroll-driven frame-sequence background (AranyaHero). Preloads progressively
// and paints the frame matching the hero scroll progress onto a cover-fit canvas.
function HeroFrames({ progress }: { progress: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const imagesRef = React.useRef<HTMLImageElement[]>([]);
  const currentFrameRef = React.useRef(-1);
  const [isMobile, setIsMobile] = React.useState(false);
  const [firstLoaded, setFirstLoaded] = React.useState(false);
  const progressRef = React.useRef(0);
  progressRef.current = progress;

  // Cover-fit draw (like object-fit: cover) of an image onto the canvas.
  const drawFrame = React.useCallback((img: HTMLImageElement | undefined) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!img || !img.complete || !canvas || !ctx) return;
    // Draw in CSS pixels — sizeCanvas() scales the context by DPR, so the backing
    // store is higher-resolution while the cover-fit math stays in CSS space.
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return;
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale, sh = ih * scale;
    ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
  }, []);

  // Size the canvas backing store to the device pixel ratio so frames render
  // crisply on high-DPI/retina displays (it was previously sized in CSS pixels
  // and upscaled, which softened the imagery). Capped at 2× to avoid allocating
  // an oversized canvas on 3× phones. Reassigning width/height resets the
  // context transform, so the DPR scale is re-applied on every call.
  const sizeCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  // Detect mobile to pick the right frame folder.
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Canvas context + sizing, redraw current frame on resize.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext("2d");
    const setSize = () => {
      sizeCanvas();
      drawFrame(imagesRef.current[Math.max(0, currentFrameRef.current)]);
    };
    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, [drawFrame, sizeCanvas]);

  // Progressive preload: first frame immediately, then 1–40, rest on idle.
  React.useEffect(() => {
    const mobile = isMobile;
    imagesRef.current = [];
    currentFrameRef.current = -1;
    const loadAt = (i: number) => {
      if (imagesRef.current[i]) return;
      const img = new Image();
      img.src = framePath(i, mobile);
      imagesRef.current[i] = img;
    };
    const firstImg = new Image();
    firstImg.src = framePath(0, mobile);
    imagesRef.current[0] = firstImg;
    firstImg.onload = () => {
      if (canvasRef.current && ctxRef.current) {
        sizeCanvas();
        drawFrame(firstImg);
        currentFrameRef.current = 0;
      }
      setFirstLoaded(true);
      for (let i = 1; i <= 40; i++) loadAt(i);
    };
    const ric = typeof window !== "undefined" ? window.requestIdleCallback : undefined;
    const idleId = ric
      ? ric(() => { for (let i = 41; i < TOTAL_FRAMES; i++) loadAt(i); })
      : window.setTimeout(() => { for (let i = 41; i < TOTAL_FRAMES; i++) loadAt(i); }, 1000);
    return () => {
      if (ric && typeof idleId === "number") window.cancelIdleCallback(idleId);
      else clearTimeout(idleId as number);
    };
  }, [isMobile, drawFrame, sizeCanvas]);

  // Continuous render loop — glides toward the scroll target instead of jumping.
  React.useEffect(() => {
    let running = true;
    let rendered = frameTarget(progressRef.current);
    const tick = () => {
      if (!running) return;
      const target = frameTarget(progressRef.current);
      // Lerp: move a fraction of the remaining distance each frame.
      rendered += (target - rendered) * SMOOTHING;
      const idx = Math.round(rendered);
      if (idx !== currentFrameRef.current) {
        const img = imagesRef.current[idx];
        if (img && img.complete) {
          currentFrameRef.current = idx;
          drawFrame(img);
        }
      }
      requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [drawFrame]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0, display: "block", width: "100%", height: "100%",
        // Transparent so the high-res poster (on the wrapper) shows through at rest.
        // The frame sequence fades in only once the user starts scrolling, so the
        // crisp, watermark-free still is the resting image and the video footage
        // (different layout) never pops in on first paint.
        background: "transparent", opacity: firstLoaded && progress > 0.002 ? 1 : 0, transition: "opacity 0.4s ease",
      }}
    />
  );
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

  const scrollFade = 1 - smooth(0.02, 0.12, p);

  return (
    <div ref={wrapRef} data-hero data-screen-label="Hero" style={{ height: `${SCROLL_MULTIPLIER * 100}vh`, position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", backgroundColor: "#1A1A1A", backgroundImage: "url('/hero/poster.webp')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <HeroFrames progress={p} />
        <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 ${120 + p * 160}px rgba(0,0,0,${0.42 + p * 0.28})`, pointerEvents: "none" }} />
        <HeroDust progress={p} enabled={dust} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 180, background: "linear-gradient(180deg, transparent, var(--bg))", opacity: smooth(0.88, 1, p) }} />

        {/* brand text layer — eases in as the frame sequence plays, then holds */}
        <HeroTextOverlay progress={p} holdTail={FRAME_HOLD_TAIL} ctaHref="/products" />

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
