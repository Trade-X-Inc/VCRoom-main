import { createFileRoute } from "@tanstack/react-router";

// Placeholder stub, 1 Sep 2026 — exists only so Deals hub §1's sector-card
// links resolve under TanStack's typed router (a route must exist for
// `to="/deals-preview/$sector"` to type-check). Real content is Deals hub
// §2 (filtered list view: Active/Closed/In Progress/Pending Action tabs),
// built as its own separately-reported section per the build order — not
// yet built as of this commit. Do not treat this file as §2's
// implementation.

export const Route = createFileRoute("/deals-preview/$sector")({
  component: () => null,
});
