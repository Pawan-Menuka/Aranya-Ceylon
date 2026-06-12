/**
 * AranyaHero.jsx
 * Scroll-driven frame sequence hero for Aranya Ceylon
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy the /hero/desktop/ and /hero/mobile/ frame folders into your /public directory
 *    so they are served at /hero/desktop/frame_0001.jpg etc.
 * 2. Install GSAP: npm install gsap
 * 3. Drop <AranyaHero /> as the first component in your homepage.
 *
 * FOLDER STRUCTURE EXPECTED:
 * /public
 *   /hero
 *     /desktop   → frame_0001.jpg … frame_0192.jpg  (1920×1080)
 *     /mobile    → frame_0001.jpg … frame_0192.jpg  (960×540)
 */

"use client";

import { useEffect, useRef, useState } from "react";

// ─── Config ────────────────────────────────────────────────────────────────
const TOTAL_FRAMES = 192;
const SCROLL_MULTIPLIER = 5;   // was 3 — more scroll room, slower pace
const SMOOTHING = 0.08;        // lower = smoother/floatier, higher = snappier

// Pad frame number to 4 digits: 1 → "0001"
const pad = (n) => String(n).padStart(4, "0");

// Choose frame path based on viewport width
const framePath = (index, isMobile) =>
  `/hero/${isMobile ? "mobile" : "desktop"}/frame_${pad(index + 1)}.jpg`;

