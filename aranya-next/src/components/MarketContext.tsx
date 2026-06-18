"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Market } from "@/lib/types";
import { overrideMarket } from "@/lib/api/market";

// Market lives in a signed HttpOnly x-market cookie resolved server-side
// (lib/market.ts). This context carries the server-resolved value to client
// components and exposes a setter that persists via POST /market/override
// (through the BFF) then refreshes the server tree so currency + CTA colour
// re-render correctly (spec §7.2). Optimistic local state keeps the UI snappy.
interface MarketCtx {
  market: Market;
  setMarket: (m: Market) => void;
  pending: boolean;
}

const Ctx = React.createContext<MarketCtx>({ market: "intl", setMarket: () => {}, pending: false });

export function MarketProvider({
  initial,
  children,
}: {
  initial: Market;
  children: React.ReactNode;
}) {
  const [market, setMarketState] = React.useState<Market>(initial);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => setMarketState(initial), [initial]);

  const setMarket = React.useCallback(
    (m: Market) => {
      setMarketState(m); // optimistic
      setPending(true);
      overrideMarket(m)
        .catch(() => {
          // Offline / API down: keep the optimistic value for this session.
        })
        .finally(() => {
          setPending(false);
          // Re-render the server tree so currency + CTA colour re-resolve.
          router.refresh();
        });
    },
    [router]
  );

  return <Ctx.Provider value={{ market, setMarket, pending }}>{children}</Ctx.Provider>;
}

export function useMarket() {
  return React.useContext(Ctx);
}
