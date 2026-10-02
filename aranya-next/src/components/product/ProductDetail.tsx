"use client";

import * as React from "react";
import type { Spice, Market, Product } from "@/lib/types";
import { useMarket } from "../MarketContext";
import { Breadcrumb, Gallery, BuyBox } from "./BuyBox";
import { ForestStory, FlavourProfile, Pairings, ReviewsBlock, Related } from "./Sections";
import type { SanitizedHtml } from "@/lib/sanitized-html";

// Composes the full product page below the (shared) navbar — ported from the
// assembly in Product Detail.html. Market comes from context so currency + CTA
// colour react to the switcher.
export function ProductDetail({ spice, related, product, storyHtml }: { spice: Spice; related: React.ReactNode; product?: Product; storyHtml: SanitizedHtml[] }) {
  const { market } = useMarket();
  return (
    <div data-screen-label="Product detail">
      <div style={{ background: "var(--bg)", paddingTop: 96 }}>
        <Breadcrumb spice={spice} />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 40px 80px" }}>
          <div className="pd-layout">
            <Gallery spice={spice} />
            <BuyBox spice={spice} market={market} product={product} />
          </div>
        </div>
      </div>
      <ForestStory spice={spice} storyHtml={storyHtml} />
      <FlavourProfile spice={spice} />
      <Pairings spice={spice} />
      <ReviewsBlock spice={spice} />
      {related}
    </div>
  );
}

// Keep related-card currency reactive while the server streams this optional slot.
export function RelatedProducts({ spices }: { spices: Spice[] }) {
  const { market } = useMarket();
  return <Related spices={spices} market={market} />;
}
