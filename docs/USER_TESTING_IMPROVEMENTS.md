# User testing improvements

## Publication and navigation

The Draft and Active controls select a pending change. The status message describes the last saved visibility and explains the effect of saving. New products remain drafts, and the existing server stock/version checks still decide whether publication succeeds. My Orders now lives in the signed-in storefront navigation and stays selected on order detail.

## Customer orders

The customer list retains its original page contract and adds itemCount, exact order ID search and fulfillment filtering. Both list and detail retain the session owner predicate. Counts sum purchased quantities from immutable line snapshots. The new responsive table reuses shared pagination, and detail presents shipping and a simulated payment breakdown. Type checks and all 48 PostgreSQL tests passed, including full-ID lookup scoped to the owner.
