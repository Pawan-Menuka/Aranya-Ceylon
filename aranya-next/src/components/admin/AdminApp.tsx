"use client";

import * as React from "react";
import { AuthProvider, useAuth } from "../AuthContext";
import { AdminShell } from "./AdminShell";
import { AdminGate } from "./AdminGate";
import { AdminDashboard } from "./AdminDashboard";
import { AdminOrders } from "./AdminOrders";
import { AdminProducts } from "./AdminProducts";
import { AdminBlog } from "./AdminBlog";
import { AdminRecipes } from "./AdminRecipes";
import { AdminGifts } from "./AdminGifts";
import { AdminAudit } from "./AdminAudit";
import { ADMIN } from "@/lib/admin-data";
import { DEMO_MODE } from "@/lib/demo";
import { getDashboard, type DashboardData } from "@/lib/api/admin";

// Aranya Ceylon — ADMIN app: role gate + hash router (ported from Admin.html).
// Standalone full-screen shell (no storefront navbar/footer). Wrapped in its own
// AuthProvider so it can detect a real ADMIN/SUPERADMIN session; offline it falls
// back to a local demo session granted by the sign-in gate.

const VALID_ROUTES = ["dashboard", "orders", "products", "blog", "recipes", "gifts", "audit"];

function BootSplash() {
  return (
    <div className="admin">
      <div className="ad-boot">
        <div style={{ textAlign: "center", fontFamily: "var(--font-display)", color: "var(--brand)", fontSize: 22, fontWeight: 600, letterSpacing: ".02em" }}>
          Aranya Ceylon · Admin
        </div>
      </div>
    </div>
  );
}

function AdminConsole() {
  const { user, loading, signIn, signOut, demo } = useAuth();

  // local demo-admin session — set by the gate when there is no real admin
  // (offline / the storefront demo signs in as CUSTOMER, not ADMIN).
  const [demoAdmin, setDemoAdmin] = React.useState<{ name: string; email: string } | null>(null);
  const [gateError, setGateError] = React.useState<string | null>(null);

  const isRealAdmin = !!user && (user.role === "ADMIN" || user.role === "SUPERADMIN");
  const authed = isRealAdmin || !!demoAdmin;

  // Real orders-awaiting-fulfilment count for the nav badge (was hardcoded to 18
  // — BUG-20). Stays 0 (badge hidden) offline / in demo, rather than fabricated.
  const [dashboard, setDashboard] = React.useState<DashboardData | null>(null);
  React.useEffect(() => {
    if (!isRealAdmin) {
      setDashboard(null);
      return;
    }
    let alive = true;
    getDashboard()
      .then((d) => { if (alive) setDashboard(d); })
      .catch(() => { if (alive) setDashboard(null); });
    return () => { alive = false; };
  }, [isRealAdmin]);

  // hash router (only relevant once authed)
  const [route, setRoute] = React.useState("dashboard");
  React.useEffect(() => {
    const initial = (typeof window !== "undefined" && (window.location.hash.replace("#", "") || localStorage.getItem("ad_route"))) || "dashboard";
    if (VALID_ROUTES.includes(initial)) setRoute(initial);
  }, []);
  React.useEffect(() => {
    if (!authed) return;
    localStorage.setItem("ad_route", route);
    if (window.location.hash.replace("#", "") !== route) window.history.replaceState(null, "", "#" + route);
    window.scrollTo(0, 0);
  }, [route, authed]);
  React.useEffect(() => {
    const onHash = () => { const r = window.location.hash.replace("#", ""); if (r && VALID_ROUTES.includes(r)) setRoute(r); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const onEnter = React.useCallback(async (email: string, password: string) => {
    setGateError(null);
    try {
      const { user: signedInUser, demo: isDemo } = await signIn(email, password);
      if (isDemo) {
        // Backend unreachable. Only grant a local demo admin session when demo
        // mode is explicitly enabled — otherwise anyone could enter the console
        // with any password when the API is down (SEC-08).
        if (DEMO_MODE) {
          setDemoAdmin({ name: email.split("@")[0].replace(/\W/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || ADMIN.user.name, email });
        } else {
          setGateError("The admin service is unavailable right now. Please try again shortly.");
        }
      } else if (signedInUser.role !== "ADMIN" && signedInUser.role !== "SUPERADMIN") {
        // Authenticated but not an admin — deny access and sign back out
        await signOut();
        setGateError("Your account doesn't have console access. Contact a SUPERADMIN.");
      }
      // If real ADMIN/SUPERADMIN: isRealAdmin will be true on the next render → authed
    } catch {
      // Bad credentials
      setGateError("Invalid email or password.");
    }
  }, [signIn, signOut]);

  const onSignOut = React.useCallback(async () => {
    setDemoAdmin(null);
    try { await signOut(); } catch { /* ignore */ }
    window.location.hash = "";
  }, [signOut]);

  if (loading) return <BootSplash />;
  if (!authed) return <AdminGate onEnter={onEnter} error={gateError} />;

  const go = (r: string) => setRoute(r);
  const name = isRealAdmin ? user!.name : demoAdmin?.name;
  const initials = name ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : undefined;
  const role: "ADMIN" | "SUPERADMIN" | "DEMO" = user?.role === "SUPERADMIN"
    ? "SUPERADMIN"
    : isRealAdmin ? "ADMIN" : "DEMO";
  const pendingCount = dashboard?.orders?.pendingFulfilment ?? 0;

  return (
    <AdminShell route={route} setRoute={setRoute} pendingCount={pendingCount} onSignOut={onSignOut} userName={name} userInitials={initials} userRole={role}>
      {route === "dashboard" && <AdminDashboard go={go} live={dashboard} />}
      {route === "orders" && <AdminOrders />}
      {route === "products" && <AdminProducts />}
      {route === "blog" && <AdminBlog />}
      {route === "recipes" && <AdminRecipes />}
      {route === "gifts" && <AdminGifts />}
      {route === "audit" && <AdminAudit />}
    </AdminShell>
  );
}

export function AdminApp() {
  return (
    <AuthProvider>
      <AdminConsole />
    </AuthProvider>
  );
}
