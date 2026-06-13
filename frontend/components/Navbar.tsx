import Link from "next/link";
import type { Market } from "@/lib/market";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { MarketSwitcher } from "./MarketSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CartButton } from "./CartButton";
import { AccountButton } from "./AccountButton";

// Storefront navbar shell — solid forest bar (heroMode/auto-hide come later).
// Light text, market switcher drives currency. See frontend/DESIGN.md.
export function Navbar({ market, dict, locale }: { market: Market; dict: Dictionary; locale: Locale }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--brand)",
        color: "#FDFAF5",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <nav
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Link href="/" className="disp" style={{ fontSize: 24, letterSpacing: ".14em", color: "#FDFAF5" }}>
          ARANYA <span style={{ fontStyle: "italic", color: "var(--gold-line)" }}>Ceylon</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <NavLink href="/products">{dict.nav.shop}</NavLink>
          <NavLink href="/recipes">{dict.nav.recipes}</NavLink>
          <NavLink href="/journal">{dict.nav.journal}</NavLink>
          <NavLink href="/about">{dict.nav.about}</NavLink>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LanguageSwitcher current={locale} />
          <MarketSwitcher current={market} />
          <AccountButton />
          <CartButton />
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        fontFamily: "var(--font-ui), sans-serif",
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: ".02em",
        color: "rgba(253,250,245,0.85)",
      }}
    >
      {children}
    </Link>
  );
}
