import { createFileRoute } from "@tanstack/react-router";
import { ClaimsPage } from "./app.claims";

// R9 relocation — Prepare › Workstation › Claims. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/prepare/workstation/claims")({
  component: ClaimsPage,
});
