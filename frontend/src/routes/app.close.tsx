import { createFileRoute, redirect } from "@tanstack/react-router";

// R9: confirmed orphan — no content of its own (a rooms-at-closing link
// list); per-room closing lives at /deal-rooms/:id/close (R3). Deleted per
// user decision, redirecting instead of resurrecting as /reports.
export const Route = createFileRoute("/app/close")({
  beforeLoad: () => {
    throw redirect({ to: "/app/deal-rooms", replace: true });
  },
});
