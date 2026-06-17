"use client";

import * as React from "react";
import { AuthProvider, useAuth } from "../AuthContext";
import { AdminShell } from "./AdminShell";
import { AdminGate } from "./AdminGate";
import { AdminDashboard } from "./AdminDashboard";
import { AdminOrders } from "./AdminOrders";
import { AdminProducts } from "./AdminProducts";
import { AdminBlog } from "./AdminBlog";
import { AdminAudit } from "./AdminAudit";
import { ADMIN } from "@/lib/admin-data";

// Aranya Ceylon — ADMIN app: role gate + hash router (ported from Admin.html).
// Standalone full-screen shell (no storefront navbar/footer). Wrapped in its own
// AuthProvider so it can detect a real ADMIN/SUPERADMIN session; offline it falls
// back to a local demo session granted by the sign-in gate.

const VALID_ROUTES = ["dashboard", "orders", "products", "blog", "audit"];

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

  const [search, setSearch] = React.useState("");

  const onEnter = React.useCallback(async (email: string, password: string) => {
    setGateError(null);
    try {
      await signIn(email, password);
      // signIn resolves; if the backend returned a non-admin role we still let
      // the demo session through below (offline demo). A real backend would
      // return an ADMIN role here and isRealAdmin flips true on the next render.
      setDemoAdmin({ name: email.split("@")[0].replace(/\W/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || ADMIN.user.name, email });
    } catch {
      // real auth rejected (bad creds against a live backend)
      setGateError("Those credentials don't have console access.");
    }
  }, [signIn]);

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

  return (
    <AdminShell route={route} setRoute={setRoute} search={search} setSearch={setSearch} pendingCount={18} onSignOut={onSignOut} userName={name} userInitials={initials}>
      {route === "dashboard" && <AdminDashboard go={go} />}
      {route === "orders" && <AdminOrders />}
      {route === "products" && <AdminProducts />}
      {route === "blog" && <AdminBlog />}
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
