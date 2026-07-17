import { createFileRoute, redirect } from "@tanstack/react-router";

// R9: the old Go Live hub page dissolved — the L2 section is pure navigation
// now (the swapped L3 sidebar). Its bare URL forwards to the first leaf.
export const Route = createFileRoute("/app/go-live/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/go-live/directory" as any, replace: true });
  },
});
