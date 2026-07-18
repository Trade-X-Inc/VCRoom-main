import { createFileRoute, redirect } from "@tanstack/react-router";

// R14 — consolidated into /app/investor/analytics. This page duplicated
// the same investor_watchlist conversion/source data with a different
// (and Constitution-violating — pie/donut charts, banned per §9.8) chart
// style, with no cross-link between the two. Its useful additions
// (source performance, days-in-stage) were folded into the main page as
// CSV-exportable tables rather than losing them in the consolidation.
export const Route = createFileRoute("/app/investor/crm/analytics")({
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/analytics" as any, replace: true });
  },
});
