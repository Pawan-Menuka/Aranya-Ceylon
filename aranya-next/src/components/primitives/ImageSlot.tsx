"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import * as React from "react";
import { SLOT_IMAGES } from "@/lib/image-assets";
import { versionedImage } from "@/lib/media";

const Editor = dynamic(() => import("./ImageSlotEditor"), { ssr: false });

function slotSizes(id: string) {
  if (id === "story-sourcing" || id === "about-origin") return "(max-width: 1024px) calc(100vw - 80px), (max-width: 1280px) calc(50vw - 76px), 550px";
  if (id.startsWith("about-grower")) return "(max-width: 920px) calc(100vw - 80px), (max-width: 1180px) calc(33vw - 43px), 350px";
  if (id.startsWith("col-") || id.startsWith("occ-")) return "(max-width: 720px) calc(100vw - 80px), (max-width: 1280px) calc(33vw - 43px), 380px";
  if (id.startsWith("cat-")) return "(max-width: 1024px) calc(100vw - 80px), 600px";
  return "100vw";
}

export type ImageSlotProps = {
  id: string;
  shape?: "rect" | "rounded" | "circle" | "pill";
  fit?: "cover" | "contain" | "fill";
  radius?: number;
  placeholder?: string;
  src?: string;
  position?: string;
  mask?: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  editor?: boolean;
  style?: React.CSSProperties;
};

export function ImageSlot(props: ImageSlotProps) {
  const { id, shape = "rounded", fit = "cover", radius = 12, position = "50% 50%", mask, style, sizes = slotSizes(id), priority = false, alt = "" } = props;
  const source = props.src ?? SLOT_IMAGES[id];
  const src = source ? versionedImage(source) : undefined;
  if (props.editor) return <Editor {...props} src={src} />;
  const borderRadius = shape === "circle" ? "50%" : shape === "pill" ? 9999 : shape === "rounded" ? radius : undefined;
  return (
    <span id={id} data-image-slot style={{ display: "inline-block", position: "relative", verticalAlign: "top", width: 240, height: 160, font: "13px/1.3 system-ui,-apple-system,sans-serif", color: "rgba(0,0,0,.55)", ...style }}>
      <span style={{ position: "absolute", inset: 0, display: "block", overflow: "hidden", background: "rgba(0,0,0,.04)", borderRadius: mask ? undefined : borderRadius, clipPath: mask }}>
        {src ? <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={90} style={{ objectFit: fit, objectPosition: position }} /> : <>
          <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center", padding: 12, boxSizing: "border-box", userSelect: "none" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .45 }} aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
            <span style={{ maxWidth: "90%", fontWeight: 500, letterSpacing: ".01em" }}>{props.placeholder || "Drop an image"}</span>
          </span>
          <span style={{ position: "absolute", inset: 0, border: "1.5px dashed rgba(0,0,0,.25)", borderRadius: mask ? undefined : borderRadius, display: mask ? "none" : undefined, pointerEvents: "none" }} />
        </>}
      </span>
    </span>
  );
}
