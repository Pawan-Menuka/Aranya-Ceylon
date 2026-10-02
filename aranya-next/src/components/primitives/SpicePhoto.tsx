import type { Spice } from "@/lib/types";
import { imageForName, productImage } from "@/lib/image-assets";
import Image from "next/image";
import { versionedImage } from "@/lib/media";

// Use a live product gallery when present, then generated photography for known
// slugs. The styled fallback covers products with neither source.
export function SpicePhoto({
  spice,
  ratio = "1 / 1",
  round = 0,
  label = true,
  imageIndex = 0,
  sizes = "(max-width: 720px) calc(100vw - 80px), 360px",
  priority = false,
}: {
  spice: Pick<Spice, "base" | "deep" | "surface"> & { name?: string; slug?: string; imageSrc?: string; imageSources?: string[] };
  ratio?: string;
  round?: number;
  label?: boolean;
  imageIndex?: number;
  sizes?: string;
  priority?: boolean;
}) {
  const src = spice.imageSources?.[imageIndex] ?? (imageIndex === 0 ? spice.imageSrc : undefined) ?? productImage(spice.slug, imageIndex) ?? imageForName(spice.name, imageIndex);
  if (src) {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: ratio, borderRadius: round, overflow: "hidden" }}>
        <Image src={versionedImage(src)} alt="" fill sizes={sizes} priority={priority} style={{ objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div
      className="grain"
      style={{
        position: "relative", width: "100%", aspectRatio: ratio, borderRadius: round, overflow: "hidden",
        background:
          `radial-gradient(120% 100% at 50% 120%, ${spice.deep}33 0%, transparent 55%),` +
          `radial-gradient(80% 70% at 50% 42%, ${spice.base} 0%, ${spice.base} 30%, ${spice.deep} 78%, ${spice.deep} 100%),` +
          `linear-gradient(180deg, ${spice.surface} 0%, ${spice.surface} 100%)`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(68% 56% at 50% 44%, transparent 0%, transparent 52%, ${spice.surface} 73%)` }} />
      <div style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)", width: "46%", height: "40%", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,.28), transparent 70%)", filter: "blur(4px)" }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {Array.from({ length: 26 }).map((_, i) => {
          const a = ((i * 137.5) * Math.PI) / 180, r = 8 + (i % 5) * 5.5;
          const x = 50 + Math.cos(a) * r * (0.7 + (i % 3) * 0.12);
          const y = 44 + Math.sin(a) * r * (0.55 + (i % 4) * 0.1);
          return <circle key={i} cx={x} cy={y} r={0.9 + (i % 3) * 0.5} fill={i % 2 ? spice.deep : "#000"} opacity={i % 2 ? 0.35 : 0.14} />;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 60px rgba(40,28,12,.18)" }} />
      {label && (
        <span style={{ position: "absolute", left: 10, bottom: 9, fontFamily: "var(--font-ui)", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.62)", fontWeight: 600 }}>
          Photography placeholder
        </span>
      )}
    </div>
  );
}
