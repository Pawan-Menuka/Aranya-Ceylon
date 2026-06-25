# Security & Hardening

This document maps the project's security posture: what is enforced **in code**
(and where), and what must be configured at the **infrastructure** layer
(Cloudflare / Railway / Neon) because it cannot live in the repo.

> Threat model: a public retail storefront. The priorities are payment
> integrity, account-takeover resistance, and abuse/DoS resilience. Low-value
> account data means heavy controls like 2FA and CAPTCHA were deliberately
> **not** adopted — see "Deliberately out of scope".

---

## Implemented in code

| Area | Control | Where |
| --- | --- | --- |
| **Auth** | bcrypt (cost 12), timing-flat login/register, user-enumeration resistance | `backend/src/controllers/auth.controller.ts` |
| | Refresh-token rotation + reuse detection + family revocation; opaque tokens stored as SHA-256 hashes | `backend/src/services/token.service.ts` |
| | Access tokens: JWT HS256, 15-min expiry; HttpOnly/Secure/SameSite=lax refresh cookie scoped to `/auth/refresh` | `backend/src/lib/jwt.ts`, `auth.controller.ts` |
| | Email verification (send + soft enforcement) | `auth.controller.ts`, `token.service.ts` |
| **Authorization** | `requireAuth` / `requireRole`; admin RBAC applied router-wide | `backend/src/middleware/authenticate.ts`, `routes/admin.routes.ts` |
| **Input** | Zod validation with length caps on every field; pagination capped at 100 | `shared/src/schemas/*`, `middleware/validate.ts` |
| **Output / XSS** | DOMPurify on the two rich-text HTML sinks; JSON-LD `<`/`>`/`&` escaping; nonce-based CSP | `aranya-next/src/lib/sanitize.ts`, `lib/json-ld.ts`, `middleware.ts` |
| **SQL injection** | Prisma ORM; raw queries use parameterized `$queryRaw` tagged templates | `backend/src/services/product.service.ts` |
| **CSRF** | Bearer-token API (not cookie auth) + SameSite=lax POST-only refresh | `auth.controller.ts` |
| **Payments** | Webhook signature verification (Stripe + PayHere), idempotent PENDING→PAID, atomic stock guards, amount/currency/merchant re-validation | `backend/src/controllers/webhook.controller.ts` |
| **Rate limiting** | Global 120/min/IP; tighter limits on `/auth`, `/checkout`, `/contact` | `backend/src/middleware/rateLimit.ts` |
| **DoS / resource** | 512 kB JSON body cap; 30s per-request timeout; `keepAliveTimeout`/`headersTimeout`; 5 MB / 10-file upload caps | `backend/src/index.ts`, `middleware/timeout.ts`, `middleware/upload.ts` |
| **File upload** | Magic-byte content validation (not just client mimetype) | `backend/src/middleware/upload.ts` |
| **Secrets** | Fail-fast env validation at boot (required secrets, JWT length, live-mode keys) | `backend/src/config/env.ts` |
| **Security headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (frontend); helmet (API) | `aranya-next/src/middleware.ts`, `backend/src/index.ts` |
| **Audit logging** | Immutable audit log (DB-level `REVOKE DELETE`), captures actor/IP/UA | `backend/src/services/audit.service.ts` |
| **Dependencies** | Report-only `pnpm audit` in CI + Dependabot auto-PRs | `.github/workflows/ci.yml`, `.github/dependabot.yml` |

---

## Configure at the infrastructure layer

These controls are not in the repo. The recommended setup puts **Cloudflare in
front of the storefront and API**, which delivers most of them at once.

### Cloudflare (in front of the app)
- **WAF** — enable the Managed Ruleset (OWASP core) for both the storefront and
  the API hostname.
- **DDoS protection** — on by default once traffic is proxied (orange-cloud the
  DNS records).
- **Bot management / rate-based abuse** — enable Bot Fight Mode and add a
  rate-limiting rule on `/auth/*` and `/checkout/*` as a network-layer backstop
  to the in-app limiters.
- **IP block / allow lists** — use WAF custom rules / IP Access Rules if you ever
  need to block a specific abuser or allowlist admin access.
- **TLS** — set SSL/TLS mode to "Full (strict)".

### Railway (API host)
- **Secrets** — set every variable from `backend/.env.example` in the service
  config. The app fails to boot if a required one is missing (by design).
- **Horizontal scaling** — before running more than one instance, gate
  `startAllJobs()` behind a leader-election flag so cron jobs don't double-fire
  (already flagged in `index.ts`). Railway's built-in load balancing handles
  request distribution.
- **`PAYMENTS_MODE=live`** — only after real Stripe + PayHere keys are set.

### Neon (database)
- **Backups / PITR** — confirm point-in-time-restore retention is enabled and set
  to an acceptable window (e.g. 7 days).
- **Database permissions** — the app connects with a single role; consider a
  least-privilege role for the runtime separate from migrations.
- **Connection** — always TLS (handled by the Neon serverless driver).

### Monitoring & alerting
- Wire Railway/Neon metrics and the `/health` endpoint into an uptime monitor
  (e.g. Better Stack, UptimeRobot) and route alerts to the team.
- Application errors already log to stdout; ship them to a log drain for
  retention and alerting on error spikes.

---

## Deliberately out of scope

For this threat model (retail storefront, low-sensitivity accounts) the
following were considered and intentionally **not** implemented, to avoid
disproportionate friction or complexity:

- **2FA / MFA** — account value doesn't justify the enrollment/login friction.
- **CAPTCHA** — rate limiting + email verification cover signup/contact abuse;
  add Cloudflare Turnstile only if real spam appears.
- **Malware scanning** — uploads are images re-encoded by Cloudinary; magic-byte
  validation is sufficient.
- **API keys / quotas / message queues** — no public API surface to meter.

---

## Reporting a vulnerability

Email **security@aranyaceylon.com** with details and reproduction steps. Please
do not open a public issue for security reports.
