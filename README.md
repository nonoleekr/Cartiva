# Cartiva

A full-stack, single-store e-commerce learning project and future internship portfolio application.

**Status: M6 store administration and fulfillment are implemented.** Browse, search/filter/sort/page, product details, signup/sign-in and account-owned cart are connected to PostgreSQL. Signed-in customers can review a quote, place a simulated order and read their order history. Administrators manage products, inventory, categories and fulfillment. Deployment is the next milestone.

The reference repository at `D:/Coding_Projects/simple-ecommerce-cart-system` contains a Java Swing assignment and a later Spring Boot/React modernization. Both are reference material only. Cartiva will be built independently here; no legacy code, runtime data, or assets have been copied.

## Implemented foundation

- Independent npm workspaces: `apps/web` and `apps/api`.
- React Router Home/About/not-found pages, Tailwind styling, and live API connection feedback with retry.
- Express liveness endpoint, validated startup configuration, request IDs and JSON API 404s.
- Development API proxy; production static serving with SPA deep links and a protected API namespace.
- Strict TypeScript, ESLint, API/config smoke tests, production builds and GitHub Actions configuration.

## Implemented catalog foundation (M2)

- Isolated local PostgreSQL development/test services, Prisma client and two reviewed migrations.
- Generated Better Auth base tables with string user IDs; M2 was schema-only, with endpoints added in M3.
- Category/product relationships, SQL constraints, synthetic seed with 26 products (24 active).
- Public active-only product list/detail and categories; server search/category/sort/pagination.
- Database readiness, structured validation errors, real PostgreSQL integration tests and CI database service.
- See [M2 learning guide](docs/MILESTONE_2.md) for schema decisions, commands and verification.

## Implemented authentication (M3)

- Registration/sign-in/sign-out, account page and session restoration after reload.
- Better Auth database sessions, library-owned scrypt hashing and 12–128 character passwords.
- Customer-only signup, fresh database role checks, local admin provisioning with session revocation.
- `/api/v1/me`, session-bound `/api/v1/csrf` and reusable authorization/CSRF middleware.
- Exact origin checks, bounded JSON auth bodies, rate limits and secure production cookie configuration.
- See [M3 learning guide](docs/MILESTONE_3.md). Email verification, recovery and admin screens are not available yet.

## Implemented shopping and cart (M4)

- Responsive catalog/detail pages with URL-backed server search, category, sort and pagination.
- Explicit loading, failure/retry, empty and stock states; illustrative generated sample photos.
- Authenticated persistent cart: merge add, absolute quantity update, remove and current server totals in MYR.
- Ownership, CSRF, strict input bounds, serialized concurrent writes and stock validation; no inventory reservation.
- [M4 guide](docs/MILESTONE_4.md) explains the request flow, trade-offs and recorded checks.

## Planned MVP

- Customer registration, login, and server-side logout.
- Responsive catalog and product pages; server-side search, category filter, sort, pagination.
- Persistent authenticated cart with quantity controls.
- Simulated checkout with shipping details, atomic inventory updates, order snapshots, and duplicate-request protection.
- Customer order history and status.
- Admin-only product/category/inventory management and order status updates.

Wishlist, reviews, advanced filters, sales dashboard, guest carts, marketplace sellers, and real payments are future work.

## Approved stack

React + TypeScript + Vite, Tailwind CSS, React Router; Node.js + Express + TypeScript; PostgreSQL + Prisma; Better Auth with database-backed cookie sessions; Zod; Vitest, React Testing Library, Supertest, and Playwright; npm workspaces and GitHub Actions.

Proposed deployment: one Express service serving the built SPA and API on Render, with PostgreSQL on Neon. This keeps cookies same-origin without requiring a paid custom domain. A Vercel frontend is an alternative once proxy/cookie behavior is verified. Hosting cost and exact compatible versions remain decisions to confirm.

## Start here

1. [Legacy analysis](LEGACY_PROJECT_ANALYSIS.md)
2. [Requirements and MVP boundaries](docs/PROJECT_REQUIREMENTS.md)
3. [System architecture and stack comparison](docs/SYSTEM_ARCHITECTURE.md)
4. [Database design](docs/DATABASE_DESIGN.md)
5. [API design](docs/API_DESIGN.md)
6. [Development roadmap](docs/DEVELOPMENT_ROADMAP.md)
7. [Decision log and approval checklist](docs/DECISIONS.md)

