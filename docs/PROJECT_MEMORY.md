# Cartiva — project memory and handoff

Updated: 24 November 2026. Read this first when resuming. This is a compact development handoff, not a substitute for source inspection or fresh tests.

## Goal and boundaries

Build an independent, understandable full-stack e-commerce portfolio project for a Computer Science student preparing for software engineering internships. Teach concepts before unfamiliar code; implement one milestone at a time and stop for review. Never describe planned features as complete.

- New repository: `D:/Coding_Projects/Cartiva`.
- Reference only: `D:/Coding_Projects/simple-ecommerce-cart-system`; its Swing and later Spring/React code remain untouched. No automatic migration/copy/refactoring.
- Obsidian: `D:/Ronald/Documents/obsidian_vault/Projects/Cartiva`.
- User requested all pre-M4 documentation be copied to Obsidian, and development notes kept updated there going forward.
- M4 authorized and completed on 24 November; local verification documented. Stop before M5. Local commits are authorized; no push/deployment.

## Approved design

Single store with CUSTOMER/ADMIN, authenticated carts, MYR integer sen, simulated payments, zero demo tax/shipping. React/TypeScript/Vite/Tailwind/React Router; Node 24/Express/TypeScript; PostgreSQL/Prisma; Better Auth database cookie sessions; Zod; Vitest/Supertest and browser verification with Playwright; npm workspaces and GitHub Actions. Modular monolith, one database; no microservices or unnecessary orchestration.

Wishlist/reviews/dashboard/advanced filters/guest carts/marketplace/real payments are deferred. Proposed deployment is same-origin SPA/API on Render with Neon, subject to later budget/TLS/proxy verification. Nothing is hosted or published by this work.

## Implemented through M4

| Milestone | Actual implementation | Detailed record |
| --- | --- | --- |
| M1 | Independent workspaces, strict TS/ESLint, router/layout, live connection/retry, environment validation, API JSON 404 boundary, production static serving, CI | [M1](MILESTONE_1.md) |
| M2 | Separate development/test PostgreSQL, generated Prisma client, two reviewed migrations, auth-base tables, category/product schema, synthetic seed and public catalog API | [M2](MILESTONE_2.md) |
| M3 | Registration/sign-in/out, account/session UI, sanitized identity, current-role authorization infrastructure, session-bound CSRF, local admin provisioning, auth limits/config | [M3](MILESTONE_3.md) |

| M4 | Responsive catalog/detail with URL filters, persistent owned cart API/UI, serialized writes, canonical integer totals and sample imagery | [M4](MILESTONE_4.md) |

No checkout, orders, admin CRUD/fulfillment or deployment yet. Admin role middleware exists and is tested; admin management actions remain M6.

## Important implementation details

- `apps/api/src/app.ts`: app composition, auth gateway before body parsing, catalog/identity/cart/health, API reservation before SPA fallback. `server.ts`: config, database, listen/shutdown.
- `apps/api/src/modules/catalog/`: Zod query validation and active-only browse/detail/categories. All sort orders tie-break by ID; category relation batched, three SELECTs per page in recorded diagnostics. Search escapes LIKE wildcard characters.
- `apps/api/prisma/schema.prisma`: auth user IDs are TEXT; category/product IDs UUID. Three migrations add auth base, catalog/checks and cart/lines. Generated client is ignored and rebuilt by npm prepare.
- `apps/api/src/modules/auth/`: Better Auth, password policy 12–128 chars, transactional writes, seven-day absolute sessions, no cookie cache/rolling refresh. Signup always CUSTOMER. Current role read from DB; logout revokes session.
- `/api/v1/me` excludes password/session tokens; `/csrf` is HMAC-bound to session ID. Future mutations must attach session → role if required → CSRF → validation/action.
- Exact origin and JSON/16KB checks on auth POST; HttpOnly/SameSite=Lax; HTTPS/Secure in production. Auth response token fields are discarded, no browser storage persistence.
- Rate limiting is single-instance memory and uses server-overwritten socket-peer IP. Actual hosted proxy-IP handling/distributed limits remain M7; Vite clients share a peer bucket.
- `apps/web/src/features/auth/`: parsed HTTP responses, session context/provider, forms/account. Session checks have a timeout, abort cleanup and revision guard against stale responses.
- Local admin command requires an existing explicit email and `--confirm`, refuses remote/production DBs and revokes sessions. No default admin credentials.

