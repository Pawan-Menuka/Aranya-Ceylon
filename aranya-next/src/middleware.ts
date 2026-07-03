import { NextRequest, NextResponse } from "next/server";

// Security headers for the whole storefront, including a nonce-based
// Content-Security-Policy. Next.js reads the nonce from the CSP on the request
// headers and automatically applies it to its own inline bootstrap scripts, so
// we get a strict script-src without 'unsafe-inline' in production.
//
// Runs on the Edge runtime: no Node Buffer — use Web Crypto for the nonce.
export function middleware(request: NextRequest) {
    const isDev = process.env.NODE_ENV !== "production";
    const nonce = crypto.randomUUID().replace(/-/g, "");

    // Origin of the backend API the browser talks to directly (default local).
    let apiOrigin = "";
    try {
        apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").origin;
    } catch {
        /* leave empty — 'self' still covers the BFF proxy */
    }

    const csp = [
        `default-src 'self'`,
        // Next's inline scripts carry this nonce. Dev/React-Refresh needs eval.
        `script-src 'self' 'nonce-${nonce}' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ""}`,
        // React inline style attributes can't be nonced — 'unsafe-inline' required.
        `style-src 'self' 'unsafe-inline'`,
        `img-src 'self' data: blob: https://res.cloudinary.com`,
        `font-src 'self'`,
        // Stripe API + our backend; dev also needs the HMR websocket.
        `connect-src 'self' https://api.stripe.com${apiOrigin ? " " + apiOrigin : ""}${isDev ? " ws: http://localhost:*" : ""}`,
        // Stripe Elements / 3DS render in these frames.
        `frame-src https://js.stripe.com https://hooks.stripe.com`,
        `frame-ancestors 'none'`,
        `base-uri 'self'`,
        // Local-market checkout submits a hidden form to PayHere's hosted page.
        // Without these origins, 'self' blocks the redirect and LKR payment dies
        // in the browser before it starts.
        `form-action 'self' https://sandbox.payhere.lk https://www.payhere.lk`,
        `object-src 'none'`,
        // Only force https for subresources in production (dev is http localhost).
        ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");

    // Pass the nonce + CSP to Next via the request headers so it nonces its scripts.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    // And on the response so the browser actually enforces it.
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    return response;
}

export const config = {
    // Apply to all routes except Next internals and static image assets, which
    // don't need a per-request CSP and would only add overhead.
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
