# Phase 9 API paging and search contract

This change removes the 500-row UI coverage limit through bounded pages. Legacy admin list requests remain compatible; mutations, auth/role middleware and existing Orders contracts are unchanged by the paging implementation.

## Admin lists

`GET /admin/products`, `/admin/blogs`, `/admin/recipes`, `/admin/gifts`, `/admin/audit-logs` opt in with `view=page`. Queries accept `limit` (integer 1–100, default 20), trimmed `q` (maximum 200 characters), and an opaque `cursor`.

| Resource | Additional filters | Rows and global count keys |
| --- | --- | --- |
| Products | `status=ACTIVE/DRAFT/ARCHIVED`, exact category name, `lowStock=true/false` | `products`; counts `all`, `low`, exact category names |
| Blogs, recipes, gifts | `status=DRAFT/SCHEDULED/PUBLISHED` | `blogs`/`recipes`/`gifts`; counts `all`, `DRAFT`, `SCHEDULED`, `PUBLISHED` |
| Audit | `filter=all/admin/warn/job`, `event`, `targetType`, `actorId` | `items`; counts `all`, `admin`, `warn`, `job` |

Every response adds `total`, `counts`, `nextCursor` (string or null), `hasNextPage`. Totals use all active filters before limiting. Category/status/audit tabs count all matching `q` rows before their active tab filter; product status and audit event/actor/target selectors remain applied across those tab counts.

Products retain full inline-editor rows for the bounded visible page. Other content lists select the existing metadata projections. Products match name or the first displayed SKU (weight then ID). Low stock means any variant at/below `LOW_STOCK_THRESHOLD` (default 10), including products with no variants. Audit retains actor labels and system-job distinction, warning events, displayed event action and target labels; metadata search covers stored diff text. No actor data enters public search.

Products, blogs, recipes and audit use creation time descending then ID ascending. Gifts use featured descending, creation time ascending, then ID ascending. Cursors carry numeric seek keys and a SHA256 identity of the resource and effective filters; changing filters invalidates a cursor with 400. Page size can change. No offset or whole-result hydration is used.

## Compact public search

`GET /search?q=warm%20cinn&sort=relevance&limit=20` accepts `sort=relevance/price-asc/price-desc/rating`, `resource=all/products/journal` (default all), `productCursor`, and `journalCursor`. The response is:

```json
{
  "q": "warm cinn", "sort": "relevance", "market": "LOCAL",
  "products": { "items": [], "total": 590, "nextCursor": null, "hasNextPage": false },
  "journal": { "items": [], "total": 600, "nextCursor": null, "hasNextPage": false }
}
```

`items` contains the current matching page, with an independently derived cursor and continuation flag for each requested resource. Both global totals remain accurate when only one resource is requested; the excluded resource has empty items and no continuation. A cursor from `resource=all` continues with its underlying resource selector. Cursors bind q, sort, canonical market and underlying resource, and reject cross-resource/cross-market reuse.

Product cards reuse the existing compact market-safe projection and approved rating calculation. Journal metadata is `id,title,slug,tags,publishedAt,seoDesc,viewCount`; content and private author data are omitted. An empty q returns zero results. Only ACTIVE products in the canonical market/BOTH and PUBLISHED journal posts match.

Products match all literal partial tokens across card metadata, or weighted English name/description FTS prefixes. FTS syntax is generated solely from word lexemes and passed as a bound parameter. Journal matches all literal partial metadata tokens, including the displayed fixed author `Aranya Ceylon`. Relevance uses FTS match/rank, metadata score, popularity and stable ID ties. Price and rating prepend their numeric displayed values; local price rounds rupees and international price uses USD, excluding foreign-currency amounts. Cursors compare numeric source keys, avoiding lexical numeric ordering.

The exact `/search` public GET/HEAD path participates in existing conditional browser cache policy and the existing loopback unsigned SSR allowlist. Other methods, nested search paths and admin routes retain their security policies.

## Verification and controlled fixtures

The focused backend suite passed 117 tests. `scripts/performance/phase-nine-api-pages.mjs` passed 18 semantic checks with all 24 current migration SQL files and 625 synthetic rows per resource, using actual PrismaPg parameter binding, compact hydration, global late filters, both markets, all four search sorts, description prefixes and cursor rejection. This is local owned-cluster evidence; it does not apply a migration to staging, Neon or a customer database.

Run with the pinned Node 22 runtime, `PG_BIN` pointing to PostgreSQL binaries (or binaries on PATH), and compiled `shared/dist`. The harness accepts no arguments/database URL, creates a new loopback cluster in its artifact directory, strips ambient database/PG variables, redirects dotenv to an absent owned path, verifies server data directory/address/port/database, records source/migration hashes and stops the cluster. `PHASE9_KEEP_CLUSTER=true` retains a successful owned cluster for coordinated sequential integration suites; its exact ownership metadata is in `artifacts/performance/phase-nine-api-pages/latest.json` → `checks.json`. Stop only that verified directory with `pg_ctl -D <owned data> -w -t20 -m fast stop` after all users finish; no files need deleting.

Browser fixture opt-in is `startFixtureApi({phase9Rows:625,admin:true})`. It yields 625 rows per resource, 600 active products, 590 public products per market, 600 published journal posts, 5 late Rare products, 25 low-stock products, 600 admin / 25 job audit entries and 12 warnings. `q=warm cinn` gives 590 product / 600 journal matches. Controlled admin session requires cookie `phase9-admin=fixtureSecret` or the fixture's signed admin Bearer; all admin mutations return 405. Default baseline fixture data is preserved. Twelve independent fixture-oracle tests passed without running a server or browser.
