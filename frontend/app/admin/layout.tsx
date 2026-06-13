import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionRole, isAdminRole } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminSignOut } from "@/components/admin/AdminSignOut";

// Role-gated admin shell. Server-side gate: no session → sign-in; signed in but
// not an admin → back to the storefront. The backend enforces requireRole on
// every admin endpoint regardless (this gate is just UX). Sits outside the
// (storefront) group, so it has its own chrome — no shopper navbar/footer.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getSessionRole();
  if (role === null) redirect("/account/login?next=/admin");
  if (!isAdminRole(role)) redirect("/");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <aside
        style={{
          width: 240,
          flex: "0 0 240px",
          background: "var(--brand)",
          color: "#FDFAF5",
          padding: "28px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div>
          <Link href="/admin" className="disp" style={{ fontSize: 22, letterSpacing: ".12em", color: "#FDFAF5", textDecoration: "none" }}>
            ARANYA
          </Link>
          <div
            style={{
              fontFamily: "var(--font-ui), sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--gold-line)",
              marginTop: 4,
            }}
          >
            Admin
          </div>
        </div>

        <AdminSidebar />

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/"
            style={{ fontFamily: "var(--font-ui), sans-serif", fontSize: 13, color: "rgba(253,250,245,0.72)", textDecoration: "none" }}
          >
            ← View site
          </Link>
          <AdminSignOut />
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "40px 44px 80px" }}>{children}</main>
    </div>
  );
}
