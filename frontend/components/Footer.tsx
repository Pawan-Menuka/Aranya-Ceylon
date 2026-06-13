import Link from "next/link";
import type { Market } from "@/lib/market";
import { Seal, Liyawel } from "./design/Primitives";
import { MarketSwitcher } from "./MarketSwitcher";

// Forest mega-footer ported from home-footer.jsx. Links point at real routes
// where they exist; not-yet-built pages (legal/support) use "#" placeholders.
type FootLink = [label: string, href: string];

const SHOP: FootLink[] = [
  ["All Spices", "/products"],
  ["Whole Spices", "/products"],
  ["Ground & Powders", "/products"],
  ["Bestsellers", "/products"],
];
const COMPANY: FootLink[] = [
  ["Our Story", "/about"],
  ["Sourcing", "/about"],
  ["Recipes", "/recipes"],
  ["Journal", "/journal"],
];
const SUPPORT: FootLink[] = [
  ["Track Order", "/account/orders"],
  ["Contact", "#"],
  ["Shipping & Returns", "#"],
  ["FAQ", "#"],
];

const TRUST = [
  ["GI Certified", "Protected origin"],
  ["Organic", "EU & USDA"],
  ["Secure Checkout", "256-bit SSL"],
  ["Worldwide Shipping", "Tracked & insured"],
];

export function Footer({ market }: { market: Market }) {
  return (
    <footer style={{ background: "var(--brand)", color: "#FDFAF5", marginTop: 80 }}>
      <div style={{ borderBottom: "1px solid rgba(253,250,245,.14)" }}>
        <Liyawel width={240} color="rgba(230,184,96,.5)" style={{ padding: "30px 0" }} />
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "64px 40px 40px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 48,
        }}
      >
        <div style={{ maxWidth: 320, gridColumn: "1 / -1", flexBasis: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
            <Seal size={42} tone="light" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="disp" style={{ fontSize: 26, color: "#FDFAF5", letterSpacing: ".02em" }}>Aranya Ceylon</span>
              <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 8.5, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>
                Forest Sourced Spices
              </span>
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, color: "rgba(253,250,245,.78)", lineHeight: 1.65, margin: "0 0 22px" }}>
            Single-origin spice, lifted from the hill forests of Sri Lanka and shipped at peak aroma. Spice, as the forest intended.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {["instagram", "facebook", "pinterest"].map((s) => (
              <span key={s} aria-label={s} style={{ width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(253,250,245,.28)", display: "grid", placeItems: "center" }}>
                <span style={{ width: 7, height: 7, borderRadius: 9, background: "#E6B860" }} />
              </span>
            ))}
          </div>
        </div>

        <FootCol title="Shop" links={SHOP} />
        <FootCol title="Company" links={COMPANY} />
        <FootCol title="Support" links={SUPPORT} />
      </div>

      {/* Trust strip */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", padding: "26px 0", borderTop: "1px solid rgba(253,250,245,.14)", borderBottom: "1px solid rgba(253,250,245,.14)" }}>
          {TRUST.map(([title, sub]) => (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 11, flex: "1 1 200px" }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(230,184,96,.45)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <span style={{ width: 6, height: 6, borderRadius: 9, background: "#E6B860" }} />
              </span>
              <span style={{ lineHeight: 1.2 }}>
                <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13.5, fontWeight: 700, color: "#FDFAF5", display: "block" }}>{title}</span>
                <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 11.5, color: "rgba(253,250,245,.6)" }}>{sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "22px 40px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, color: "rgba(253,250,245,.6)" }}>
          © {new Date().getFullYear()} Aranya Ceylon. All rights reserved.
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <MarketSwitcher current={market} />
          {["Privacy", "Terms", "Cookies"].map((l) => (
            <Link key={l} href="#" style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 12.5, color: "rgba(253,250,245,.6)" }}>{l}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, links }: { title: string; links: FootLink[] }) {
  return (
    <div>
      <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 18 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map(([label, href]) => (
          <Link key={label} href={href} style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, color: "rgba(253,250,245,.82)" }}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
