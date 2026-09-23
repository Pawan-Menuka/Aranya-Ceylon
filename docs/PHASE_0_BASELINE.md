# Phase 0 Baseline Report

Date: 2026-09-23

This report records the repository state before implementing the quality-improvement phases in `PHASED_IMPLEMENTATION_PLAN.md`. Phase 0 intentionally makes no application-source fixes.

## Toolchain observed

- Node.js: `v24.19.0`
- Host pnpm wrapper: `11.19.0`
- Dependency installation: pnpm `9.15.9`
- Git: `2.53.0.windows.1`
- Workspace projects: root, `backend`, `aranya-next`, and `shared`

The repository declares Node.js `>=20` and pnpm `>=9`. GitHub Actions currently uses Node.js 22 and pnpm 9.

## Pre-existing working-tree changes

The following application files were already marked as modified before Phase 0:

- `aranya-next/src/components/admin/AdminDashboard.tsx`
- `backend/src/index.ts`
- `backend/src/services/audit.service.ts`
- `backend/src/services/email.service.ts`

`backend/src/index.ts` has no normal content diff and is marked modified because of working-tree/index metadata or line-ending normalization. Git reports that LF would be replaced by CRLF if the file is touched.

The following root documents were already untracked:

- `BACKEND_AUTONOMOUS_EXECUTION_PLAN.md`
- `BACKEND_TEST_EXECUTION_RESULTS.md`
- `IMAGE_GENERATION_PROMPTS.md`

The phased plan and this baseline report are new Phase 0 documentation:

- `docs/PHASED_IMPLEMENTATION_PLAN.md`
- `docs/PHASE_0_BASELINE.md`

All pre-existing source changes and untracked documents remain in place.

## Validation results

| Check | Result | Notes |
|---|---|---|
| Frozen dependency install | Pass | Required `CI=true` because pnpm would otherwise prompt before refreshing `node_modules`. Registry permission was required for dependency verification. |
| Shared package build | Pass | TypeScript emitted successfully. |
| Shared typecheck | Pass | No TypeScript errors. |
| Backend typecheck | Pass | Initially failed because the clean install removed the generated Prisma client; passed after `prisma generate`, matching CI order. |
| Frontend typecheck | Pass | No TypeScript errors. |
| Backend lint | **Fail** | One error and 119 warnings. The error is an unused `_userId` variable in `backend/src/controllers/order.controller.ts:62`. |
| Frontend lint | Pass with warnings | Two warnings in `aranya-next/src/components/admin/AdminProducts.tsx`: a missing hook dependency at line 202 and use of `<img>` at line 274. |
| Backend unit tests | Pass | 12 files and 132 tests passed. |
| Prisma schema validation | Pass | `backend/prisma/schema.prisma` is valid. |
| Backend production build | Pass | TypeScript build completed successfully. |
| Frontend production build | **Fail** | Compilation and type validation passed, but static prerendering failed because `aranya-next/browser/default-stylesheet.css` was missing. The error is reached through server-side use of `isomorphic-dompurify` on journal and product pages. |
| Git whitespace check | Pass | `git diff --check` returned success; Git emitted only the existing `index.ts` line-ending warning. |

## Backend unit-test result

```text
Test Files  12 passed (12)
Tests       132 passed (132)
```

Vitest also reported a non-fatal missing-source sourcemap warning from `node-cron`.

## Existing backend lint failure

```text
backend/src/controllers/order.controller.ts
62:21  error  '_userId' is assigned a value but never used
```

The remaining backend lint findings are 119 `no-explicit-any` warnings, primarily in existing test doubles.

## Existing frontend build failure

The first sandboxed build could not download the three configured Google Fonts. After rerunning with network access, font loading and compilation succeeded. The build then failed during static page generation with:

```text
ENOENT: no such file or directory, open
D:\GitHub\Aranya-Ceylon\aranya-next\browser\default-stylesheet.css
```

Affected prerendered routes include journal articles and product detail pages. These routes import `sanitizeHtml`, which imports `isomorphic-dompurify`; its server-side DOM implementation is the likely source of the missing stylesheet lookup.

The build also logged `ECONNREFUSED` messages while attempting to reach the default API at `localhost:4000`. The pages generally use fallback data, and these connection messages were not the final build-stopping error.

## Phase 0 conclusion

The repository has a usable baseline for subsequent phases:

- dependency installation succeeds;
- all workspace typechecks pass after Prisma generation;
- all existing backend tests pass;
- shared and backend builds pass;
- Prisma schema validation passes;
- backend lint and frontend production build have documented pre-existing failures.

These two failures should not be attributed to the package-manager, integration-test, or Playwright changes made in later phases. They should be fixed deliberately before the final Phase 7 verification gate.
