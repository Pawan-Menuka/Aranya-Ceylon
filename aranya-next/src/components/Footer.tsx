"use client";

import * as React from "react";
import Link from "next/link";
import { Seal } from "./primitives/Seal";
import { Liyawel } from "./primitives/Motif";
import { useMarket } from "./MarketContext";

// Forest-green mega footer (ported from home-footer.jsx). Links retargeted to
// Next routes per spec §5.
function FootCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="eyebrow" style={{ color: "#E6B860", marginBottom: 18 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map(([label, href]) => (
          <Link
            key={label}
            href={href || "#"}
            style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "rgba(253,250,245,.82)", transition: "color .15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(253,250,245,.82)")}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  const { market, setMarket } = useMarket();
  return (
    <footer style={{ background: "var(--brand)", color: "#FDFAF5" }}>
      <div style={{ borderBottom: "1px solid rgba(253,250,245,.14)" }}>
        <Liyawel width={240} color="rgba(230,184,96,.5)" style={{ padding: "30px 0" }} />
      </div>
      <div className="foot-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 40px 40px", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 48 }}>
        <div style={{ maxWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
            <Seal size={42} tone="light" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="disp" style={{ fontSize: 26, color: "#FDFAF5", letterSpacing: ".02em" }}>Aranya Ceylon</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>Forest Sourced Spices</span>
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "rgba(253,250,245,.78)", lineHeight: 1.65, margin: "0 0 22px" }}>
            Single-origin spice, lifted from the hill forests of Sri Lanka and shipped at peak aroma. Spice, as the forest intended.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {["instagram", "facebook", "pinterest"].map((s) => (
              <a key={s} href="#" aria-label={s} style={{ width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(253,250,245,.28)", display: "grid", placeItems: "center" }}>
                <span style={{ width: 7, height: 7, borderRadius: 9, background: "#E6B860" }} />
              </a>
            ))}
          </div>
        </div>
        <FootCol title="Shop" links={[["All Spices", "/products"], ["Whole Spices", "/products"], ["Ground & Powders", "/products"], ["Gift Sets", "/gifts"], ["Bestsellers", "/products"]]} />
        <FootCol title="Company" links={[["Our Story", "/about"], ["Sourcing", "/about"], ["Recipes", "/recipes"], ["Journal", "/journal"], ["Stockists", "/about"]]} />
        <FootCol title="Support" links={[["Contact", "/contact"], ["Shipping & Returns", "/shipping"], ["Track Order", "/account"], ["FAQ", "/faq"], ["Wholesale", "/wholesale"]]} />
      </div>
      {/* trust strip */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", padding: "26px 0", borderTop: "1px solid rgba(253,250,245,.14)", borderBottom: "1px solid rgba(253,250,245,.14)" }}>
          {[["GI Certified", "Protected origin"], ["Organic", "EU & USDA"], ["Secure Checkout", "256-bit SSL"], ["Worldwide Shipping", "Tracked & insured"]].map((t) => (
            <div key={t[0]} style={{ display: "flex", alignItems: "center", gap: 11, flex: "1 1 200px" }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(230,184,96,.45)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <span style={{ width: 6, height: 6, borderRadius: 9, background: "#E6B860" }} />
              </span>
              <span style={{ lineHeight: 1.2 }}>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 700, color: "#FDFAF5", display: "block" }}>{t[0]}</span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "rgba(253,250,245,.6)" }}>{t[1]}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* bottom bar */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "22px 40px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.6)" }}>© 2026 Aranya Ceylon. All rights reserved.</span>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", background: "rgba(253,250,245,.1)", borderRadius: 999, padding: 3 }}>
            <button onClick={() => setMarket("intl")} style={{ border: 0, cursor: "pointer", borderRadius: 999, padding: "6px 13px", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, background: market === "intl" ? "#E6B860" : "transparent", color: market === "intl" ? "#1A1A1A" : "rgba(253,250,245,.8)" }}>USD</button>
            <button onClick={() => setMarket("local")} style={{ border: 0, cursor: "pointer", borderRadius: 999, padding: "6px 13px", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700, background: market === "local" ? "#E6B860" : "transparent", color: market === "local" ? "#1A1A1A" : "rgba(253,250,245,.8)" }}>LKR</button>
          </div>
          {([["Privacy", "/privacy"], ["Terms", "/terms"], ["Cookies", "/cookies"]] as [string, string][]).map(([l, href]) => (
            <Link key={l} href={href} style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "rgba(253,250,245,.6)", transition: "color .15s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")} onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(253,250,245,.6)")}>
              {l}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
