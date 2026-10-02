"use client";

import * as React from "react";
import type { Market } from "@/lib/types";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { StorefrontChromeContext } from "./StorefrontChrome";

// Storefront pages already have the persistent route-group chrome. Keep this
// wrapper as a pass-through there, with standalone chrome for root fallbacks.
// CommerceProvider is mounted once in the root layout — do not add it here.
// `initialMarket` is kept in the type signature so existing page callsites
// that still pass it compile without changes; it is intentionally unused here.
export function SiteChrome({
  children,
  hero = false,
}: {
  initialMarket?: Market;
  children: React.ReactNode;
  hero?: boolean;
}) {
  const persistent = React.useContext(StorefrontChromeContext);
  if (persistent) return <>{children}</>;

  return (
    <>
      <Navbar heroMode={hero} />
      {children}
      <Footer />
    </>
  );
}
