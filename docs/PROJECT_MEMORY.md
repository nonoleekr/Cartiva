# Cartiva — project memory and handoff

Updated: 24 November 2026. Read this first when resuming. This is a compact development handoff, not a substitute for source inspection or fresh tests.

## Goal and boundaries

Build an independent, understandable full-stack e-commerce portfolio project for a Computer Science student preparing for software engineering internships. Teach concepts before unfamiliar code; implement one milestone at a time and stop for review. Never describe planned features as complete.

- New repository: `D:/Coding_Projects/Cartiva`.
- Reference only: `D:/Coding_Projects/simple-ecommerce-cart-system`; its Swing and later Spring/React code remain untouched. No automatic migration/copy/refactoring.
- Obsidian: `D:/Ronald/Documents/obsidian_vault/Projects/Cartiva`.
- User requested all pre-M4 documentation be copied to Obsidian, and development notes kept updated there going forward.
- M4 has **not started**. This documentation task does not authorize M4, deployment, commits or pushing changes.

## Approved design

Single store with CUSTOMER/ADMIN, authenticated carts, MYR integer sen, simulated payments, zero demo tax/shipping. React/TypeScript/Vite/Tailwind/React Router; Node 24/Express/TypeScript; PostgreSQL/Prisma; Better Auth database cookie sessions; Zod; Vitest/Supertest and browser verification with Playwright; npm workspaces and GitHub Actions. Modular monolith, one database; no microservices or unnecessary orchestration.

Wishlist/reviews/dashboard/advanced filters/guest carts/marketplace/real payments are deferred. Proposed deployment is same-origin SPA/API on Render with Neon, subject to later budget/TLS/proxy verification. Nothing is hosted or published by this work.

## Implemented through M3

| Milestone | Actual implementation | Detailed record |
| --- | --- | --- |
| M1 | Independent workspaces, strict TS/ESLint, router/layout, live connection/retry, environment validation, API JSON 404 boundary, production static serving, CI | [M1](MILESTONE_1.md) |
| M2 | Separate development/test PostgreSQL, generated Prisma client, two reviewed migrations, auth-base tables, category/product schema, synthetic seed and public catalog API | [M2](MILESTONE_2.md) |
| M3 | Registration/sign-in/out, account/session UI, sanitized identity, current-role authorization infrastructure, session-bound CSRF, local admin provisioning, auth limits/config | [M3](MILESTONE_3.md) |

No customer catalog/product screens, persistent cart, checkout, orders, admin CRUD/fulfillment or deployment yet. The public catalog API exists; the shopping interface does not. Admin role middleware exists and is tested; admin management actions remain M6.

## Important implementation details

- `apps/api/src/app.ts`: app composition, auth gateway before body parsing, catalog/identity/health, API reservation before SPA fallback. `server.ts`: config, database, listen/shutdown.
- `apps/api/src/modules/catalog/`: Zod query validation and active-only browse/detail/categories. All sort orders tie-break by ID; category relation batched, three SELECTs per page in recorded diagnostics. Search escapes LIKE wildcard characters.
- `apps/api/prisma/schema.prisma`: auth user IDs are TEXT; category/product IDs UUID. Two migrations add auth base then catalog/checks. Generated client is ignored and rebuilt by npm prepare.
- `apps/api/src/modules/auth/`: Better Auth, password policy 12–128 chars, transactional writes, seven-day absolute sessions, no cookie cache/rolling refresh. Signup always CUSTOMER. Current role read from DB; logout revokes session.
- `/api/v1/me` excludes password/session tokens; `/csrf` is HMAC-bound to session ID. Future mutations must attach session → role if required → CSRF → validation/action.
- Exact origin and JSON/16KB checks on auth POST; HttpOnly/SameSite=Lax; HTTPS/Secure in production. Auth response token fields are discarded, no browser storage persistence.
- Rate limiting is single-instance memory and uses server-overwritten socket-peer IP. Actual hosted proxy-IP handling/distributed limits remain M7; Vite clients share a peer bucket.
- `apps/web/src/features/auth/`: parsed HTTP responses, session context/provider, forms/account. Session checks have a timeout, abort cleanup and revision guard against stale responses.
- Local admin command requires an existing explicit email and `--confirm`, refuses remote/production DBs and revokes sessions. No default admin credentials.

