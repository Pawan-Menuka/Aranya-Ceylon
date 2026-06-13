import Link from "next/link";
import type { Market } from "@/lib/market";
import { MarketSwitcher } from "./MarketSwitcher";
import { CartButton } from "./CartButton";
import { AccountButton } from "./AccountButton";

// Storefront navbar shell — solid forest bar (heroMode/auto-hide come later).
// Light text, market switcher drives currency. See frontend-legacy/CLAUDE.md.
export function Navbar({ market }: { market: Market }) {
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
          <NavLink href="/products">Shop</NavLink>
          <NavLink href="/journal">Journal</NavLink>
          <NavLink href="/about">About</NavLink>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
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
