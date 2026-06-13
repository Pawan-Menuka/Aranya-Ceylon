"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Admin sign-out — posts to the logout proxy (clears the HttpOnly session
// cookies) and returns to the storefront. Admin runs outside the storefront's
// SessionProvider, so we hit the API route directly rather than useSession.
export function AdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          /* ignore */
        }
        router.push("/");
        router.refresh();
      }}
      disabled={busy}
      style={{
        fontFamily: "var(--font-ui), sans-serif",
        fontSize: 13,
        fontWeight: 600,
        color: "rgba(253,250,245,0.72)",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 8,
        padding: "8px 12px",
        cursor: busy ? "default" : "pointer",
        textAlign: "left",
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
