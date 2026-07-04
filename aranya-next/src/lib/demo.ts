// Explicit opt-in for offline/demo fallbacks (acceptance criterion §11 — the
// console/storefront stay reviewable without a backend). This must be OFF in
// production: otherwise an unreachable backend grants a demo ADMIN session to
// anyone who visits /admin and types any password (SEC-08). Set
// NEXT_PUBLIC_ENABLE_DEMO=true only in local/preview builds.
export const DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";
