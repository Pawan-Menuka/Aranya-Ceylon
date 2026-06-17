import type { Spice } from "@/lib/types";

// ---- Styled spice-photo placeholder (ported from shared.jsx) ----
// Used until real product photography is supplied (spec §3 "Photography").
export function SpicePhoto({
  spice,
  ratio = "1 / 1",
  round = 0,
  label = true,
}: {
  spice: Pick<Spice, "base" | "deep" | "surface">;
  ratio?: string;
  round?: number;
  label?: boolean;
}) {
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
