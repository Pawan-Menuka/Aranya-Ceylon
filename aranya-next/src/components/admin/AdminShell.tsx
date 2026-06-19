"use client";

import * as React from "react";
import Link from "next/link";
import { Seal } from "../primitives/Seal";
import { AIcon } from "./AdminPrimitives";
import { ADMIN } from "@/lib/admin-data";

// Aranya Ceylon — ADMIN shell (rail + topbar), ported from admin-shell.jsx.
// `onSignOut` clears the auth session; "View store" routes back to the storefront.

type NavItem = { key: string; label: string; icon: string; count?: number; hot?: boolean };

export const AD_NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "orders", label: "Orders", icon: "orders", count: 18, hot: true },
  { key: "products", label: "Products", icon: "products" },
  { key: "blog", label: "Blog", icon: "blog" },
  { key: "audit", label: "Audit log", icon: "audit" },
];

export function AdminShell({
  route, setRoute, search, setSearch, children, pendingCount = 18, onSignOut, userName, userInitials,
}: {
  route: string;
  setRoute: (r: string) => void;
  search: string;
  setSearch: (s: string) => void;
  children: React.ReactNode;
  pendingCount?: number;
  onSignOut?: () => void;
  userName?: string;
  userInitials?: string;
}) {
  const [railOpen, setRailOpen] = React.useState(false);
  const u = ADMIN.user;
  const name = userName || u.name;
  const initials = userInitials || u.initials;
  return (
    <div className="admin">
      <div className="ad-shell">
        {/* ---------- sidebar rail ---------- */}
        <aside className={"ad-rail" + (railOpen ? " open" : "")}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "20px 20px 18px", borderBottom: "1px solid var(--ad-rail-line)" }}>
            <Seal size={38} tone="light" />
            <div style={{ lineHeight: 1 }}>
              <div className="disp" style={{ fontSize: 21, color: "#FDFAF5", letterSpacing: ".01em" }}>Aranya</div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 8.5, letterSpacing: ".26em", color: "#E6B860", fontWeight: 700, textTransform: "uppercase", marginTop: 3 }}>Admin Console</div>
            </div>
          </div>
          <div className="ad-navsec">Operations</div>
          <nav className="ad-nav">
            {AD_NAV.map((n) => (
              <button key={n.key} className={"ad-navitem" + (route === n.key ? " on" : "")} onClick={() => { setRoute(n.key); setRailOpen(false); }}>
                <AIcon name={n.icon} size={18} stroke={route === n.key ? "#fff" : "rgba(253,250,245,.7)"} w={1.8} />
                {n.label}
                {"count" in n && n.count != null && <span className={"cnt" + ("hot" in n && n.hot ? " hot" : "")}>{n.key === "orders" ? pendingCount : n.count}</span>}
              </button>
            ))}
          </nav>
          <div className="ad-navsec">Account</div>
          <nav className="ad-nav">
            <button className="ad-navitem"><AIcon name="cog" size={18} stroke="rgba(253,250,245,.7)" w={1.7} />Settings</button>
            <button className="ad-navitem" onClick={onSignOut}><AIcon name="logout" size={18} stroke="rgba(253,250,245,.7)" w={1.8} />Sign out</button>
          </nav>
          <div style={{ marginTop: "auto", padding: 14, borderTop: "1px solid var(--ad-rail-line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 8px", borderRadius: 10, background: "rgba(253,250,245,.06)" }}>
              <span className="av" style={{ width: 34, height: 34, background: "#E6B860", color: "#1A1A1A", fontSize: 12 }}>{initials}</span>
              <div style={{ lineHeight: 1.3, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FDFAF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                <div style={{ fontSize: 10.5, color: "rgba(253,250,245,.6)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 9, background: "#1D9E75" }} />{u.access} · {u.role}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ---------- main ---------- */}
        <div className="ad-main">
          <header className="ad-top">
            <button className="ad-iconbtn ad-burger" onClick={() => setRailOpen((o) => !o)}><AIcon name="menu" size={18} /></button>
            <div className="ad-search">
              <AIcon name="search" size={16} stroke="var(--ad-faint)" />
              <input placeholder="Search orders, products, customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ad-faint)", border: "1px solid var(--ad-line)", borderRadius: 5, padding: "1px 6px" }}>⌘K</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              <Link href="/" className="ad-btn ad-btn-ghost ad-btn-sm" style={{ textDecoration: "none" }}>
                <AIcon name="external" size={15} stroke="var(--ad-muted)" />View store
              </Link>
              <button className="ad-iconbtn"><AIcon name="bell" size={18} stroke="var(--ad-muted)" /><span className="ad-dot">4</span></button>
              <button className="ad-iconbtn"><AIcon name="cog" size={18} stroke="var(--ad-muted)" /></button>
            </div>
          </header>
          <main className="ad-body">{children}</main>
        </div>
      </div>
    </div>
  );
}
