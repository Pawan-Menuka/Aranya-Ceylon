"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

// Existing page wrappers remain compatible while the route-group layout owns
// the single navbar/footer instance across storefront navigation.
export const StorefrontChromeContext = React.createContext(false);

const HERO_ROUTES = new Set([
  "/", "/about", "/contact", "/gifts", "/wholesale", "/faq",
  "/shipping", "/privacy", "/terms", "/cookies",
]);

export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hero = HERO_ROUTES.has(pathname) || pathname.startsWith("/journal/") || pathname.startsWith("/recipes/");

  return (
    <StorefrontChromeContext.Provider value={true}>
      <Navbar heroMode={hero} />
      {children}
      <Footer />
    </StorefrontChromeContext.Provider>
  );
}
