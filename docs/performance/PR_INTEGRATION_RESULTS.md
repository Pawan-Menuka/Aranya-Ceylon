# PR integration verification

Date: 2026-10-02 (Asia/Colombo)
Base: Develop at 7186ac4; branch codex/performance-phases-0-8.

The Phase 0–8 work has been integrated with the newer Develop changes, including Prisma's separate module/pg integration adapter, Stripe intent validation, typed test doubles, market-keyed API caches, checkout tests, dependency upgrades and CI jobs. The original D: checkout and historical Phase 8 evidence are unchanged.

## Verified on the integrated source

- Frozen pnpm 9.15.9 install: 683 packages; existing lockfile retained.
- Official Node 22.23.3 Windows x64 runtime verified against its distribution SHA-256 manifest.
- Prisma 7.10 client generation with dummy configuration; shared TypeScript compilation. No database connection.
- Backend: 467 unit tests in 32 files (integration tests explicitly excluded), typecheck, production build and full lint with zero warnings/errors.
- Frontend/tooling: 190 regressions in 17 files. An initial cold dependency import timed out; a bounded two-worker rerun passed all tests.
- Isolated Next 14.2.35 production build, including types/lint, and 32 desktop cold/warm principal smoke steps: passed; no recorded flow or page-error failures.
- Develop's four checkout Playwright tests: passed with explicit anonymous session/passive cart fixtures and stub payment only.
- Existing security/payment source and Prisma module extraction retained. Public API cache invalidation now includes a bounded generation guard against stale reads completing after a mutation.

## Still under investigation

The Phase 1 controlled product 503/retry case fails to recover within 12 seconds. A diagnostic confirms that the hydrated retry sends a new RSC request; response headers arrive but the response body does not finish before the deadline. Retry timing and cold sanitizer loading are being investigated. Full controlled browser acceptance and exact remote CI remain pending. The PR is a draft until the integration blocker is resolved.

Historical Phase 8 counts and measurements describe its original snapshot, not this integrated PR. See the phase results and release checklist for unapplied search repair, hosting/ingress, real auth and sandbox gateway, load/rollback and navigation-budget gates. No real database migration, merge or deployment has occurred.
