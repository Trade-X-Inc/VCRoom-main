import { createFileRoute, redirect } from "@tanstack/react-router";

// R9: group sections have no page of their own — the bare section URL
// forwards to its first leaf.
export const Route = createFileRoute("/app/investor/discover/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/discover/deal-flow" as any, replace: true });
  },
});
