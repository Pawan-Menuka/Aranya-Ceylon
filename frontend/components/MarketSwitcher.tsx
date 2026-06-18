"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Market } from "@/lib/market";

// Segmented LKR/USD toggle. Posts the choice to our /api/market bridge, then
// refreshes the server-rendered tree so the catalog re-fetches in the new market.
export function MarketSwitcher({ current }: { current: Market }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (market: "local" | "international") => {
    const target: Market = market === "local" ? "LOCAL" : "INTERNATIONAL";
    if (target === current) return;
    startTransition(async () => {
      await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market }),
      });
      router.refresh();
    });
  };

  const intl = current === "INTERNATIONAL";
  return (
    <div className={`seg ${intl ? "intl" : ""}`} style={{ opacity: pending ? 0.6 : 1 }} aria-label="Choose market">
      <button className={!intl ? "on" : ""} onClick={() => choose("local")} disabled={pending}>
        🇱🇰 LKR
      </button>
      <button className={intl ? "on" : ""} onClick={() => choose("international")} disabled={pending}>
        🌍 USD
      </button>
    </div>
  );
}
