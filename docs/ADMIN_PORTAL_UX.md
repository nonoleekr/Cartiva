# Admin portal polish before deployment

The portal now has a separate navy and blue shell, dedicated sign-in and registration, and an overview with live order counts. Registration uses the existing customer account workflow. The operator grants admin access separately, and every admin API request still checks the database role.

The products and orders pages apply filters to database results before pagination. Products include images, category names, price, stock and archive actions. Orders include store-wide counts by status even when the table is filtered. Search matches a full order ID or a recipient name. Pages share one pagination control with the customer catalog.

Create and edit share a fixed-ratio image preview, with a placeholder for blank input and feedback for invalid paths or failed loads. A same-origin asset URL is saved as its relative path. External images remain outside the current catalog contract. The form and API enforce the database price bounds. The rest of the storefront retains its existing layout, with shared link interaction and pagination styles.

Chromium walkthrough verified registration, role denial, failed and successful sign-in, keyboard skip navigation, product filters, first and last pagination boundaries, valid/empty/invalid/missing previews, draft creation, archive, order search and fulfillment. Product, order and editor layouts were checked at 1440, 768 and 375 px. The walkthrough reported no uncaught page exceptions. Synthetic records created by the walkthrough were removed. Desktop product, tablet order and mobile editor screenshots are linked from the Obsidian project hub.
