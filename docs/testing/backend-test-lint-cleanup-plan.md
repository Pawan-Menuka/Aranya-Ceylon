# Backend test lint cleanup

## Scope

Remove the 120 `@typescript-eslint/no-explicit-any` warnings in backend tests. The four warnings in production backend code and two frontend warnings belong to separate follow-up work. This change does not require a production deployment.

## Implementation phases

1. Start from the latest `Develop` in an isolated worktree and establish the lint, typecheck, and unit-test baseline.
2. Add typed Express request and response doubles for repeated controller-test setup. Keep unavoidable casts at the test boundary.
3. Replace broad types in the six largest test files: gift admin (25 warnings), webhook (23), checkout (17), cart service (16), order controller (15), and admin order (12). Type only the fixture fields and mock arguments each test uses.
4. Replace the remaining warnings in analytics admin (4), auth (4), and scheduler (4) tests.
5. Verify backend lint, typecheck, unit tests, build, and `git diff --check`. Review the diff for changed assertions, fixture behavior, disabled rules, or broad replacement casts.
6. Open a PR against `Develop` and let CI run its normal quality, PostgreSQL integration, and Playwright checks. Merging and deployment are separate decisions.

## Completion criteria

- Backend test files have zero `no-explicit-any` warnings.
- Existing test assertions and mock behavior are preserved.
- Backend typecheck, unit tests, and build pass.
- The PR CI checks pass.
