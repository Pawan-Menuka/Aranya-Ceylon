"use client";

import * as React from "react";
import { HeroFrameLoader, heroFrameWindow } from "./hero-frame-loader";
import type { HeroMotion } from "./hero-motion";
import { HERO_MEDIA_PREFIX } from "@/lib/media";

const frameTarget = (p: number) => Math.min(191, Math.max(0, Math.min(1, p / (1 - 1.6 / 5.6)) * 191));

async function decodeFrame(index: number, mobile: boolean, signal: AbortSignal): Promise<ImageBitmap> {
  const response = await fetch(`${HERO_MEDIA_PREFIX}/${mobile ? "mobile" : "desktop"}/frame_${String(index + 1).padStart(4, "0")}.webp`, { signal, cache: "force-cache" });
  if (!response.ok) throw new Error("Hero frame unavailable");
  const blob = await response.blob();
  signal.throwIfAborted();
  const bitmap = await createImageBitmap(blob);
  if (signal.aborted) { bitmap.close(); signal.throwIfAborted(); }
  return bitmap;
}

export function HeroFrames({ motion }: { motion: HeroMotion }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = ref.current!, ctx = canvas.getContext("2d");
    if (!ctx) return;
    let state = motion.read(), loader: HeroFrameLoader<ImageBitmap>;
    let mobile: boolean | null = null, rendered = frameTarget(state.progress), painted = -1, raf = 0, width = 0, height = 0;
    const stats = () => {
      const s = loader?.snapshot();
      canvas.dataset.frameCached = String(s?.cached ?? 0); canvas.dataset.frameActive = String(s?.active ?? 0);
      canvas.dataset.frameWindow = String(s?.wanted ?? 0); canvas.dataset.frameLoop = String(!!raf);
    };
    const draw = () => {
      const best = loader?.nearest(Math.round(rendered));
      canvas.style.opacity = best && state.progress > 0.002 && !state.staticMode ? "1" : "0";
      // The poster remains visible at rest; defer canvas/GPU work until scrolling.
      if (state.progress <= 0.002 || state.staticMode) return;
      if (best && best.index !== painted) {
        const scale = Math.max(width / best.frame.width, height / best.frame.height);
        const sw = best.frame.width * scale, sh = best.frame.height * scale;
        ctx.drawImage(best.frame, (width - sw) / 2, (height - sh) / 2, sw, sh);
        painted = best.index; canvas.dataset.frameIndex = String(best.index);
      }
    };
    const tick = () => {
      raf = 0;
      if (!state.active || state.staticMode || !loader) { stats(); return; }
      const target = frameTarget(state.progress), delta = target - rendered;
      rendered = Math.abs(delta) < 0.08 ? target : rendered + delta * 0.08;
      loader.setWindow(heroFrameWindow(Math.round(target), Math.round(rendered), delta < 0 ? -1 : 1));
      draw();
      if (Math.abs(target - rendered) >= 0.08) raf = requestAnimationFrame(tick);
      stats();
    };
    const wake = () => { if (state.active && !state.staticMode && !raf) raf = requestAnimationFrame(tick); stats(); };
    loader = new HeroFrameLoader(async (index, caller) => {
      const selectedMobile = mobile!;
      const controller = new AbortController(), abort = () => controller.abort();
      caller.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(abort, 8000);
      try { if (caller.aborted) controller.abort(); return await decodeFrame(index, selectedMobile, controller.signal); }
      finally { clearTimeout(timer); caller.removeEventListener("abort", abort); }
    }, frame => frame.close(), wake);
    const resize = () => {
      const bounds = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      width = bounds.width; height = bounds.height;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      painted = -1;
      if (mobile !== (window.innerWidth < 768)) canvas.style.opacity = "0";
      else if (state.active) draw();
      wake();
    };
    resize();
    const unsubscribe = motion.subscribe(next => {
      state = next;
      if (state.staticMode || state.mobile !== mobile) {
        loader.reset(); mobile = state.mobile; painted = -1; canvas.style.opacity = "0";
        rendered = frameTarget(state.progress);
      }
      const target = frameTarget(state.progress);
      loader?.setWindow(heroFrameWindow(Math.round(target), Math.round(rendered), target < rendered ? -1 : 1));
      loader?.setPaused(!state.active || state.staticMode || mobile === null);
      if (!state.active || state.staticMode) { cancelAnimationFrame(raf); raf = 0; stats(); }
      else wake();
    });
    window.addEventListener("resize", resize);
    return () => { unsubscribe(); cancelAnimationFrame(raf); loader?.dispose(); window.removeEventListener("resize", resize); };
  }, [motion]);
  return <canvas ref={ref} data-hero-frames aria-hidden="true" style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%", background: "transparent", opacity: 0, transition: "opacity 0.4s ease" }} />;
}

export function HeroDust({ motion, enabled }: { motion: HeroMotion; enabled: boolean }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (!enabled) return;
    const canvas = ref.current!, ctx = canvas.getContext("2d");
    if (!ctx) return;
    let state = motion.read(), w = 0, h = 0, raf = 0, last = performance.now();
    const colors = ["#E6B860", "#BA7517", "#FDFAF5", "#C9881A"];
    const particles = Array.from({ length: 56 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 0.7 + Math.random() * 1.7,
      s: 0.018 + Math.random() * 0.05, sway: 6 + Math.random() * 22, ph: Math.random() * Math.PI * 2, c: colors[i % 4], a: 0.2 + Math.random() * 0.5 }));
    const visible = () => state.active && !state.staticMode && Math.max(0, 1 - state.progress * 1.6) * 0.85 >= 0.02;
    const resize = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const tick = (t: number) => {
      raf = 0;
      if (!visible()) { canvas.dataset.dustLoop = "false"; return; }
      const dt = Math.min(60, t - last) / 1000; last = t;
      ctx.clearRect(0, 0, w, h); const fade = Math.max(0, 1 - state.progress * 1.6) * 0.85;
      for (const s of particles) { s.y -= s.s * dt; if (s.y < -0.04) { s.y = 1.04; s.x = Math.random(); }
        ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * 0.0016 + s.ph * 3)) * fade; ctx.fillStyle = s.c; ctx.beginPath();
        ctx.arc(s.x * w + Math.sin(t * 0.0004 + s.ph) * s.sway, s.y * h, s.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1; raf = requestAnimationFrame(tick); canvas.dataset.dustLoop = "true";
    };
    resize();
    const unsubscribe = motion.subscribe(next => { state = next;
      if (visible()) { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); canvas.dataset.dustLoop = "true"; } }
      else { cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, w, h); canvas.dataset.dustLoop = "false"; }
    });
    window.addEventListener("resize", resize);
    return () => { unsubscribe(); cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [motion, enabled]);
  return enabled ? <canvas ref={ref} data-hero-dust aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} /> : null;
}
