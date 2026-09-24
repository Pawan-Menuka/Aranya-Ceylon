# Project documentation

Only the public `README.md` and `SECURITY.md` documentation entry points remain
at the repository root. Historical reports, test plans, operational checklists,
and design references live here so the application code remains easy to find.

## Audits

- [Initial audit report](audits/audit-report.md) — first full repository review.
- [Second audit pass](audits/audit-report-pass-2.md) — verification and follow-up findings.
- [Storefront audit](audits/storefront-audit-report.md) — storefront-specific review.
- [Remaining surfaces audit](audits/remaining-surfaces-audit-report.md) — follow-up review of uncovered surfaces.
- [Performance audit](audits/performance-audit-report.md) — performance findings and remediation status.

## Testing

- [Backend manual test plan](testing/backend-manual-test-plan.md) — manual API acceptance checklist.
- [Backend autonomous execution plan](testing/backend-autonomous-execution-plan.md) — safe automated execution scope.
- [Backend test execution results](testing/backend-test-execution-results.md) — recorded results from the backend test run.
- [PostgreSQL integration setup](../backend/src/test/integration/README.md) — local database setup and safety rules.

## Operations

- [Deployment checklist](operations/deployment-checklist.md) — production launch checklist.
- [Deployment readiness plan](operations/deploy-readiness-plan.md) — staged readiness work and verification.
- [Known issues](operations/known-issues.md) — historical issue log and accepted follow-up work.

## Design

- [Image-generation prompts](design/image-generation-prompts.md) — prompts and visual asset guidance.

## Improvement phases

- [Phased implementation plan](PHASED_IMPLEMENTATION_PLAN.md) — repository quality roadmap.
- [Phase 0 baseline](PHASE_0_BASELINE.md) — baseline recorded before implementation.
