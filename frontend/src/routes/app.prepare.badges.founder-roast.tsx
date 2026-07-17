import { createFileRoute } from "@tanstack/react-router";
import { RoastManagement } from "./app.roast.index";

// R9 relocation — Prepare › Badges › Founder Roast. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/prepare/badges/founder-roast")({
  component: RoastManagement,
});
