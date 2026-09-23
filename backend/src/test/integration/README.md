# PostgreSQL integration tests

These tests use the real Prisma PostgreSQL adapter and must run against a
dedicated database whose name contains `integration`. The cleanup helper
refuses to truncate any other database.

From the repository root in PowerShell:

```powershell
docker compose -f compose.integration.yml up -d --wait
$env:DATABASE_URL = 'postgresql://aranya:aranya_test@localhost:55432/aranya_integration'
$env:DIRECT_URL = $env:DATABASE_URL
$env:DATABASE_ADAPTER = 'pg'
pnpm --filter @aranya/backend exec prisma migrate deploy
pnpm test:integration
docker compose -f compose.integration.yml down
```

The Vitest integration configuration supplies the Compose connection URL when
`DATABASE_URL` is unset. Explicit environment variables take precedence, which
allows CI to use its PostgreSQL service-container credentials.
