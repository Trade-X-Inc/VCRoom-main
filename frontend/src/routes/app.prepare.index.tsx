import { createFileRoute, redirect } from "@tanstack/react-router";

// R9: the old Prepare hub page dissolved — the L2 section is pure navigation
// now (the swapped L3 sidebar). Its bare URL forwards to the first leaf.
export const Route = createFileRoute("/app/prepare/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/prepare/profile-builder/quick-setup" as any, replace: true });
  },
});