// ─── Component ─────────────────────────────────────────────────────────────
export default function AranyaHero() {
  const sectionRef = useRef(null);   // tall scroll container
  const stickyRef = useRef(null);    // sticky 100vh wrapper
  const canvasRef = useRef(null);    // canvas element
  const imagesRef = useRef([]);      // preloaded Image objects
  const currentFrameRef = useRef(0); // last rendered frame index
  const rafRef = useRef(null);       // requestAnimationFrame handle
  const ctxRef = useRef(null);       // canvas 2d context

  const [firstFrameLoaded, setFirstFrameLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ── Detect mobile ─────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Canvas context setup ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext("2d");

    const setSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      // Re-draw current frame on resize
      const img = imagesRef.current[currentFrameRef.current];
      if (img?.complete) drawFrame(img, canvas, ctxRef.current);
    };

    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, []);

  // ── Frame drawing helper ───────────────────────────────────────────────
  const drawFrame = (img, canvas, ctx) => {
    if (!img || !img.complete || !canvas || !ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Cover-fit: fill canvas while preserving aspect ratio (like object-fit: cover)
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const ox = (cw - sw) / 2;
    const oy = (ch - sh) / 2;

    ctx.drawImage(img, ox, oy, sw, sh);
  };

  // ── Preload frame helper ───────────────────────────────────────────────
  const loadFrameAt = (index, mobile) => {
    if (imagesRef.current[index]) return; // already loading/loaded
    const img = new Image();
    img.src = framePath(index, mobile);
    imagesRef.current[index] = img;
    return img;
  };

  // ── Progressive frame loading ──────────────────────────────────────────
  useEffect(() => {
    const mobile = isMobile;

    // Phase 1: First frame — critical, load immediately
    const firstImg = new Image();
    firstImg.src = framePath(0, mobile);
    imagesRef.current[0] = firstImg;
    firstImg.onload = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (canvas && ctx) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        drawFrame(firstImg, canvas, ctx);
      }
      setFirstFrameLoaded(true);

      // Phase 2: Frames 1–40 right after first frame loads
      for (let i = 1; i <= 40; i++) loadFrameAt(i, mobile);
    };

    // Phase 3: Remaining frames on idle
    const idleId = requestIdleCallback
      ? requestIdleCallback(() => {
          for (let i = 41; i < TOTAL_FRAMES; i++) loadFrameAt(i, mobile);
        })
      : setTimeout(() => {
          for (let i = 41; i < TOTAL_FRAMES; i++) loadFrameAt(i, mobile);
        }, 1000);

    return () => {
      if (requestIdleCallback && idleId) cancelIdleCallback(idleId);
      else clearTimeout(idleId);
      imagesRef.current = [];
    };
  }, [isMobile]);

  // ── Scroll handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let targetFrame = 0;    // where scroll says we should be
    let renderedFrame = 0;  // where we actually are (float)
    let running = true;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = section.offsetHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / sectionHeight));
      targetFrame = progress * (TOTAL_FRAMES - 1);
    };

    // Continuous render loop — glides toward target instead of jumping
    const tick = () => {
      if (!running) return;

      // Lerp: move a fraction of the remaining distance each frame
      renderedFrame += (targetFrame - renderedFrame) * SMOOTHING;

      const frameIndex = Math.round(renderedFrame);
      if (frameIndex !== currentFrameRef.current) {
        currentFrameRef.current = frameIndex;
        const img = imagesRef.current[frameIndex];
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (img?.complete && canvas && ctx) {
          drawFrame(img, canvas, ctx);
        }
      }
      requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    requestAnimationFrame(tick);

    return () => {
      running = false;
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // ── Reduced motion: static image fallback ─────────────────────────────
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  if (prefersReducedMotion) {
    return (
      <section
        style={{
          width: "100%",
          height: "100vh",
          background: "#1A1A1A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={framePath(0, false)}
          alt="Aranya Ceylon spices"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </section>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/*
        Tall scroll container — height = SCROLL_MULTIPLIER × 100vh
        This gives the user scroll room to drive the animation.
        The sticky inner div keeps the canvas visible throughout.
      */}
      <section
        ref={sectionRef}
        style={{
          position: "relative",
          height: `${SCROLL_MULTIPLIER * 100}vh`,
          background: "#1A1A1A",
        }}
        aria-label="Aranya Ceylon hero animation"
      >
        {/* Sticky wrapper — stays in viewport while user scrolls through section */}
        <div
          ref={stickyRef}
          style={{
            position: "sticky",
            top: 0,
            width: "100%",
            height: "100vh",
            overflow: "hidden",
            background: "#1A1A1A",
          }}
        >
          {/* Canvas — frame sequence renders here */}
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              background: "#1A1A1A",
              // Fade in once first frame is painted
              opacity: firstFrameLoaded ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
            aria-hidden="true"
          />

          {/* Brand overlay text — visible at start, fades as user scrolls */}
          <HeroOverlay />

          {/* Scroll indicator */}
          <ScrollIndicator />
        </div>
      </section>
    </>
  );
}

// ─── Hero text overlay ──────────────────────────────────────────────────────
function HeroOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "12%",
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {/* Thin amber rule above text */}
      <div
        style={{
          width: "40px",
          height: "1px",
          background: "#BA7517",
          marginBottom: "4px",
        }}
      />

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(36px, 5vw, 64px)",
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: "#FDFAF5",
          margin: 0,
          lineHeight: 1,
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
        }}
      >
        ARANYA
      </h1>

      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(14px, 2vw, 20px)",
          fontWeight: 400,
          fontStyle: "italic",
          letterSpacing: "0.28em",
          color: "#BA7517",
          margin: 0,
        }}
      >
        CEYLON
      </p>

      {/* Thin amber rule below text */}
      <div
        style={{
          width: "40px",
          height: "1px",
          background: "#BA7517",
          marginTop: "4px",
        }}
      />
    </div>
  );
}

// ─── Scroll indicator ───────────────────────────────────────────────────────
function ScrollIndicator() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "32px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        pointerEvents: "none",
        animation: "scrollBounce 2s ease-in-out infinite",
      }}
    >
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.2em",
          color: "rgba(253,250,245,0.5)",
          textTransform: "uppercase",
        }}
      >
        Scroll
      </span>
      <svg
        width="16"
        height="24"
        viewBox="0 0 16 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.5 }}
      >
        <rect
          x="1"
          y="1"
          width="14"
          height="22"
          rx="7"
          stroke="#FDFAF5"
          strokeWidth="1.5"
        />
        <rect
          x="7"
          y="5"
          width="2"
          height="5"
          rx="1"
          fill="#BA7517"
          style={{ animation: "scrollDot 2s ease-in-out infinite" }}
        />
      </svg>

      <style>{`
        @keyframes scrollBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(4px); }
        }
        @keyframes scrollDot {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(6px); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
