import Link from "next/link";
import type { Market } from "@/lib/market";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Seal, Icon } from "./design/Primitives";
import { MarketSwitcher } from "./MarketSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CartButton } from "./CartButton";
import { AccountButton } from "./AccountButton";

// Canonical AranyaNavbar design (see frontend/DESIGN.md): forest utility strip
// + glassy-forest main bar with seal/wordmark, animated nav links, search and
// account/cart. Kept sticky + solid (the heroMode glass-over-hero + auto-hide
// behaviour rides along with the home hero, added there).
const light = "#FDFAF5";

export function Navbar({ market, dict, locale }: { market: Market; dict: Dictionary; locale: Locale }) {
  const shipTo = market === "LOCAL" ? "Sri Lanka" : "International";

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 60 }}>
      {/* Utility strip */}
      <div
        style={{
          height: 34,
          background: "rgba(11,83,67,1)",
          color: light,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          borderBottom: "1px solid rgba(253,250,245,0.18)",
        }}
      >
        <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 11.5, letterSpacing: ".05em" }}>
          Direct from the hill country farms of Sri Lanka
        </span>
        <span style={{ display: "inline-flex", gap: 14, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui), sans-serif", fontSize: 11.5 }}>
            <Icon name="globe" size={13} stroke={light} /> {shipTo}
          </span>
          <LanguageSwitcher current={locale} />
          <MarketSwitcher current={market} />
        </span>
      </div>

      {/* Main bar */}
      <div
        style={{
          background: "var(--brand)",
          borderBottom: "1px solid rgba(253,250,245,0.20)",
          boxShadow: "0 6px 22px rgba(0,0,0,.18)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 72, display: "flex", alignItems: "center", gap: 34, padding: "0 34px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <Seal size={40} tone="light" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="disp" style={{ fontSize: 26, color: light, letterSpacing: ".02em", whiteSpace: "nowrap" }}>
                Aranya Ceylon
              </span>
              <span style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 8.5, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 3, whiteSpace: "nowrap" }}>
                Forest Sourced Spices
              </span>
            </span>
          </Link>

          <nav style={{ display: "flex", gap: 25, marginLeft: 6 }}>
            <Link href="/products" className="aranya-navlink">{dict.nav.shop}</Link>
            <Link href="/recipes" className="aranya-navlink">{dict.nav.recipes}</Link>
            <Link href="/journal" className="aranya-navlink">{dict.nav.journal}</Link>
            <Link href="/about" className="aranya-navlink">{dict.nav.about}</Link>
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 15 }}>
            {/* Native GET form → /products?q= (works without JS; server component) */}
            <form
              action="/products"
              method="get"
              style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(253,250,245,.14)", border: "1px solid rgba(253,250,245,.3)", borderRadius: 999, padding: "9px 14px", width: 210 }}
            >
              <button type="submit" aria-label="Search" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <Icon name="search" size={17} stroke="rgba(253,250,245,.85)" />
              </button>
              <input
                name="q"
                placeholder="Search spices…"
                style={{ background: "transparent", border: 0, outline: 0, color: light, fontFamily: "var(--font-ui), sans-serif", fontSize: 13, width: "100%" }}
              />
            </form>
            <AccountButton />
            <CartButton />
          </div>
        </div>
      </div>
    </header>
  );
}
