"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarket } from "./MarketContext";

const recent = new Map<string, number>();
const publicPath = /^\/(?:products|categories|journal|recipes|gifts|about|contact|wholesale|faq|shipping|privacy|terms|cookies)(?:\/[a-z0-9-]+)?$/;

// Only a chosen public destination is prefetched. No initial viewport sweep,
// private data prefetch, touch-click delay, or unbounded retained key set.
export const IntentLink = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<typeof Link>>(function IntentLink(props, ref) {
  const router = useRouter(), { market } = useMarket();
  const timer = React.useRef<ReturnType<typeof setTimeout>>();
  const cancel = () => { if (timer.current) clearTimeout(timer.current); };
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const prefetch = () => {
    if (typeof props.href !== "string" || !publicPath.test(props.href)) return;
    const key = market + ":" + props.href, now = Date.now();
    if (now - (recent.get(key) || 0) < 30000) return;
    if (recent.size >= 32) recent.delete(recent.keys().next().value!);
    recent.set(key, now); router.prefetch(props.href);
  };
  return <Link {...props} ref={ref} prefetch={false}
    onClick={event => { cancel(); props.onClick?.(event); }}
    onMouseEnter={event => { props.onMouseEnter?.(event); cancel(); timer.current = setTimeout(prefetch, 150); }}
    onMouseLeave={event => { props.onMouseLeave?.(event); cancel(); }}
    onFocus={event => { props.onFocus?.(event); prefetch(); }}
    onBlur={event => { props.onBlur?.(event); cancel(); }} />;
});
