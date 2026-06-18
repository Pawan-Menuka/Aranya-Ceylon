"use client";

import * as React from "react";
import type { Market, Spice } from "@/lib/types";
import { CommerceProvider } from "../CommerceProvider";
import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { HomeHero, MarketStrip } from "./HomeHero";
import { SpiceTicker, FeaturedForest, CategoryAccordion } from "./Sections";
import { StoryBand, Bestsellers } from "./StorySections";
import { Heritage, Newsletter } from "./Heritage";

// Homepage shell (ports the composition of Home.html). Section order + the
// background rhythm (cream base · forest story + footer · near-black hero +
// heritage · amber spark) are preserved exactly. Market resolves server-side
// and is handed in as `initialMarket`.
export function HomePage({
  initialMarket,
  featured,
  bestsellers,
  ticker,
}: {
  initialMarket: Market;
  featured: Spice[];
  bestsellers: Spice[];
  ticker: Spice[];
}) {
  return (
    <CommerceProvider initialMarket={initialMarket}>
      <Navbar heroMode />
      <MarketStrip />
      <HomeHero dust />
      <SpiceTicker spices={ticker} />
      <FeaturedForest spices={featured} />
      <CategoryAccordion />
      <StoryBand />
      <Bestsellers spices={bestsellers} />
      <Heritage />
      <Newsletter />
      <Footer />
    </CommerceProvider>
  );
}
