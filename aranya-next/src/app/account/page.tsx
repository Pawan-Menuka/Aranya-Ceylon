import type { Metadata } from "next";
import { resolveMarket } from "@/lib/market";
import { SiteChrome } from "@/components/SiteChrome";
import { AccountClient } from "@/components/account/AccountClient";

export const metadata: Metadata = {
  title: "My account",
  description: "Track orders, manage addresses, reorder your pantry and keep your Harvest Club points growing.",
  robots: { index: false },
};

// Account is gated client-side (auth session lives in memory + HttpOnly refresh
// cookie). The page renders the gate or the dashboard depending on session.
export default function AccountPage() {
  const market = resolveMarket();
  return (
    <SiteChrome initialMarket={market}>
      <AccountClient />
    </SiteChrome>
  );
}
