"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Seal } from "./primitives/Seal";
import { Icon } from "./primitives/Icon";
import { useMarket } from "./MarketContext";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";

// Canonical navbar (ported from navbar.jsx). Option B glass + auto-hide.
//  - heroMode: glassy forest overlay over a dark hero; auto-hides while
//    scrolling down through the hero, returns SOLID on scroll-up / past hero.
//  - non-hero pages: solid forest bar, sticky, hide-on-scroll-down / show-on-up.
const NAV_LINKS: { label: string; href: string; match: string[]; chevron?: boolean }[] = [
  { label: "Shop", href: "/products", match: ["/products"], chevron: true },
  { label: "Categories", href: "/categories", match: ["/categories"] },
  { label: "Blog", href: "/journal", match: ["/journal"] },
  { label: "About", href: "/about", match: ["/about"] },
];

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function Navbar({
  heroMode = false,
  heroSelector = "[data-hero]",
  onCartClick,
}: {
  heroMode?: boolean;
  heroSelector?: string;
  onCartClick?: () => void;
}) {
  const { market } = useMarket();
  const cart = useCart();
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [p, setP] = React.useState(0);
  const [dir, setDir] = React.useState<"up" | "down">("up");
  const [y, setY] = React.useState(0);
  const last = React.useRef(0);

  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const cur = window.scrollY;
        setY(cur);
        if (Math.abs(cur - last.current) > 2) setDir(cur > last.current ? "down" : "up");
        if (heroMode) {
          const hero = document.querySelector(heroSelector) as HTMLElement | null;
          const span = hero ? hero.offsetHeight - window.innerHeight : window.innerHeight * 2;
          setP(Math.min(1, Math.max(0, cur / Math.max(1, span))));
        }
        last.current = cur;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [heroMode, heroSelector]);

  const atTop = y < 8;
  const pastHero = heroMode ? p > 0.992 : true;
  let solid: number, hidden: boolean;
  if (heroMode) {
    solid = pastHero ? 1 : 0;
    hidden = !atTop && !pastHero && dir !== "up";
  } else {
    solid = 1;
    hidden = dir === "down" && y > 120;
  }

  const market_ = market === "local" ? { ship: "Sri Lanka", cur: "LKR" } : { ship: "International", cur: "USD" };

  const glassBg = "rgba(15,110,86,.30)";
  const barBg = solid ? `rgba(15,110,86,${0.3 + solid * 0.7})` : glassBg;
  const stripBg = `rgba(11,83,67,${0.55 + solid * 0.45})`;
  const border = `rgba(253,250,245,${0.14 + solid * 0.06})`;
  const shadow = solid > 0.5 ? "0 6px 22px rgba(0,0,0,.18)" : "none";
  const light = "#FDFAF5";
  const linkCol = "rgba(253,250,245,.92)";

  return (
    <div
      className="aranya"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 60,
        transform: `translateY(${hidden ? -112 : 0}%)`,
        transition: "transform .5s cubic-bezier(.4,0,.2,1)", willChange: "transform",
      }}
    >
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: 0, height: 168, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(10,8,6,.55) 0%, rgba(10,8,6,.28) 45%, transparent 100%)",
          opacity: 1 - solid, transition: "opacity .35s",
        }}
      />
      {/* utility strip */}
      <div
        style={{
          height: 34, background: stripBg, backdropFilter: "blur(8px)", color: light,
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px",
          borderBottom: `1px solid ${border}`, transition: "background .35s",
        }}
      >
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, letterSpacing: ".05em" }}>Direct from the hill country farms of Sri Lanka</span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, display: "inline-flex", gap: 16, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="globe" size={13} stroke={light} /> {market_.ship}</span>
          <span style={{ fontWeight: 700, letterSpacing: ".06em", display: "inline-flex", alignItems: "center", gap: 3 }}>{market_.cur} <Icon name="chevron" size={12} stroke={light} /></span>
        </span>
      </div>
      {/* main bar */}
      <div style={{ background: barBg, backdropFilter: "blur(10px)", borderBottom: `1px solid ${border}`, boxShadow: shadow, transition: "background .35s, box-shadow .35s" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 72, display: "flex", alignItems: "center", gap: 34, padding: "0 34px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <Seal size={40} tone="light" />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span className="disp" style={{ fontSize: 26, color: light, letterSpacing: ".02em", whiteSpace: "nowrap" }}>Aranya Ceylon</span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: ".34em", color: "#E6B860", fontWeight: 600, textTransform: "uppercase", marginTop: 3, whiteSpace: "nowrap" }}>Forest Sourced Spices</span>
            </span>
          </Link>
          <nav style={{ display: "flex", gap: 25, marginLeft: 6 }}>
            {NAV_LINKS.map((l) => {
              const active = l.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
              return (
                <NavItem key={l.label} href={l.href} active={active} hot="#fff" linkCol={linkCol} chevron={l.chevron}>
                  {l.label}
                </NavItem>
              );
            })}
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 15 }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
                router.push("/search" + (q ? "?q=" + encodeURIComponent(q) : ""));
              }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(253,250,245,.14)", border: "1px solid rgba(253,250,245,.3)", borderRadius: 999, padding: "9px 14px", width: 210 }}
            >
              <button type="submit" aria-label="Search" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <Icon name="search" size={17} stroke="rgba(253,250,245,.85)" />
              </button>
              <input name="q" placeholder="Search spices…" style={{ background: "transparent", border: 0, outline: 0, color: light, fontFamily: "var(--font-ui)", fontSize: 13, width: "100%" }} />
            </form>
            <button aria-label="Account" onClick={() => (user ? router.push("/account") : cart.openSignIn())} style={{ display: "grid", placeItems: "center", padding: 3, background: "none", border: 0, cursor: "pointer" }}><Icon name="user" size={19} stroke={light} /></button>
            <button aria-label="Cart" onClick={onCartClick || cart.openCart} style={{ position: "relative", background: "none", border: 0, cursor: "pointer", padding: 3 }}>
              <Icon name="bag" size={20} stroke={light} />
              {cart.count > 0 && (
                <span style={{ position: "absolute", top: -4, right: -5, minWidth: 16, height: 16, padding: "0 4px", background: "var(--accent)", color: "#fff", borderRadius: 999, fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1 }}>{cart.count}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  children,
  href = "#",
  active,
  hot,
  linkCol,
  chevron,
}: {
  children: React.ReactNode;
  href?: string;
  active?: boolean;
  hot: string;
  linkCol: string;
  chevron?: boolean;
}) {
  const [h, setH] = React.useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, letterSpacing: ".02em",
        color: active || h ? hot : linkCol, position: "relative", padding: "6px 0",
        display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", transition: "color .15s",
      }}
    >
      {children}
      {chevron && <Icon name="chevron" size={13} stroke={active || h ? hot : linkCol} />}
      <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 1.5, background: "var(--accent)", transform: `scaleX(${active || h ? 1 : 0})`, transformOrigin: "left", transition: "transform .22s ease" }} />
    </Link>
  );
}
