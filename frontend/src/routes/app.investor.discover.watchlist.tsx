import { createFileRoute } from "@tanstack/react-router";
import { StartupsPage } from "./app.investor.startups";

// R9 relocation — Discover › Watchlist. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/investor/discover/watchlist")({
  component: StartupsPage,
});
