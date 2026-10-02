# PR integration verification

Date: 2026-10-02 (Asia/Colombo)
Base: Develop at 7186ac4; branch codex/performance-phases-0-8.

The Phase 0–8 work has been integrated with the newer Develop changes, including Prisma's separate module/pg integration adapter, Stripe intent validation, typed test doubles, market-keyed API caches, checkout tests, dependency upgrades and CI jobs. The original D: checkout and historical Phase 8 evidence are unchanged.

## Verified on the integrated source

- Frozen pnpm 9.15.9 install: 683 packages; existing lockfile retained.
- Official Node 22.23.3 Windows x64 runtime verified against its distribution SHA-256 manifest.
- Prisma 7.10 client generation with dummy configuration; shared TypeScript compilation. No database connection.
- Backend: 467 unit tests in 32 files (integration tests explicitly excluded), typecheck, production build and full lint with zero warnings/errors.
- Frontend/tooling: 200 regressions in 19 files, including recipe build/runtime separation and actual empty-Journal server renders. Native sanitizer startup timed out during competing work; the final single-worker run passed all tests and the test configuration now uses that verified worker limit.
- Isolated Next 14.2.35 production build, including types/lint, and 32 desktop cold/warm principal smoke steps: passed; no recorded flow or page-error failures.
- Develop's four checkout Playwright tests: passed with explicit anonymous session/passive cart fixtures and stub payment only.
- Existing security/payment source and Prisma module extraction retained. Public API cache invalidation now includes a bounded generation guard against stale reads completing after a mutation.

## Integration corrections and remaining validation

The product error boundary now waits for the refresh transition to finish before resetting. All six Phase 1 failure/retry checks pass, including product recovery within the unchanged 12-second deadline. Standard production build/types/lint also pass with the API deliberately unavailable: recipe build enumeration returns no live slugs on service failure, and a Journal with no posts uses its existing empty state. Runtime transport errors still propagate to the retry boundary.

The first published CI run passed its PostgreSQL integration and checkout jobs. Its build-time recipe dependency has been fixed. The performance workflow also had a forbidden job-level runner context; checksum-verified actionlint now passes both workflows after moving that value to a supported step context. Full controlled browser acceptance and remote CI on the corrected head remain pending. PR #170 remains a draft during validation.

Historical Phase 8 counts and measurements describe its original snapshot, not this integrated PR. See the phase results and release checklist for unapplied search repair, hosting/ingress, real auth and sandbox gateway, load/rollback and navigation-budget gates. No real database migration, merge or deployment has occurred.
