"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

// Navbar cart link with a live count badge.
export function CartButton() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", color: "#FDFAF5" }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 6h15l-1.5 9h-12z" strokeLinejoin="round" />
        <path d="M6 6L5 3H2" strokeLinecap="round" />
        <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
      </svg>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: -8,
            right: -10,
            background: "var(--accent)",
            color: "#fff",
            fontFamily: "var(--font-ui), sans-serif",
            fontSize: 11,
            fontWeight: 700,
            minWidth: 18,
            height: 18,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 5px",
          }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
