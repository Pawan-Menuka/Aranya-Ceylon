// Single source of truth for the admin-side LKR→USD display estimate.
//
// The admin console normalises LKR orders/revenue to a USD-equivalent so mixed-
// currency figures are comparable. This value MUST match the backend's
// LKR_USD_RATE (analytics.admin.controller) — previously the admin orders table
// used a stale `/148` while the dashboard + backend used 300, so the same order
// showed two different USD figures ~2× apart (GAP-03). Env-overridable; 300 default.
export const LKR_PER_USD = Number(process.env.NEXT_PUBLIC_LKR_USD_RATE) || 300;
