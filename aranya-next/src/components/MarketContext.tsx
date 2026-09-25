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
      setPending(true);
      overrideMarket(m)
        // Flip the visible market only once the cookie is confirmed set —
        // flipping immediately left a brief window where price components
        // rendered the NEW market's label against data still fetched under
        // the OLD market cookie (remaining-surfaces audit #20).
        .then(() => setMarketState(m))
        .catch(() => {
          // Offline / API down: flip anyway so the switcher doesn't get
          // stuck — there's no server cookie to disagree with this session.
          setMarketState(m);
        })
        .finally(() => {
          setPending(false);
          // Re-render the server tree so currency + CTA colour re-resolve.
          router.refresh();
        });
    },
    [router]
  );

  // Memoized so consumers (widely used — catalog, cards, checkout) don't
  // re-render on every parent render just because this Provider re-rendered;
  // only a real change to market/setMarket/pending should propagate
  // (perf audit #15). Mirrors CartContext's existing value-memoization pattern.
  const value = React.useMemo<MarketCtx>(
    () => ({ market, setMarket, pending }),
    [market, setMarket, pending]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMarket() {
  return React.useContext(Ctx);
}
