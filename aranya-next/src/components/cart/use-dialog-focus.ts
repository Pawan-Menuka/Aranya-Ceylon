"use client";
import { useEffect, type RefObject } from "react";

export function useDialogFocus(ref: RefObject<HTMLElement>, open: boolean, close: () => void) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.inert = !open;
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(node.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')).filter(el => !el.hasAttribute("disabled") && el.getClientRects().length > 0);
    (focusable()[0] || node).focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      // A higher dialog (sign-in over cart) handles its own focus and Escape.
      if (!node.contains(document.activeElement)) return;
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab") return;
      const targets = focusable(), first = targets[0], last = targets.at(-1);
      if (!first) { event.preventDefault(); node.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [ref, open, close]);
}
