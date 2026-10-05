# Optional first-party Web Vitals

The live frontend uses Next.js 14's bundled `useReportWebVitals` for LCP, CLS,
INP, FCP and TTFB. No new dependency, external provider, tracing agent or analytics
credential is installed. This component emits no markup and does not change the
storefront, fonts, images or animations.

## Deployment opt-in

Keep `PERFORMANCE_TELEMETRY_ENABLED=false` for the default behavior. To enable a
small production sample, configure these **server-only** frontend variables:

```dotenv
PERFORMANCE_TELEMETRY_ENABLED=true
PERFORMANCE_TELEMETRY_ORIGIN=https://your-public-storefront.example
PERFORMANCE_TELEMETRY_SAMPLE_RATE=0.1
PERFORMANCE_TELEMETRY_REQUESTS_PER_MINUTE=120
```

The origin must be the exact browser origin, including a non-default port, with
no credentials, query or path. HTTPS is required except on localhost, 127.0.0.1
or ::1 for local validation. Missing/invalid origin fails closed. Sampling is a
number from 0 through 1; zero/invalid sampling disables the collector. The worker
budget is 1 through 600 requests per minute; invalid budgets revert to 120.
There is no `NEXT_PUBLIC_` telemetry flag or secret. Server rendering passes only
the sampling rate to the enabled client boundary. Restart/redeploy Next when
changing deployment flags. There is no third-party destination to configure.

With the flag off, the server gate returns before importing/rendering the client
collector: no Web Vitals observers or metrics requests are started. Build/network
checks should assess the resulting bundle; do not infer byte-perfect unchanged
JS from conditional rendering. With the flag on, a small sampling component is
rendered; only sampled public documents load the lazy reporter and Next's
bundled Web Vitals implementation. Unsampled visitors do not load that reporter.
The client honors Do Not Track and Global Privacy Control without storing a
sampling decision or identifier. Operator opt-in is deployment-level; it adds no
visitor consent UI. Enable only under the site's chosen privacy policy.

## Privacy and bounded work

The client sends one event per supported metric, at most five per document,
without retries. Events contain exactly `version`, constant `event=web_vital`,
allowlisted metric `name`, rounded numeric `value` and allowlisted public `route`.
Dynamic product/category/journal/recipe slugs become the literal `[slug]` group.
Queries and fragments are dropped. Account, admin, checkout, API and unknown
routes are excluded. Reports use the initial public document route; Next's Web
Vitals describe document lifetime, not individual SPA transitions. Reporting is
suppressed while the current route is private. CLS/INP may arrive when a document
becomes hidden; missing INP on documents without interactions is normal. Reports
are best-effort and can be lost on navigation, cancellation or budget exhaustion.

Neither payload nor application log contains metric IDs, user/session/cart IDs,
cookies, tokens, emails, referrers, resource URLs, full page URLs, raw dynamic
slugs, DOM targets, metric entries or attribution. The sender uses first-party
`fetch` with POST, JSON, `keepalive`, `credentials:omit`, `referrerPolicy:no-referrer`
and redirects rejected. It deliberately does not use `sendBeacon`, which cannot
override cookie/referrer behavior. Keep `connect-src 'self'` allowed if deploying
a CSP. Collector requests ignore authorization/cookie/referrer headers, never
forward to Express, set no cookies and return no CORS grants.

`/api/performance` verifies exact configured Origin and `Sec-Fetch-Site:
same-origin`, accepts POST + application/json only, reads at most 1 KiB / 64 chunks, and
limits body reads to one second. It checks unknown keys, enums, schema version,
finite nonnegative numeric values and maxima (CLS 100; other vitals 600000 ms).
Accepted data is reconstructed before structured JSON logging; rejected bodies,
errors and headers are never logged. A fixed-window worker-wide request budget
uses only two counters, with no IP/session retention. It includes invalid
same-origin attempts, responds 429 with Retry-After and resets each minute.

The worker budget is intentionally local: replicas/serverless workers each have
their own counter. Infrastructure should apply a global request/body budget if
needed, disable request-body/header capture for this endpoint, and restrict log
access and retention. Origin/Fetch Metadata checks stop cross-origin browser
writes; they do not authenticate arbitrary HTTP clients that spoof those headers.
No database writes or authenticated business actions are performed here.

## Operational validation and rollback

In a local controlled build, set sample rate 1 and the exact local origin. Load a
public product route, interact, then hide the page. Inspect only
`/api/performance` requests and resulting `event=web_vital` structured log lines:
LCP/CLS/INP/FCP/TTFB values should group as `/products/[slug]`. Private routes
should emit no new writes. Confirm requests omit cookies/authorization/referrer,
payloads stay below 1 KiB and unknown fields are rejected. Do not send real user
or checkout data as test fixtures. Focused schema/transport/collector tests live
in `scripts/performance/performance-telemetry.test.ts`; they use in-process
Requests, no network provider.

Disable `PERFORMANCE_TELEMETRY_ENABLED` and restart/redeploy to roll back. The
collector then responds 404 before reading any body. Other methods always return
405 locally rather than entering the BFF catch-all. Existing open documents may
finish attempted writes; the disabled server drops them. No cleanup of user
storage, database schema, authentication settings or commerce data is required.

Implementation references: [Next 14 useReportWebVitals](https://nextjs.org/docs/14/app/api-reference/functions/use-report-web-vitals)
and [MDN sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon).
