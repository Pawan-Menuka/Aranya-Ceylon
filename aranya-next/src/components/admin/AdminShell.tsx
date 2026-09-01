"use client";

import * as React from "react";
import Link from "next/link";
import { Seal } from "../primitives/Seal";
import { AIcon } from "./AdminPrimitives";

// Aranya Ceylon — ADMIN shell (rail + topbar), ported from admin-shell.jsx.
// `onSignOut` clears the auth session; "View store" routes back to the storefront.

type NavItem = { key: string; label: string; icon: string; count?: number; hot?: boolean };

export const AD_NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "orders", label: "Orders", icon: "orders", count: 18, hot: true },
  { key: "products", label: "Products", icon: "products" },
  { key: "blog", label: "Blog", icon: "blog" },
  { key: "recipes", label: "Recipes", icon: "sparkle" },
  { key: "gifts", label: "Gift Sets", icon: "box" },
  { key: "audit", label: "Audit log", icon: "audit" },
];

export function AdminShell({
  route, setRoute, children, pendingCount = 0, onSignOut, userName, userInitials, userRole,
}: {
  route: string;
  setRoute: (r: string) => void;
  children: React.ReactNode;
  pendingCount?: number;
  onSignOut?: () => void;
  userName?: string;
  userInitials?: string;
  userRole: "ADMIN" | "SUPERADMIN" | "DEMO";
}) {
  const [railOpen, setRailOpen] = React.useState(false);
  const name = userName || "Admin";
  const initials = userInitials || "AC";
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
                {n.key === "orders"
                  ? pendingCount > 0 && <span className="cnt hot">{pendingCount}</span>
                  : "count" in n && n.count != null && <span className={"cnt" + ("hot" in n && n.hot ? " hot" : "")}>{n.count}</span>}
              </button>
            ))}
          </nav>
          <div className="ad-navsec">Account</div>
          <nav className="ad-nav">
            <button className="ad-navitem" onClick={onSignOut}><AIcon name="logout" size={18} stroke="rgba(253,250,245,.7)" w={1.8} />Sign out</button>
          </nav>
          <div style={{ marginTop: "auto", padding: 14, borderTop: "1px solid var(--ad-rail-line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 8px", borderRadius: 10, background: "rgba(253,250,245,.06)" }}>
              <span className="av" style={{ width: 34, height: 34, background: "#E6B860", color: "#1A1A1A", fontSize: 12 }}>{initials}</span>
              <div style={{ lineHeight: 1.3, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FDFAF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                <div style={{ fontSize: 10.5, color: "rgba(253,250,245,.6)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 9, background: "#1D9E75" }} />{userRole} · {userRole === "DEMO" ? "Preview session" : "Console access"}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ---------- main ---------- */}
        <div className="ad-main">
          <header className="ad-top">
            <button className="ad-iconbtn ad-burger" onClick={() => setRailOpen((o) => !o)}><AIcon name="menu" size={18} /></button>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              <Link href="/" className="ad-btn ad-btn-ghost ad-btn-sm" style={{ textDecoration: "none" }}>
                <AIcon name="external" size={15} stroke="var(--ad-muted)" />View store
              </Link>
            </div>
          </header>
          <main className="ad-body">{children}</main>
        </div>
      </div>
    </div>
  );
}
