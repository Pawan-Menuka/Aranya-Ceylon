"use client";

import { useState } from "react";

// Gallery: main image + thumbnail rail (ported from product-detail.jsx). Real
// product images when present; otherwise spice-tinted placeholder "shots" so an
// empty gallery still reads on-brand.
export function ProductGallery({ color, name, badge, images }: { color: string; name: string; badge: string | null; images: { url: string; alt: string }[] }) {
  const hasPhotos = images.length > 0;
  const labels = ["Whole", "Detail", "Milled", "In the jar"];
  // tint pairs for placeholder "shots"
  const tints: [string, string][] = [
    [`${color}`, `${color}55`],
    [`${color}cc`, `${color}33`],
    [`${color}aa`, "var(--surface)"],
    [`${color}66`, `${color}22`],
  ];
  const slides = hasPhotos ? images.map((im) => im.url) : tints.map(() => null);
  const [i, setI] = useState(0);

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 78, flex: "0 0 auto" }}>
        {slides.map((src, k) => (
          <button
            key={k}
            onClick={() => setI(k)}
            aria-label={labels[k] ?? `View ${k + 1}`}
            style={{ padding: 0, border: k === i ? "2px solid var(--brand)" : "1px solid var(--line)", borderRadius: 5, overflow: "hidden", cursor: "pointer", background: "none", boxShadow: k === i ? "var(--shadow-sm)" : "none" }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />
            ) : (
              <Tint pair={tints[k]!} />
            )}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", flex: 1, borderRadius: 8, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
        {slides[i] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slides[i]!} alt={images[i]?.alt ?? name} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />
        ) : (
          <Tint pair={tints[i]!} big />
        )}
        {badge && (
          <span className="eyebrow" style={{ position: "absolute", top: 16, left: 16, background: "var(--brand)", color: "#fff", borderRadius: 999, padding: "5px 11px" }}>{badge}</span>
        )}
        <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: color }} />
        <div style={{ position: "absolute", bottom: 14, right: 16, fontFamily: "var(--font-ui), sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>
          {labels[i]}
        </div>
      </div>
    </div>
  );
}

function Tint({ pair, big = false }: { pair: [string, string]; big?: boolean }) {
  return (
    <div
      className="grain"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        background: `radial-gradient(70% 60% at 50% 44%, ${pair[0]} 0%, ${pair[0]} 22%, ${pair[1]} 70%, var(--surface) 100%)`,
      }}
    >
      {big && <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 60px rgba(40,28,12,.18)" }} />}
    </div>
  );
}
