# Decisions and approval record

Updated 24 November 2026. User authorized M4 after the documentation transfer and required Obsidian updates and local commits after significant parts. M4 catalog/cart is complete and locally verified; ready for review. M5 was subsequently authorized, implemented and verified. M6 was subsequently authorized and implemented. M7 is pending M6 review.

Before M4, the user requested a complete documentation transfer into the added Obsidian vault and ongoing updates during development. The project hub is `D:/Ronald/Documents/obsidian_vault/Projects/Cartiva/Cartiva.md`; repository instructions and [sync workflow](OBSIDIAN_WORKFLOW.md) now require maintaining this reading/handoff layer. The later instruction to move onto the next step authorized M4 implementation and its local commit checkpoints; publishing remains unauthorized.

## Confirmed constraints from the request

- Keep the reference Java application and its later modernization untouched.
- Cartiva is independent in `D:/Coding_Projects/Cartiva`; no automatic migration/copy/refactor.
- Produce evidence-based analysis and planning documentation first.
- Explain concepts before unfamiliar code, one milestone at a time; meaningful verification; accurate implementation claims.
- Stop after presenting the proposal; wait for approval of architecture, stack and roadmap before Milestone 1.

## Approved decision log

| ID | Proposal | Rationale / consequence |
| --- | --- | --- |
| D01 | Single store, CUSTOMER/ADMIN | Complete workflows with fewer role/inventory boundaries; sellers deferred |
| D02 | React/TS/Vite + Express/TS modular monolith | Clear client/API separation, one language across new app; no SSR initially |
| D03 | PostgreSQL + Prisma, reviewed SQL | Relational integrity and approachable schema/migrations; SQL still taught explicitly |
| D04 | Better Auth database sessions | Library-owned hashing/session lifecycle; secure cookie/origin/CSRF work still required |
| D05 | Pin compatible Prisma 7/auth versions initially | Current auth adapter docs do not support Prisma 8; recheck at implementation, do not install latest blindly |
| D06 | Authenticated cart, no stock reservation | Simpler ownership, honest availability; checkout can reject stale cart |
| D07 | MYR integer sen, zero demo shipping/tax | Exact simple arithmetic; not a real tax/shipping engine |
| D08 | Simulated payments only | No payment credentials/provider/webhook scope in MVP |
| D09 | Quote + locked atomic checkout + idempotency | Avoid stale-price surprises, overselling, duplicate orders; adds focused transaction learning |
| D10 | Archive products, forward-only fulfillment | Retain history; cancellation/refunds/restock deferred explicitly |
| D11 | npm workspaces, no monorepo orchestrator | One repo/lockfile, minimal tooling |
| D12 | Same-origin Render SPA/API + Neon DB initially | Simplifies sessions without custom domain; cold starts/budget remain trade-offs |
| D13 | Unit + real-DB integration + browser tests, GitHub Actions | Verify rules and actual system boundaries rather than mock-only confidence |

## Main risks and responses

| Risk | Response / decision point |
| --- | --- |
| Too many features hide gaps | MVP excludes sellers, reviews, wishlist/dashboard, real payments; one milestone review at a time |
| Authentication/ORM compatibility drift | Check official adapter/runtime requirements at M1; pin and lock compatible versions; revise proposal if necessary |
| Cookies fail after split deployment | Default one origin; any Vercel split requires verified proxy/cookie/origin design before deployment |
| Checkout oversells or duplicates | DB transaction, cart/product locks, deterministic lock order, conditional stock decrement, unique deduplication key and independent-connection race tests |
| Auth library protection assumed to cover all API routes | Explicit session/role/ownership checks and application CSRF protection; test every admin endpoint |
| UI looks complete during API failure | No silent demo fallback; visible loading/error/empty/retry states |
| Money overflow or BigInt JSON errors | Bounded minor-unit arithmetic, bigint DB totals and explicit safe-number DTO conversion |
| Public demo credentials/PII abuse | Synthetic data, bounded inputs/rates; no public admin credentials; recovery/verification readiness review before broader signup |
| Hosting sleeps, costs or data recovery surprises | Confirm budget/limits at M7; managed persistent DB; documented backup/restore; no uptime promises |
| AI output exceeds understanding | Explain a request and invariant before implementation; user review/demo at each milestone |

## Approval checklist / open decisions

The user approved these together before M1:

1. Single-store MVP with customer/admin, not the legacy multi-seller model.
2. React/TypeScript/Vite/Tailwind + Express/TypeScript + PostgreSQL/Prisma + Better Auth.
3. Simulated payments, MYR/Malaysia-only demo shipping, zero demo tax/shipping charges.
4. Logged-in carts; wishlist/reviews/dashboard/guest carts/cancellation deferred.
5. M1–M7 sequential roadmap and milestone-by-milestone review.

Hosting budget, exact host/domain and public-demo registration policy can be finalized before deployment. Dependencies are pinned within the approved stack. Only local isolated Cartiva databases have been provisioned; no hosted services, real accounts or copied legacy code/data.

Approval record: **approved**, user reply “yes” on 19 November; “continue” authorized M2 and “next step” on 23 November authorized M3. Docker restart/use remains within this approved local verification workflow. Review M3 before starting M4.

