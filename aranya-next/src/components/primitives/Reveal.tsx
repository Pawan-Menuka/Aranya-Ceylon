"use client";

import * as React from "react";

// Scroll-reveal (ported from home-common.jsx): rises + fades on enter.
// Respects reduced-motion, reveals immediately if already in view, and has a
// 2.5s failsafe so content can never get stuck hidden.
export function Reveal({
  children,
  delay = 0,
  y = 26,
  as: Tag = "div",
  style = {},
  ...rest
}: {
  children?: React.ReactNode;
  delay?: number;
  y?: number;
  as?: keyof JSX.IntrinsicElements;
  style?: React.CSSProperties;
  [key: string]: unknown;
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    const t = setTimeout(() => setShown(true), 2500);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);

  return React.createElement(
    Tag as string,
    {
      ref,
      style: {
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity .7s cubic-bezier(.22,.61,.36,1) ${delay}ms, transform .7s cubic-bezier(.22,.61,.36,1) ${delay}ms`,
        willChange: "opacity, transform",
      },
      ...rest,
    },
    children
  );
}
