"use client";

import * as React from "react";
import type { Market, Spice } from "@/lib/types";
import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { HomeHero, MarketStrip } from "./HomeHero";
import { SpiceTicker, FeaturedForest, CategoryAccordion } from "./Sections";
import { StoryBand, Bestsellers } from "./StorySections";
import { Heritage, Newsletter } from "./Heritage";

// Homepage shell. CommerceProvider is mounted once in the root layout.
// `initialMarket` is kept for callsite compatibility but is unused here.
export function HomePage({
  featured,
  bestsellers,
  ticker,
}: {
  initialMarket?: Market;
  featured: Spice[];
  bestsellers: Spice[];
  ticker: Spice[];
}) {
  return (
    <>
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
    </>
  );
}
