# Cartiva

Cartiva is a full-stack e-commerce portfolio demo with a storefront and a separate Admin Portal. Checkout simulates orders in Malaysian ringgit (MYR).

[Live demo](https://cartiva-demo.onrender.com/) · [Admin sign-in](https://cartiva-demo.onrender.com/admin/sign-in) · [Release runbook](docs/RELEASE_RUNBOOK.md)

## Features in this revision

- **Storefront:** browse published products, search, filter by category, sort, and open product details.
- **Accounts and cart:** sign up, sign in, and manage an account-owned cart. The server checks stock and calculates totals.
- **Simulated checkout:** review current prices and stock before placing an order. Customers can opt in to save one Malaysian shipping address. Future checkouts prefill it, and each order keeps its own shipping snapshot. No payment is collected.
- **My Orders:** open order history from the signed-in storefront header. Search by full order ID, filter by fulfillment status, and view purchased items, shipping and totals.
- **Administration:** manage categories, product images and stock. Products start as Draft. The Draft and Active controls show saved visibility separately from the pending selection. Admins can archive products and advance orders through Placed, Processing, Shipped and Delivered.

## Preview

Example local screens with fictional catalog data.

![Cartiva storefront showing category and search controls and sample products](docs/screenshots/storefront.png)

![Cartiva Admin Portal showing product filters, stock and management actions](docs/screenshots/admin-products.png)

## Run locally

Use Node.js 24 (24.11.1 or newer within major 24), npm 11 and Docker Compose. Run these from the repository root:

```powershell
npm ci
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run auth:setup
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Use that exact host so the development session and origin checks match. The dev API listens on port 3001 and Vite proxies API calls. Local PostgreSQL binds to port 5434. Prisma client generation runs during installation. Stop dev processes before reinstalling dependencies on Windows.

The auth setup generates a secret in the ignored local environment file. See [the environment example](apps/api/.env.example). To open the Admin Portal locally, register an account, replace the example email below with that account's email, and run:

```powershell
npm run auth:grant-admin -- your-email@example.invalid --confirm
```

Sign in again and open [local Store administration](http://127.0.0.1:5173/admin). The command works against local Cartiva databases only. Public registration creates a customer account.

## Try the updated workflow

1. In Admin, create a product with positive stock. It starts as Draft. Select **Active**, save, and verify that it appears in the storefront.
2. In a separate customer session, add the product to your cart and place a simulated order with fictional shipping details. Select **Save this address for future orders** if you want the next checkout prefilled.
3. Open **My Orders** from the storefront navigation. Open the order to copy its full ID or check fulfillment. In Admin, advance the order and reload the customer order page to see its new status.
4. Start another checkout to review the prefilled details. Edits apply to the current order. Select the save option again to reuse the edited address later.

## Verification and deployment

```powershell
npm run check
docker compose --profile test up -d --wait
$env:TEST_DATABASE_URL = 'postgresql://cartiva_test:cartiva_test_only@127.0.0.1:5435/cartiva_test'
npm run test:integration
npm run test:release
```

The check command runs lint, type checks, HTTP/config tests and production builds. Integration checks run migrations against isolated PostgreSQL. The release smoke starts the compiled application and checks sessions, checkout, fulfillment, logout and restart persistence. GitHub Actions runs the same gates on a clean checkout.

Render serves the built React application and Express API on one HTTPS origin, with PostgreSQL on Neon. The Render build applies checked-in migrations, including the nullable saved-shipping column. Review the [release runbook](docs/RELEASE_RUNBOOK.md) before deploying. The public demo can take longer to load after inactivity.

## Project notes

- [User testing improvements](docs/USER_TESTING_IMPROVEMENTS.md) and [release notes](docs/USER_TESTING_RELEASE.md)
- [Architecture](docs/SYSTEM_ARCHITECTURE.md) and [database design](docs/DATABASE_DESIGN.md)
- [API contracts](docs/API_DESIGN.md) and [release verification](docs/MILESTONE_7.md)
- [Development log](docs/DEVELOPMENT_LOG.md) and [Obsidian workflow](docs/OBSIDIAN_WORKFLOW.md)
