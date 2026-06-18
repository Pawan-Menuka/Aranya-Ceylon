"use client";

import Script from "next/script";
import * as React from "react";

// Thin React wrapper around the <image-slot> web component (public/image-slot.js).
// Real product/category/story photography drops into these; until then the
// SpicePhoto-tinted base behind them keeps the layout on-brand (spec §10).
// The user's dropped image persists via the component's own sidecar.
export function ImageSlot(props: {
  id: string;
  shape?: "rect" | "rounded" | "circle" | "pill";
  fit?: "cover" | "contain" | "fill";
  radius?: number;
  placeholder?: string;
  src?: string;
  style?: React.CSSProperties;
}) {
  const { style, ...rest } = props;
  return (
    <>
      <Script src="/image-slot.js" strategy="afterInteractive" />
      {/* custom element, typed in src/types/global.d.ts */}
      <image-slot {...rest} style={style} />
    </>
  );
}