## Latest recorded verification, not a fresh rerun

On 24 November 2026, the M4 full run passed `npm run check` (lint/typechecks, 23 HTTP/config/safety tests and both builds) and 44 PostgreSQL integration tests: **67 total**. Browser Chromium checks cover catalog query/reload, details, anonymous add/signup return path, authenticated add/update/remove, stock conflict, persistence, empty/out-of-stock and catalog outage/retry. Mobile 375×812 catalog/product/cart overflow and desktop 1440×1000 screenshots are recorded in M4. Account switching, missing-product feedback, keyboard skip navigation and cleanup of both synthetic browser users were verified.

Local checkpoints: `66cc5d0` reviewed M1–M3 baseline; `a474544` cart backend; `6d7a409` catalog UI. The connected cart/handoff commit includes this note; use Git log for its hash. No push/deploy. Check actual Git status when resuming.

CI is configured but not remotely verified. Firefox/Safari, hosted TLS/proxy and email delivery remain unverified. Recovery/verification, checkout, orders and admin screens remain unavailable.

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

## Current boundary and next step

Present completed M4 for user review. Notes and screenshot evidence are organized in Obsidian with hash/link verification; local checkpoint commits are recorded in Git. M5 checkout requires the next milestone instruction. Its first work will explain shipping/review, current-price validation, atomic inventory/order creation and duplicate-request protection; do not scaffold it during M4.

## Documentation workflow

Read [Obsidian workflow](OBSIDIAN_WORKFLOW.md). Update repository documents and this compact memory as facts change, append [development log](DEVELOPMENT_LOG.md), then sync and verify the vault before handoff. Keep historical milestone records clearly historical. Preserve user additions in the vault.

The user explicitly requires every development action plan to include documentation, explanatory note-making, organized Obsidian placement/linking and sync verification. These are visible tasks and milestone completion criteria, not an implied final offer. Write notes during development; see the remaining milestone tasks in [roadmap](DEVELOPMENT_ROADMAP.md).

On 24 November the user also requested local Git commit checkpoints after each significant completed part. For authorized development: implement → verify → document/sync Obsidian → review/selectively stage → commit → report actual hash/scope. Do not defer all commits to milestone end, include unrelated/untracked baseline work automatically, or push without separate authorization. The previously untracked M1–M3 baseline was deliberately reviewed and committed separately as `66cc5d0`.

## M5 handoff

This update supersedes the M4 boundary above. M5 was authorized and implemented. Start with [M5](MILESTONE_5.md) for checkout locks, quotes, retry behavior and verification. Backend checkpoint 2fa57b5. Local feature work stops at the M5 review boundary before M6.

## M6 handoff

M6 supersedes the earlier milestone boundary. Administration and fulfillment are implemented and locally verified, with backend checkpoint ff60b22. The admin landing page is /admin and Account links to it for administrators. Existing PLACED orders can progress to PROCESSING, SHIPPED and DELIVERED. Review [M6](MILESTONE_6.md) before starting M7 release work.

## M7 handoff

M7 local release preparation passed 71 automated tests, the compiled-server smoke and a disposable database restore rehearsal. The workflow now runs the release smoke after migration and integration tests. See [M7](MILESTONE_7.md) and the [release runbook](RELEASE_RUNBOOK.md). Hosted acceptance and remote CI require a confirmed host, budget and publication scope.

## Admin portal polish before publication

The dedicated portal shell, list controls, order counts and image preview are documented in [Admin portal UX](ADMIN_PORTAL_UX.md). Public hosting remains pending. Verify the portal in the hosted release before sharing a live URL.

## Hosted user-testing follow-up

Product visibility, customer order history and optional saved shipping are documented in [User testing improvements](USER_TESTING_IMPROVEMENTS.md). The migration must run before the revised API starts. Local verification and publication are separate release checkpoints.
