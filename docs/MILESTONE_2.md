# Milestone 2 — database and catalog API

Historical M2 completion record. For the current M3 state, see [M3 record](MILESTONE_3.md) and README.

Scope: isolated PostgreSQL, generated auth-base schema, reviewed category/product migrations, synthetic seed, public catalog endpoints and real database tests. No login/session handlers, customer catalog UI, cart, order or admin workflow. M2 completed and locally verified on 19 November 2026; awaiting review before M3.

## Concepts and request path

A **primary key** uniquely identifies a record. Products reference category IDs with a **foreign key**; PostgreSQL rejects nonexistent category references and deletion of categories still in use. A **CHECK constraint** protects invariants such as nonnegative stock and positive bounded prices even when a write bypasses the API.

**Migrations** are versioned changes to the database. Migration 001 creates generated Better Auth base tables; 002 adds catalog models and checks. Once applied, do not edit their contents; add a new migration. **Seeding** is separate: it creates predictable fictional records for development/tests, not schema or real customer data.

Prisma maps TypeScript operations to parameterized SQL; it does not remove the need to understand SQL. `src/modules/catalog/catalog.service.ts` selects explicit public fields, applies only ACTIVE status, uses a fixed sort map, and requests a bounded page. Related categories are fetched in a batch, not separately per product. Page rows and count use the same repeatable-read snapshot so concurrent changes cannot disagree within one response.

```text
GET /api/v1/products?q=amber&sort=price-asc
 → Express catalog route
 → Zod validates query fields and bounds
 → catalog service constructs typed Prisma query
 → PostgreSQL returns active matching rows and count
 → explicit public DTO + pagination metadata
```

TypeScript validates developer code; Zod validates incoming HTTP strings. The SQL constraints protect stored data. These are three different boundaries. Product prices are integers in sen: 1100 means MYR 11.00, avoiding floating-point currency arithmetic.

## Schema decisions

- `prisma/auth.generated.prisma` preserves actual output from `auth@1.7.26 generate --config scripts/auth-schema.ts --output prisma/auth.generated.prisma --yes`. This is a reference snapshot, not an independently configured client schema. Generation needs no DB connection.
- `prisma/schema.prisma` keeps those auth field names/relationships and string IDs, adds native timestamptz, explicit ESM client output and independent UUID catalog models. SQL adds CUSTOMER/ADMIN role checking and case-insensitive email uniqueness. Authentication remains future work.
- Only Category/Product commerce tables exist. The larger DATABASE_DESIGN document remains a target for later milestones.
- Product status is a PostgreSQL enum; archived/draft rows never appear in public API. Out-of-stock ACTIVE products remain discoverable.
- Trusted relative product image paths use one clearly labeled synthetic SVG placeholder; no legacy images or product data were copied.
- No custom SQL search index/caching yet. Inspect the tiny synthetic dataset's plan before changing indexes; these local timings are not production performance claims.

## Run and verify

From repository root, Docker Desktop running and unpaused:

```powershell
npm ci
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

The generated Prisma TS client is ignored in git and rebuilt automatically by npm's prepare script; `npm run db:generate` is available explicitly. API scripts load optional `apps/api/.env`; development uses defaults in its absence. Required production DATABASE_URL must be supplied explicitly.

```powershell
Invoke-RestMethod 'http://127.0.0.1:3001/api/v1/health/ready'
Invoke-RestMethod 'http://127.0.0.1:3001/api/v1/products?q=AMBER%20TELESCOPE'
Invoke-RestMethod 'http://127.0.0.1:3001/api/v1/products/sample-item-01'
Invoke-RestMethod 'http://127.0.0.1:3001/api/v1/categories'
```

Search supports literal case-insensitive name/description substrings; `%` and `_` are escaped rather than acting as wildcard filters. Sort: newest/price-asc/price-desc/name, with ID tie-breaking. page 1–100000, pageSize 1–50; unknown/repeated/invalid query values get structured 400s. Inactive/unknown details get 404. No-match/past-end page is a successful empty result.

```powershell
npm run check
docker compose --profile test up -d --wait
$env:TEST_DATABASE_URL = 'postgresql://cartiva_test:cartiva_test_only@127.0.0.1:5435/cartiva_test'
npm run test:integration
npm run db:inspect
```

Tests never silently use the development DB. The integration runner rejects missing/remote/wrong-name/prod targets before migration; it sets its subprocess DATABASE_URL to TEST_DATABASE_URL. Development data persists in the project volume; test storage is tmpfs and disposable. `docker compose --profile test stop` stops this project's services without deleting the development volume. Seed updates the known 26 product IDs and three categories; it does not delete unrelated records or create user credentials. Re-running it deliberately restores the known sample values.

## Verification record

- Two migrations applied successfully to empty development and test databases. A second dev deploy reports no pending migrations.
- Seed produces three categories, 26 products (24 active, one draft, one archived); repeat run verified through integration tests.
- SQL checks/FK/unique/status rejection, search beyond first sorted page, category/sort/tie/pagination, public DTOs, details/404s, literal wildcard/injection-like input, empty states and query validation tested on actual PostgreSQL.
- Upgrade fixture applies migration 001 in a transaction-local schema, inserts one fictional auth row, applies 002 and verifies the row remains; rollback removes the fixture. No real accounts created.
- Catalog SELECT count: **three for pageSize=1 and three for pageSize=50**, avoiding N+1 category fetches. Example local cold/warm diagnostic was 133.6ms/9.2ms; these are single-run setup-sensitive timings, not benchmarks. Observed EXPLAIN used the composite index with an explicit sort; tiny-table plans may change after statistics collection.
- Initial DB attempts failed because Docker Desktop was manually paused; user approved unpausing, then both services resumed healthy. Windows native file locks required stopping the existing M1 dev server before clean-install verification.
- Final `npm ci` passed, including automatic generation of Prisma client; audit reported zero vulnerabilities at inspection. `npm run check` passed lint, source/test/script/web typechecks, **21 HTTP/config/safety tests**, API compilation and Vite production build.
- Final `npm run test:integration` passed **21 real-PostgreSQL tests**, including the additional unavailable-database readiness test. Total: **42 passing tests**, executed in separate database-independent/integration commands.
- Actual `npm run dev` and automatic server restart verified after switching to Node built-in `--watch --import tsx`; the previous tsx watch wrapper stalled on this Windows environment. Compiled Node startup and DB readiness also verified.
- Live HTTP: readiness returned `ready`; Vite-proxied page 2 returned four products with totalItems=24; case-insensitive AMBER TELESCOPE search returned sample-item-25; pageSize=51 returned 400. Both Docker services healthy on separate loopback ports.
- Documentation links and git whitespace checks completed; no legacy edits or generated client/artifacts committed.

CI now provisions separate PostgreSQL and runs the integration command after existing checks. This workflow is configured locally; no remote CI/deployment result claimed. UI remains M1; no catalog browser workflow is claimed. Auth runtime integration is unverified until M3.

## Review prompts

1. Why use text IDs for library-owned users but UUIDs for products?
2. What is the difference between a migration, a seed and generated Prisma client code?
3. Why validate HTTP queries and also have SQL constraints?
4. How does one page/count snapshot help consistency?
5. Why is three batched SELECTs preferable to a query per product?
6. What does database readiness prove that process liveness does not?

Next step after M2 review: M3 authentication/session/authorization only.
