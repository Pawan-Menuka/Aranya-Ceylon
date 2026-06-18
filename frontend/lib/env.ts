// Backend API base URL. Same parent domain as the app in prod (e.g.
// https://api.aranyaceylon.com); the Express server in local dev.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Base URL for static assets (hero frames, etc.) served from Cloudflare R2.
export const ASSETS_URL = process.env.NEXT_PUBLIC_ASSETS_URL ?? "";

// Public origin of the storefront itself — used for canonical URLs, sitemap,
// robots and OG/Twitter metadata. Set NEXT_PUBLIC_SITE_URL in prod.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function apiUrl(path: string): string {
  return API_URL + path;
}
