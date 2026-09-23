/**
 * CORS origin policy, pulled out of index.ts so it's unit-testable without
 * booting the whole app (a real HTTP server, DB connection, etc.).
 *
 * A request with NO Origin header is never a cross-origin fetch/XHR reading
 * this response with credentials — browsers always attach Origin for those.
 * A missing Origin means a top-level navigation (the email-verification link
 * this was written for — #1), a server-to-server call, or a non-browser
 * client (curl, Postman). None of those are something CORS can or should
 * police, so a missing Origin is allowed in every environment. What's
 * rejected in production is a *present* Origin that isn't on the allowlist —
 * that's the actual case CORS exists to stop (a malicious page's JS trying
 * to read this API's response using the visitor's cookies).
 */
export function isOriginAllowed(
    origin: string | undefined,
    allowedOrigins: string[],
    isDev: boolean,
): boolean {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    // Development only: allow any *present* origin too, incl. file:// pages.
    return isDev;
}
