/* Aranya Ceylon — homepage hero: 300vh pinned canvas frame-sequence.
   Frames at aranyaHero/hero_wm/desktop/frame_0001.jpg … frame_0192.jpg
   and       aranyaHero/hero_wm/mobile/frame_0001.jpg  … frame_0192.jpg  */

const { useState: hhState, useEffect: hhEffect, useRef: hhRef } = React;

const HH_TOTAL      = 192;
const HH_SCROLL_MUL = 3;   // hero pins for 3× viewport height of scroll

function hhPad(n) { return String(n).padStart(4, "0"); }
function hhPath(idx, mobile) {
  return `aranyaHero/hero_wm/${mobile ? "mobile" : "desktop"}/frame_${hhPad(idx + 1)}.jpg`;
}
function hhSmooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/* Cover-fit draw — like object-fit: cover on a canvas */
function hhDraw(img, canvas, ctx) {
  if (!img || !img.complete || !canvas || !ctx) return;
  const cw = canvas.width,  ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(cw / iw, ch / ih);
  const sw = iw * scale, sh = ih * scale;
  ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
}

function HomeHero() {
  const wrapRef         = hhRef(null);
  const canvasRef       = hhRef(null);
  const ctxRef          = hhRef(null);
  const imagesRef       = hhRef([]);      // preloaded Image objects
  const currentFrameRef = hhRef(0);       // last rendered frame index
  const rafRef          = hhRef(null);    // rAF handle

  const [firstLoaded, setFirstLoaded] = hhState(false);
  const [isMobile,    setIsMobile]    = hhState(false);
  const [p,           setP]           = hhState(0);      // scroll progress 0 → 1

  /* ── Mobile detection ─────────────────────────────────────────────────── */
  hhEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── Canvas setup + resize ────────────────────────────────────────────── */
  hhEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext("2d");

    const setSize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const img = imagesRef.current[currentFrameRef.current];
      if (img && img.complete) hhDraw(img, canvas, ctxRef.current);
    };
    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, []);

  /* ── Progressive frame loading ────────────────────────────────────────── */
  hhEffect(() => {
    const mobile = isMobile;
    imagesRef.current = [];
    currentFrameRef.current = 0;

    function loadAt(idx) {
      if (imagesRef.current[idx]) return;
      const img = new Image();
      img.src = hhPath(idx, mobile);
      imagesRef.current[idx] = img;
    }

    /* Phase 1 — first frame (LCP critical) */
    const first = new Image();
    first.src = hhPath(0, mobile);
    imagesRef.current[0] = first;
    first.onload = () => {
      const canvas = canvasRef.current;
      const ctx    = ctxRef.current;
      if (canvas && ctx) {
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        hhDraw(first, canvas, ctx);
      }
      setFirstLoaded(true);
      /* Phase 2 — frames 1–40 right after first renders */
      for (let i = 1; i <= 40; i++) loadAt(i);
    };

    /* Phase 3 — remaining frames on idle */
    let idleId;
    if (typeof requestIdleCallback !== "undefined") {
      idleId = requestIdleCallback(() => { for (let i = 41; i < HH_TOTAL; i++) loadAt(i); });
    } else {
      idleId = setTimeout(() => { for (let i = 41; i < HH_TOTAL; i++) loadAt(i); }, 1000);
    }

    return () => {
      if (typeof cancelIdleCallback !== "undefined" && idleId) cancelIdleCallback(idleId);
      else clearTimeout(idleId);
      imagesRef.current = [];
    };
  }, [isMobile]);

  /* ── Scroll handler — updates frame + progress ────────────────────────── */
  hhEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const span = wrap.offsetHeight - window.innerHeight;
        const prog = Math.min(1, Math.max(0, -wrap.getBoundingClientRect().top / Math.max(1, span)));
        setP(prog);

        const frameIdx = Math.min(Math.floor(prog * (HH_TOTAL - 1)), HH_TOTAL - 1);
        if (frameIdx === currentFrameRef.current) return;
        currentFrameRef.current = frameIdx;

        const img    = imagesRef.current[frameIdx];
        const canvas = canvasRef.current;
        const ctx    = ctxRef.current;

        if (img && img.complete && canvas && ctx) {
          hhDraw(img, canvas, ctx);
        } else if (canvas && ctx) {
          /* frame not ready — fall back to closest already-loaded frame */
          for (let off = 1; off < 10; off++) {
            const fb = imagesRef.current[Math.max(0, frameIdx - off)];
            if (fb && fb.complete) { hhDraw(fb, canvas, ctx); break; }
          }
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // seed on mount
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ── Derived animation values ─────────────────────────────────────────── */
  const brandFade  = 1 - hhSmooth(0.4, 0.74, p);   // text visible at start, fades mid-scroll
  const scrollFade = 1 - hhSmooth(0.02, 0.12, p);  // scroll indicator hides early

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div ref={wrapRef} data-hero style={{ height: `${HH_SCROLL_MUL * 100}vh`, position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "#1A1A1A" }}>

        {/* Canvas — frame sequence renders here */}
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            background: "#1A1A1A",
            opacity: firstLoaded ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
          aria-hidden="true"
        />

        {/* Dynamic vignette deepens as frames progress */}
        <div style={{
          position: "absolute", inset: 0,
          boxShadow: `inset 0 0 ${120 + p * 160}px rgba(0,0,0,${0.42 + p * 0.28})`,
          pointerEvents: "none",
        }} />

        {/* Bottom edge: dark → cream hand-off */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 180,
          background: "linear-gradient(180deg, transparent, var(--bg))",
          opacity: hhSmooth(0.88, 1, p),
          pointerEvents: "none",
        }} />

        {/* Brand overlay — appears at start, gradually fades as user scrolls */}
        <div style={{
          position: "absolute", left: 0, right: 0, top: "50%",
          transform: "translateY(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: brandFade,
          pointerEvents: "none",
        }}>
          <Seal size={62} tone="light" />
          <div style={{ width: 44, height: 1.5, background: "var(--accent)", margin: "26px 0 22px" }} />
          <div className="disp" style={{ fontSize: "clamp(48px,7vw,92px)", fontWeight: 600, color: "#FDFAF5", letterSpacing: ".14em", lineHeight: 1, textIndent: ".14em" }}>ARANYA</div>
          <div className="disp" style={{ fontStyle: "italic", fontSize: "clamp(16px,2.2vw,24px)", color: "var(--accent)", letterSpacing: ".34em", marginTop: 16, textIndent: ".34em" }}>CEYLON</div>
          <div style={{ width: 44, height: 1.5, background: "var(--accent)", margin: "22px 0 0" }} />
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, letterSpacing: ".04em", color: "rgba(253,250,245,.7)", marginTop: 22 }}>Spice, as the forest intended.</p>
        </div>

        {/* Scroll indicator — hides as soon as the user starts scrolling */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 30,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          opacity: scrollFade, pointerEvents: "none",
        }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: ".24em", textTransform: "uppercase", color: "rgba(253,250,245,.55)", fontWeight: 500 }}>Scroll to enter</span>
          <div style={{ width: 23, height: 35, borderRadius: 12, border: "1.5px solid rgba(253,250,245,.45)", position: "relative" }}>
            <span className="hero-dot" style={{ position: "absolute", left: "50%", top: 7, width: 3.5, height: 3.5, borderRadius: 9, background: "rgba(253,250,245,.85)", transform: "translateX(-50%)" }} />
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MarketStrip — one-time market-confirm banner pinned below the nav.
   ───────────────────────────────────────────────────────────────────────────── */
