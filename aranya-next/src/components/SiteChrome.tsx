"use client";

import * as React from "react";
import type { Market } from "@/lib/types";
import { CommerceProvider } from "./CommerceProvider";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

// Shared chrome for every non-home page: commerce context (market + cart) with
// the global cart drawer + sign-in modal, the navbar, and the forest mega-footer.
// `hero` switches the navbar to glass-over-dark-hero mode (article / recipe
// detail pages with a full-bleed dark header); default is the solid forest bar.
export function SiteChrome({ initialMarket, children, hero = false }: { initialMarket: Market; children: React.ReactNode; hero?: boolean }) {
  return (
    <CommerceProvider initialMarket={initialMarket}>
      <Navbar heroMode={hero} />
      {children}
      <Footer />
    </CommerceProvider>
  );
}
