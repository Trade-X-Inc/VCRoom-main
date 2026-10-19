import { createFileRoute } from "@tanstack/react-router";

// The server function that used to live here (handleNewsletter) accepted any address from anyone and wrote it to
// HubSpot. It had no callers and is removed; the footer newsletter now goes through submitWaitlistForm in
// lib/public-forms-fn.ts (strict validation, fixed property allow-list). CLAUDE.md §20.23.
export const Route = createFileRoute("/api/hubspot-newsletter")({
  component: () => null,
});
