# Phase 8: verified BFF visitor attribution

Status: implemented for local validation; controlled hosting ingress remains unverified. PERF-33 is included in Phase 8 by the user's explicit instruction. Existing login/auth/checkout/contact/global limits retain their thresholds and enforcement.

The BFF previously removed untrusted IP headers but supplied no verified replacement. Many visitors could then share the Next process's API transport-IP bucket. The fix signs a canonical literal IP supplied by an ingress that overwrites `X-Aranya-Verified-Client-Ip`. A browser claim alone is never trusted. Both services use the same server-only `BFF_CLIENT_IP_SECRET` of at least 32 non-padding characters. Incoming signature metadata and forwarded IP claims are always stripped by the BFF, including when signing is disabled.

The signature is HMAC-SHA256, unpadded base64url, over `JSON.stringify([1, timestampString, methodUpper, rawTargetPathAndQuery, canonicalIp])`. Headers are `X-Aranya-Bff-Client-Ip`, `X-Aranya-Bff-Client-Time` and `X-Aranya-Bff-Client-Signature`. The API verifies canonical values, exactly one of each header, a timestamp within the preceding 30 seconds, method/path/query binding and constant-time digest equality. Verified identity is held in a private WeakMap and takes precedence in `getClientIp`. IPv6 limiter grouping remains the existing limiter's responsibility. Synchronize host clocks.

This authenticates attribution supplied by a service holding the secret; it does not authenticate a customer, sign a body, replace JWT/refresh cookies or make a captured assertion single-use. Private transport and restricted application ports are mandatory. Do not log signatures or the shared secret. Do not use the ingress header if Next is publicly reachable around that ingress. A compromised ingress or signing service can misattribute identity.

## Controlled single-VPS configuration

The [Caddy example](./deployment/Caddyfile.example) is a concrete starting configuration for **Caddy directly facing visitors**. It uses the direct socket peer, overwrites the ingress IP header and removes supplied signature assertions. Its public API origin exposes only raw gateway webhooks and GET/HEAD health; browser API requests use `/api/*` at the storefront origin. The example has not been parsed by Caddy or installed on a host here. Validate it with the actual version, domains, firewall, streaming, upload limits, TLS and process supervisor before rollout. [Caddy's documented header operations](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers) support overwrite/delete semantics.

Configure the supervised Next process to bind `127.0.0.1:3000`, and the API to use `API_HOST=127.0.0.1`, `PORT=4000`, `TRUST_PROXY=0`, `TRUST_CLOUDFLARE=false`. Set the frontend upstream to `http://127.0.0.1:4000`, the public site/frontend origin to the storefront domain and backend `API_URL` to the public webhook API domain. Set matching `BFF_CLIENT_IP_SECRET` on both processes, `BFF_CLIENT_IP_REQUIRED=true` on the API and `BFF_TRUSTED_PEERS=127.0.0.1,::1`. Store secrets outside source control with service-only permissions. Only one API process may own scheduled jobs.

In strict mode unsigned GET/HEAD are accepted only for a bounded public resource path or health and only from configured literal socket peers. Public SSR/cache fills retain their shared fetch inputs and keys; no visitor IP or timestamp is added. Their global rate bucket remains a bounded service bucket and must be capacity-tested. Unsigned private requests/writes and malformed/partial/expired signatures are rejected. Configured signing fails closed with generic 502 at the BFF if the ingress IP is absent or invalid; backend invalid configuration fails startup.

Email verification must enter through the storefront `/api/auth/verify` BFF, which retains the token query and relays the backend's redirect. Old emails pointing directly at `/auth/verify` on the API origin will stop working under this topology. Allow those tokens to expire or reissue links through the existing resend flow before strict rollout; do not broadly expose unsigned private API routes to preserve old links. Existing backend verification rules remain authoritative.

If a CDN, load balancer, containers or multiple hosts are introduced, this direct-peer example must be reviewed. A CDN-facing socket IP is the CDN's address; use a documented trusted source and restrict origin access before changing it. Do not enable blanket private-range trust or use arbitrary XFF. Multi-process in-memory limiters are still per process; representative scaling may require a shared limiter store or trusted edge enforcement. This fix does not provide distributed rate limits.

## Required hosted acceptance

1. Validate proxy configuration, DNS/TLS and private bindings; prove external TCP connections to ports 3000/4000 fail over IPv4 and IPv6.
2. Send forged ingress/signature/XFF/CF headers through the public site; verify the proxy's own visitor IP replaces them and no arbitrary identity reaches the API.
3. Verify two independent visitors keep separate login/global/checkout buckets, including IPv6. A throttled visitor must not throttle the other; existing limits still fire.
4. Check missing/invalid signatures, time drift, mismatched path/query/method and direct private requests fail. Confirm unsigned public SSR reads, cache reuse, streaming and health from trusted sockets still work.
5. Confirm auth restore/refresh/logout cookie paths, body forwarding, verification-email redirect and sandbox gateway raw signature handling. Inspect logs for unexpected 429s without recording identity/signature secrets.
6. Rehearse coordinated secret rotation and rollback. Keep strict verification enabled while a trusted signer is required; reverting to unsigned forwarding must not reopen private APIs or silently pool visitors.

The local browser integration models an ingress with synthetic literal IPs and uses the actual production verifier, `getClientIp`, login limiter and BFF. It is evidence for protocol integration, not for the future host's trust boundary.
