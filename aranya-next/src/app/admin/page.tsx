import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "Admin Console · Aranya Ceylon",
  description: "Back-office for Aranya Ceylon — orders, inventory, journal and audit trail.",
  robots: { index: false, follow: false },
};

// Admin console (spec §9, Phase 7). Standalone full-screen app, role-gated to
// ADMIN / SUPERADMIN. Renders its own AuthProvider + shell — no storefront chrome.
export default function AdminPage() {
  return <AdminApp />;
}
