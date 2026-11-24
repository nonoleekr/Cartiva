# M4 visual design and asset record

The frontend-builder, imagegen, React and frontend-testing skills are used for M4. Browser plugin is unavailable; validation uses Playwright Chromium. This note records the design direction and intentional data-driven differences; final UI validation remains in [M4 record](MILESTONE_4.md).

## Concept and implementation inventory

[Generated catalog concept](design/m4-catalog-concept.png) is a visual reference, not a screenshot shipped as UI. The actual UI is semantic React/Tailwind: white background, deep green #064e3b/#022c22, stone-grey dividers, Segoe UI/Arial, text brand, open product tiles without shadows, labelled search/category/sort, four desktop/two mobile columns, product/detail links and pagination. Product detail uses a responsive image/content layout; cart uses accessible rows and a clear server subtotal.

Allowed catalog copy: Cartiva, Shop, Cart, Account/Sign in (session-dependent), “Find your everyday essentials.”, “Explore our sample collection for desk, home and travel.”, Search products, Category, Sort by, stock labels, Add to cart, Previous/Next and page state. Product names, prices, quantities and counts come only from API responses. Footer discloses the learning project and illustrative images. No ratings, promotions, fake metrics, wishlist, payment or checkout control.

Core tokens: headline 40px/48px desktop and 30px mobile; UI labels 14px, product titles 16px/20px, body 16–18px. Content max width 1200px inside responsive gutters. Media frame 12:7 on catalog, 4:3 on detail. Buttons use green fill, white text, visible focus and disabled state. Image treatment is neutral studio photography, no overlays/tints. Controls and text remain code-native.

## Intentional differences from concept

- Real “newest” ordering shows the seeded product 25 first, not the concept's invented ordering/prices. Default page size eight means **24 real active products / three pages**, not the mockup's inconsistent two-page label.
- Three standalone illustrative category photos are reused for the fictional seed records, rather than suggesting eight distinct real goods. Description/footer disclose synthetic/sample imagery.
- An explicit Search button supports keyboard/form submission. Session-dependent Account/Sign in and availability/disabled actions reflect actual state.
- Cart/Add controls were connected in the cart-UI checkpoint; the intermediate catalog commit exposed browse/detail only. Cart adds Refresh cart, inline mutation feedback and explicit checkout-unavailable copy. Its screenshot uses actual product25/three units rather than invented concept lines/totals. Desktop uses the shared 1200px content width, smaller 144px thumbnails and a labelled quantity above the input; mobile stacks rows/summary.

## Built-in generation prompt set

Tool: built-in image generation (no CLI/API key). Concept prompt: polished full desktop 1440×1000 Cartiva catalog, true white/deep green, max-width content, text brand and Shop/Cart/Account navigation; exact headline/support copy above; labelled search/category/sort, product count, open four-column product grid, synthetic products with MYR prices/stock/Add to cart, second-row continuation and pagination/footer. No marketing hero badge, invented commerce features, metrics, browser chrome or screenshot-as-UI. Require separable product photos and implementable Tailwind/native text/controls.

Shared asset prompt: “Use case: product-mockup. Standalone photographic asset for Cartiva's synthetic educational catalog, matching its white/deep-green restrained design. [SUBJECT] Centered entire object, three-quarter studio product photograph, rectangular landscape 4:3 composition with generous negative space around subject. Seamless light neutral grey background (#eeeeec), soft daylight, delicate contact shadow, real material detail. No text, letters, watermark, brand, border, props or UI. This will be reused as clearly disclosed sample imagery for fictional [CATEGORY] products.”

Subjects/categories:

- desk: “A pair of simple kraft-paper spiral notebooks, one slightly offset atop the other.”
- home: “A single matte ivory ceramic mug, rounded handle, no markings.”
- travel: “A single natural beige canvas zip pouch standing upright, unbranded.”

Final project asset paths: `apps/web/public/assets/sample-desk.png`, `sample-home.png`, `sample-travel.png`; concept saved at `docs/design/m4-catalog-concept.png`. Originals remain in Codex generated_images. No legacy assets or images were copied. No real products/sales are claimed.

## Verification ledger

Intermediate catalog browser checks: actual 24-product response, URL-backed text search, combined category/price sort, reload persistence, product deep link and visible empty result verified. Lint/type/build and 23 HTTP/config tests passed. Native concept and browser screenshot inspected; spacing/media refinements made to match the open layout. Final catalog and cart screenshots were explicitly inspected alongside the saved concepts. White/green palette, open grid, media proportions, text hierarchy, dividers and two-column cart/summary are retained; the data/layout deviations above are intentional. At 375px, filters stack, catalog uses two columns and cart rows/summary stack without horizontal overflow. Product desktop/mobile screenshots were also captured.

## Cart concept and final evidence

[Generated cart concept](design/m4-cart-concept.png). Prompt: polished desktop Cartiva cart matching the catalog's true-white/deep-green typography, Shop/Cart/Account header, Your cart title and review copy; two-column main rows and bordered subtotal; standalone notebook/mug photos, product links, quantities, Update/Remove and Continue shopping; disclose no inventory reservation; no checkout/payment control or invented extra features. Semantic React implements all controls; the concept is a reference image only.

Final screenshot filenames (archived by the allowlisted Obsidian sync): `m4-catalog-desktop.png`, `m4-catalog-mobile.png`, `m4-product-desktop.png`, `m4-product-mobile.png`, `m4-cart-desktop.png`, `m4-cart-mobile.png`. Desktop 1440×1000; mobile 375×812. Browser cases and limitations are in the M4 guide. Original category assets are generated imagery, not actual merchandise.
