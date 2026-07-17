import { createFileRoute } from "@tanstack/react-router";
import { BadgesPage } from "./app.badges";

// R9 relocation — Prepare › Badges › Badge Overview & Guide. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/prepare/badges/overview")({
  component: BadgesPage,
});
