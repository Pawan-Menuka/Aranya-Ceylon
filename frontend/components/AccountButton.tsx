"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "./SessionProvider";
import { useT } from "./I18nProvider";

// Navbar account control: "Sign in" when logged out, or a small menu with the
// user's name + account link + logout when signed in.
export function AccountButton() {
  const { user, loading, logout } = useSession();
  const t = useT().account;
  const [open, setOpen] = useState(false);

  if (loading) return <span style={{ width: 22, height: 22 }} aria-hidden />;

  if (!user) {
    return (
      <Link
        href="/account/login"
        style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 14, fontWeight: 500, color: "rgba(253,250,245,0.9)" }}
      >
        {t.signIn}
      </Link>
    );
  }

  const firstName = user.name.split(" ")[0] ?? "Account";

  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7, background: "transparent", border: 0,
          color: "#FDFAF5", cursor: "pointer", fontFamily: "var(--font-ui), sans-serif", fontSize: 14, fontWeight: 500,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
        </svg>
        {firstName}
      </button>
      {open && (
        <div
          style={{
            position: "absolute", right: 0, top: "calc(100% + 10px)", minWidth: 170, background: "#fff",
            color: "var(--ink)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", overflow: "hidden", zIndex: 60,
          }}
        >
          <Link href="/account" onClick={() => setOpen(false)} style={menuItem}>{t.myAccount}</Link>
          <Link href="/account/orders" onClick={() => setOpen(false)} style={menuItem}>{t.orders}</Link>
          <button onClick={() => { setOpen(false); void logout(); }} style={{ ...menuItem, width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer", borderTop: "1px solid var(--line)" }}>
            {t.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

const menuItem: React.CSSProperties = {
  display: "block",
  padding: "11px 16px",
  fontFamily: "var(--font-ui), sans-serif",
  fontSize: 14,
  color: "var(--ink)",
};