For continuity: [project memory](docs/PROJECT_MEMORY.md), [development log](docs/DEVELOPMENT_LOG.md) and [Obsidian workflow](docs/OBSIDIAN_WORKFLOW.md). The user requested ongoing Obsidian documentation before M4; the vault hub is `D:/Ronald/Documents/obsidian_vault/Projects/Cartiva/Cartiva.md`.

## Local setup

Use Node 24 LTS (24.11.1 or newer within major 24) and npm 11. The checked version file and CI use Node 24.11.1; validation uses npm 11.17.0. Direct dependencies use exact versions and `package-lock.json` pins the complete dependency tree.

```powershell
npm ci
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run auth:setup
npm run dev
```

Open [Cartiva locally](http://127.0.0.1:5173) or [create an account](http://127.0.0.1:5173/sign-up). The home page is the catalog; product deep links and `/cart` are available. Express listens on `127.0.0.1:3001`; Vite forwards `/api` to it. Docker Desktop must be running and unpaused. The development DB binds only `127.0.0.1:5434` with a project-specific persistent volume. Default database credentials are local-only. Prisma client generation runs during `npm ci`. Stop dev servers before reinstalling dependencies on Windows to avoid native file locks.

`auth:setup` generates a random secret in gitignored `apps/api/.env` without printing it; reruns preserve an existing secret. Settings are documented in [apps/api/.env.example](apps/api/.env.example). APP_ORIGIN defaults to exactly `http://127.0.0.1:5173` in development. Use that host consistently; a different port/host requires an explicit matching origin. Production requires DATABASE_URL, a strong BETTER_AUTH_SECRET and HTTPS APP_ORIGIN. If changing API PORT, update the Vite proxy target too.

```powershell
npm run check
```

This runs lint, both workspace typechecks, API/config tests, and both production builds. Separate scripts: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run dev:api`, and `npm run dev:web`. GitHub Actions is configured to run `npm ci` and `npm run check`; no remote CI success is claimed until pushed and run.

Run the database integration checks separately (PowerShell):

```powershell
docker compose --profile test up -d --wait
$env:TEST_DATABASE_URL = 'postgresql://cartiva_test:cartiva_test_only@127.0.0.1:5435/cartiva_test'
npm run test:integration
```

The runner refuses development/remote/production database targets, migrates the isolated `cartiva_test` database and runs real-DB tests. Its test data is disposable (tmpfs), while dev data persists. CI includes the same separate integration command with its own PostgreSQL service. `npm run db:inspect` shows parameterized SQL, query count and EXPLAIN on synthetic local data. Re-running seed updates the known synthetic records; it is not a general database reset and refuses remote/production targets.

Production startup behind an HTTPS reverse proxy (deployment remains M7):

```powershell
npm run build
$env:NODE_ENV = 'production'
$env:DATABASE_URL = 'postgresql://cartiva:cartiva_local_only@127.0.0.1:5434/cartiva_dev'
$env:APP_ORIGIN = 'https://your-public-domain.example'
npm start
```

Replace the example origin/database with the deployment values and configure a production secret securely; never deploy local credentials. The server binds `0.0.0.0` by default in production. Secure cookies require the configured HTTPS public origin, not plain HTTP localhost. For local auth use `npm run dev`. Remove temporary shell overrides before returning to development. The start command loads `apps/api/.env`; shell variables take precedence. Hosted TLS/proxy behavior is still unverified.

Health: `GET /api/v1/health/live` proves the process responds. `GET /api/v1/health/ready` checks DB connectivity. Public catalog: `GET /api/v1/products`, `GET /api/v1/products/sample-item-01`, `GET /api/v1/categories`. M3 enables the four documented auth routes plus `/api/v1/me` and `/api/v1/csrf`; M4 adds owned cart read/add/replace/remove endpoints. M5 adds checkout quotes and owned order endpoints. Missing `/api` routes return JSON 404 even when the browser requests HTML.

For local admin learning, register an account then run `npm run auth:grant-admin -- your-email@example.invalid --confirm`. This only accepts local Cartiva development/test databases, grants the role to an existing user and revokes that user's sessions. Sign in again. No admin credentials are committed or pre-seeded.

Review [M6 learning and verification](docs/MILESTONE_6.md) before M7 release verification.

The M7 release candidate passed local build and database checks, including a checkout and fulfillment smoke test against the compiled application. See the [M7 verification notes](docs/MILESTONE_7.md) and [hosted release runbook](docs/RELEASE_RUNBOOK.md).
