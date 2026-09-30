"use client";

import Script from "next/script";
import * as React from "react";
import { SLOT_IMAGES } from "@/lib/image-assets";

// Thin React wrapper around the <image-slot> web component (public/image-slot.js).
// Generated photography fills known slots; the styled base covers unknown
// dynamic slots. A user's dropped image still persists via the sidecar.
export function ImageSlot(props: {
  id: string;
  shape?: "rect" | "rounded" | "circle" | "pill";
  fit?: "cover" | "contain" | "fill";
  radius?: number;
  placeholder?: string;
  src?: string;
  style?: React.CSSProperties;
}) {
  const { style, src, ...rest } = props;
  return (
    <>
      <Script src="/image-slot.js" strategy="afterInteractive" />
      {/* custom element, typed in src/types/global.d.ts */}
      <image-slot {...rest} src={src ?? SLOT_IMAGES[props.id]} style={style} />
    </>
  );
}