## Current handoff

Completed: reference inspection, planning, M1 foundation, M2 catalog database/API, M3 registration/sessions/authorization infrastructure and account UI. [M3 record](MILESTONE_3.md) has verification details. Legacy runtime, future commerce, actual hosted TLS/proxy/deployment remain unverified. No legacy files changed. Subsequently M4 was authorized and implemented; see its record for 67 passing tests and browser checks. Pending: M4 review before M5.

## M1 implementation choices

- Node 24 LTS matches the installed runtime and supported package engines. CI uses 24.11.1, local npm 11.17.0. Use patched releases within supported major 24 as maintenance continues.
- TypeScript 6.0.3 is pinned because typescript-eslint 8.73.0 declares TypeScript `<6.1.0`; blindly selecting TypeScript 7.0.2 would exceed that range.
- Installed Express 5.3.0, React 19.3.1, React Router 8.5.2, Vite 8.3.8, Tailwind 4.3.5, Vitest 5.1.1. Exact direct dependencies and lockfile provide repeatable installs.
- M1 targets, now installed for M2: Better Auth/schema CLI/Prisma adapter 1.7.26 and Prisma/client/pg adapter 7.10.1. Registry peer metadata and actual generation confirm the auth schema generator accepts this set; runtime authentication integration remains M3. [Official adapter guidance](https://better-auth.com/docs/adapters/prisma).
- `packages/contracts` is deferred: one health response does not justify another package. Browser validates untrusted JSON explicitly.
- Production static serving is included to verify same-origin routing now; no hosting resources or deployment config created. M1 UI is a plain foundation screen, not a storefront design.

## M2 implementation choices

- PostgreSQL 17.9 on loopback port 5434 for persistent development; separate 5435/tmpfs test service. Compose project name `cartiva`, independent of legacy volumes/services.
- Auth base is generated first, with TEXT user IDs; no login routes. Reviewed SQL adds role and case-insensitive email checks without hand-writing a competing auth schema.
- Category/product schema only: no speculative future cart/order tables. Product/category FKs use RESTRICT, and SQL enforces money/stock/version/name/slug/image invariants.
- Zod 4.6.7 validates runtime query/slug input; finite page ceiling 100000, pageSize≤50. Empty results remain empty; no demo fallback. Price is integer MYR sen.
- List/count share a repeatable-read snapshot. Prisma batches categories: observed three SELECTs for either one or 24 returned products. No caching/search engine added for a 26-row synthetic dataset.
- Safe seed updates its fixed fictional IDs only and refuses remote/production targets. Integration runner requires the separate named local `cartiva_test` database before migrating or seeding.
- Node 24 built-in watch with `--import tsx` replaces the stalled tsx watch wrapper on this Windows environment; actual startup and restart were verified. This changes development tooling only.

## M3 implementation choices

- Better Auth/Prisma integration uses existing schema with transaction support; no speculative migration or custom password algorithm.
- Seven-day absolute database sessions, no rolling refresh or cookie cache; current role queried for protected actions. Public signup cannot grant roles. Auth response bodies are library-native; frontend discards returned token fields and stores identity only in memory.
- APP_ORIGIN is exact, production HTTPS required; random local secret setup writes only gitignored .env and never prints it. Auth handler precedes body parsing.
- Only four library auth routes are public. Local admin command updates an existing explicit account and revokes sessions; no seeded credentials/admin feature UI.
- Application CSRF is HMAC-bound to session ID and checks exact Origin/JSON. Middleware is verified with a test fixture; later mutation routes must attach it after session authorization.
- In-memory rate limits use an overwritten socket-peer header. Real proxy-IP policy and multi-instance enforcement are deferred to deployment, with current conservative grouping documented.

## M4 implementation choices

- Database cart ownership comes only from session identity; strict request bodies reject supplied owners/prices. Unique cart/user and cart/product constraints plus cart-first row locks serialize mutations. Product stock is checked under lock, with no reservation. GET uses a repeatable-read snapshot and does not create a cart.
- React owns drafts/feedback; URL owns discovery state; server owns canonical quantities/prices/totals. Runtime JSON is validated; stale reads abort; user-keyed cart components prevent carrying UI state across account changes. No browser cart/token persistence.
- Generated concepts precede implementation; three original category photos are explicitly illustrative and reused for synthetic products. Actual API data supersedes invented concept prices/counts. See DESIGN_NOTES for fidelity and evidence.
- M4 uses existing tooling and browser validation rather than adding a second frontend test runner for markup. Meaningful integer totals, ownership and concurrency checks run against real PostgreSQL.
- Each significant part has a local commit after checks, explanatory notes and verified Obsidian sync. The separately reviewed baseline is `66cc5d0`; backend `a474544`; catalog `6d7a409`; final cart/handoff commit includes this record; use Git log for its hash. No push/deployment.

## M5 implementation choices

Use ten-minute quotes and order-owned retry keys. Keep snapshot data on the order to preserve it after catalog edits. Scope shipping to Malaysia with a five-digit postcode for the demo. Expired quotes are pruned when that customer requests another quote.
