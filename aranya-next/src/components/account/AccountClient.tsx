"use client";

import * as React from "react";
import { useAuth } from "../AuthContext";
import { SignedOutGate } from "./SignedOutGate";
import { AccountDashboard } from "./AccountDashboard";

// Switches between the gate and the dashboard based on the auth session. While
// the silent-refresh probe runs on mount we hold a quiet placeholder so the
// signed-in dashboard doesn't flash the gate on reload.
export function AccountClient() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ paddingTop: 96, background: "var(--bg)", minHeight: "100vh" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "120px 40px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>Loading your account…</div>
        </div>
      </div>
    );
  }

  return user ? <AccountDashboard /> : <SignedOutGate />;
}
