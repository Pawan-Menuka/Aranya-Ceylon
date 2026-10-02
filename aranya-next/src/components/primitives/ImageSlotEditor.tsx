"use client";

import Script from "next/script";
import type { ImageSlotProps } from "./ImageSlot";

// Explicit authoring mode retains the original sidecar/drop/reframe bridge.
// No editor script or sidecar request is mounted in the visitor display path.
export default function ImageSlotEditor({ editor: _editor, sizes: _sizes, priority: _priority, alt: _alt, ...props }: ImageSlotProps) {
  return <><Script src="/image-slot.js" strategy="afterInteractive" /><image-slot {...props} /></>;
}