function MarketStrip({ market, setMarket }) {
  const [show, setShow] = hhState(false);
  hhEffect(() => {
    try { if (!localStorage.getItem("aranya-market-ack")) setShow(true); } catch (e) { setShow(true); }
  }, []);
  if (!show) return null;
  const dismiss = () => { try { localStorage.setItem("aranya-market-ack", "1"); } catch (e) {} setShow(false); };
  const intl = market === "intl";
  return (
    <div style={{ position: "fixed", top: 106, left: 0, right: 0, zIndex: 55, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div className="aranya" style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 16, background: "rgba(26,26,26,.92)", backdropFilter: "blur(10px)",
        color: "#FDFAF5", borderRadius: 999, padding: "9px 10px 9px 20px", boxShadow: "0 12px 36px rgba(0,0,0,.32)", border: "1px solid rgba(230,184,96,.3)" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="globe" size={15} stroke="#E6B860" /> Shipping to <b style={{ color: "#E6B860" }}>{intl ? "International" : "Sri Lanka"}</b> · prices in {intl ? "USD" : "LKR"}
        </span>
        <button onClick={() => setMarket(intl ? "local" : "intl")} style={{ background: "transparent", border: "1px solid rgba(253,250,245,.3)", color: "#FDFAF5",
          borderRadius: 999, padding: "6px 13px", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Switch to {intl ? "Sri Lanka · LKR" : "International · USD"}
        </button>
        <button onClick={dismiss} aria-label="Confirm" style={{ background: "var(--accent)", border: 0, color: "#fff", borderRadius: 999, padding: "7px 16px", fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Got it</button>
      </div>
    </div>
  );
}

Object.assign(window, { HomeHero, MarketStrip });
