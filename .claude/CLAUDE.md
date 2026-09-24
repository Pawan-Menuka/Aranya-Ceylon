# Aranya Ceylon

Ceylon tea / spice e-commerce storefront managed as a single pnpm workspace.

## Repo map — read this before touching anything
- `aranya-next/` — **the ONLY live frontend** (Next.js 14 + TypeScript, pnpm package `aranya-ceylon-storefront`). Dev server: `pnpm --filter aranya-ceylon-storefront dev` from the repository root (port 3000; `.claude/launch.json` exists).
- `frontend/` and `frontend-legacy/` — DEPRECATED static React-via-CDN versions. Never modify, port from, or resurrect them. Never try to "consolidate" them with aranya-next.
- `backend/` — Express + Prisma API on port 4000 (pnpm workspace pkg `@aranya/backend`).
- `shared/` — pnpm workspace pkg `@aranya/shared` (`shared/dist` is gitignored — don't `git add` it).

## Hard rules
- **The UI in `aranya-next` is hand-designed by the user over many days. NEVER redesign, restyle, rebuild, or "improve" it.** Only wire data/backend into the existing markup and styles. If a task seems to require changing visuals, stop and ask first.
- Do-not-regress list (verified working, do not break): BFF proxy, refresh-token rotation, payment-confirmation transaction, admin route gating.

## Git
- Base branch is **`Develop`** (capital D). `main` is a stale older version — never commit to, branch from, or PR against it unless the user explicitly asks for a develop→main sync.
- The user merges PRs manually and reports back; don't merge unless asked.

## Tooling
- Backend unit tests: **Vitest** — `pnpm test:unit` from the repository root (not Jest).
- Prisma v7: use `pnpm --filter @aranya/backend exec prisma ...`. Configuration lives in `backend/prisma.config.ts`; production uses `PrismaNeon`, while integration tests set `DATABASE_ADAPTER=pg` and use `PrismaPg`.
- Use pnpm for every workspace; do not create package-specific lockfiles.
- DB is Neon Postgres (ap-southeast-1). Connection errors are frequently the user's broadband — ask before debugging code.
- Legacy frontends route all API calls through `api.js` / `window.AranyaAPI` — but you shouldn't be touching those anyway.

## Workflow conventions
- Audit/fix cycles use the indexed artifacts under `docs/`: findings are numbered and severity-ranked, fixes proceed one wave/phase at a time with user sign-off between waves, and the artifact's status column is updated after each wave.
- Verify frontend changes yourself with the preview tooling (launch.json `frontend`) — never ask the user to check manually.
- The user's own dev server runs from `D:\GitHub\Aranya-Ceylon`, not the Claude worktree: your changes are invisible to them until merged/pulled. Say so when they ask why something "didn't change".
