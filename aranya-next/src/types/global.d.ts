import type React from "react";

// The <image-slot> web component (public/image-slot.js) is a custom element.
// Declare it so TSX accepts it with its attributes. React 19's types keep JSX
// under React.JSX, so the element is added there — a global JSX namespace
// would now replace, not extend, the built-in elements.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "image-slot": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          id?: string;
          shape?: "rect" | "rounded" | "circle" | "pill";
          radius?: number | string;
          mask?: string;
          fit?: "cover" | "contain" | "fill";
          position?: string;
          placeholder?: string;
          src?: string;
        },
        HTMLElement
      >;
    }
  }
}

declare global {
  interface Window {
    // image-slot.js persistence bridge (no-op outside the editor runtime).
    omelette?: { writeFile?: (path: string, data: string) => void | Promise<void> };
  }
}

export {};