## Latest recorded verification, not a fresh rerun

On 23 November 2026: `npm run check` passed lint/typechecks, 23 HTTP/config/safety tests and both builds. `npm run test:integration` passed 30 real-PostgreSQL tests (21 catalog, 9 auth): **53 total**. UI was checked in Chromium at 1440×900 and 375×812: signup, reload restoration, invalid credentials, logout, role provisioning/session revocation, mobile overflow and keyboard access. Expected anonymous/wrong-login HTTP 401 resource messages were distinguished from application exceptions.

Synthetic browser user/credentials were removed. Screenshot evidence is archived in the Obsidian project assets; no real personal data was used. CI is configured, not remotely verified. Firefox/Safari, hosted TLS/proxy and email delivery remain unverified. Email verification/password recovery are intentionally unavailable and disclosed in UI.

Working tree had documentation/source/config largely untracked as of the documentation handoff. No commit/push/merge/public deployment has been performed or evidenced. Check `git status` before later changes; do not assume a clean or committed baseline.

## Setup and common issues

```powershell
npm ci
docker compose --profile test up -d --wait
npm run db:migrate
npm run db:seed
npm run auth:setup
npm run dev
```

Use `http://127.0.0.1:5173` consistently. API 3001; dev PostgreSQL 5434, persistent project volume; test PostgreSQL 5435, disposable tmpfs. `.env.example` documents local settings. `auth:setup` creates a random secret in ignored `.env`, preserves existing keys and never prints it. Never export that `.env`.

```powershell
npm run check
$env:TEST_DATABASE_URL = 'postgresql://cartiva_test:cartiva_test_only@127.0.0.1:5435/cartiva_test'
npm run test:integration
npm run db:inspect
```

Stop dev servers before `npm ci` on Windows: native dependency files can be locked. Use Node's built-in watcher with `--import tsx`; the earlier tsx watch wrapper stalled. Docker must be running and unpaused; it was explicitly unpaused with user approval during M2. Sandbox loopback restrictions can require tool escalation; report environment failures separately from app failures.

## Next authorized work and future M4

Current task: synchronize all existing documentation to the vault, verify it, and record the workflow. Await the user's next instruction before M4.

When M4 is authorized: reread [roadmap](DEVELOPMENT_ROADMAP.md), [API](API_DESIGN.md), [database design](DATABASE_DESIGN.md) and actual source. Build responsive routed catalog/details against the real API and a customer-owned persistent cart. Add cart migrations (TEXT user FK), merged quantity/stock checks, cart lock/revision, canonical server totals and ownership/concurrency tests. Show real loading/error/empty states; do not mask failures with sample products. Checkout remains M5. Confirm or develop the catalog visual direction as part of M4, within the approved scope.

## Documentation workflow

Read [Obsidian workflow](OBSIDIAN_WORKFLOW.md). Update repository documents and this compact memory as facts change, append [development log](DEVELOPMENT_LOG.md), then sync and verify the vault before handoff. Keep historical milestone records clearly historical. Preserve user additions in the vault.

The user explicitly requires every development action plan to include documentation, explanatory note-making, organized Obsidian placement/linking and sync verification. These are visible tasks and milestone completion criteria, not an implied final offer. Write notes during development; see the remaining milestone tasks in [roadmap](DEVELOPMENT_ROADMAP.md).

On 24 November the user also requested local Git commit checkpoints after each significant completed part. For authorized development: implement → verify → document/sync Obsidian → review/selectively stage → commit → report actual hash/scope. Do not defer all commits to milestone end, include unrelated/untracked baseline work automatically, or push without separate authorization. This request updates the plan; it does not start M4 or ask for a bulk retrospective commit. Before future implementation commits, deliberately review the existing untracked M1–M3 baseline.
