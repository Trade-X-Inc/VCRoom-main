import { createFileRoute, redirect } from "@tanstack/react-router";

// R9: group sections have no page of their own — the bare section URL
// forwards to its first leaf.
export const Route = createFileRoute("/app/crm/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/crm/connections" as any, replace: true });
  },
});
