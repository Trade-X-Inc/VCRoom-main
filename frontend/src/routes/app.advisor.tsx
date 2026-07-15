import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/advisor")({
  // Renamed to /app/verification — old bookmarks/links keep resolving.
  beforeLoad: () => {
    throw redirect({ to: "/app/verification", replace: true });
  },
});
