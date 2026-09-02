// Single source of truth for the admin-side "low stock" threshold.
//
// This MUST match the backend's LOW_STOCK_THRESHOLD (analytics.admin.controller,
// default 10) — previously the dashboard's Low Stock panel checked each
// variant's stock against that value while the Products page checked each
// product's total stock (summed across all its variants) against an unrelated,
// hardcoded, category-dependent number (10 for Gift Sets, 25 otherwise), so the
// same product could show as needing restock on one screen and not the other
// (Wave 3 #25). Env-overridable; 10 default.
export const LOW_STOCK_THRESHOLD = Number(process.env.NEXT_PUBLIC_LOW_STOCK_THRESHOLD) || 10;
