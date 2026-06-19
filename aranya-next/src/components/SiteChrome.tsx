"use client";

import * as React from "react";
import type { Market } from "@/lib/types";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

// Shared chrome for every non-home page: the navbar and the forest mega-footer.
// CommerceProvider is now mounted once in the root layout — do not add it here.
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
  return (
    <>
      <Navbar heroMode={hero} />
      {children}
      <Footer />
    </>
  );
}
