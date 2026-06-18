"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/blog", label: "Journal" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontFamily: "var(--font-ui), sans-serif",
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              color: active ? "#FDFAF5" : "rgba(253,250,245,0.72)",
              background: active ? "rgba(255,255,255,0.10)" : "transparent",
              padding: "10px 14px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
