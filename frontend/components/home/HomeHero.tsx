import { Seal } from "../design/Primitives";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Hero — dark editorial canvas with the ARANYA/CEYLON brand overlay (a static
// rendition of the prototype's pinned frame-sequence; the 192-frame scroll
// canvas can drop in once the frame assets are supplied to R2).
export function HomeHero({ dict }: { dict: Dictionary }) {
  return (
    <section style={{ position: "relative", minHeight: "90vh", background: "#1A1A1A", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* forest glow + vignette */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, rgba(15,110,86,.28), transparent 60%)" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 200px rgba(0,0,0,.6)" }} />

      {/* brand overlay */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: 24 }}>
        <Seal size={62} tone="light" />
        <div style={{ width: 44, height: 1.5, background: "var(--accent)", margin: "26px 0 22px" }} />
        <div className="disp" style={{ fontSize: "clamp(48px,7vw,92px)", fontWeight: 600, color: "#FDFAF5", letterSpacing: ".14em", lineHeight: 1, textIndent: ".14em" }}>
          ARANYA
        </div>
        <div className="disp" style={{ fontStyle: "italic", fontSize: "clamp(16px,2.2vw,24px)", color: "var(--accent)", letterSpacing: ".34em", marginTop: 16, textIndent: ".34em" }}>
          CEYLON
        </div>
        <div style={{ width: 44, height: 1.5, background: "var(--accent)", margin: "22px 0 0" }} />
        <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13, letterSpacing: ".04em", color: "rgba(253,250,245,.7)", marginTop: 22 }}>
          {dict.home.tagline}
        </p>
      </div>

      {/* bottom cream hand-off */}
      <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 160, background: "linear-gradient(180deg, transparent, var(--bg))", pointerEvents: "none" }} />

      {/* scroll cue */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 10, letterSpacing: ".24em", textTransform: "uppercase", color: "rgba(253,250,245,.55)", fontWeight: 500 }}>
          Scroll to enter
        </span>
        <div style={{ width: 23, height: 35, borderRadius: 12, border: "1.5px solid rgba(253,250,245,.45)", position: "relative" }}>
          <span style={{ position: "absolute", left: "50%", top: 7, width: 3.5, height: 3.5, borderRadius: 9, background: "rgba(253,250,245,.85)", transform: "translateX(-50%)" }} />
        </div>
      </div>
    </section>
  );
}
