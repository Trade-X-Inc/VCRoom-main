import { createFileRoute } from "@tanstack/react-router";
import { PortfolioPage } from "./app.investor.portfolio";

// R9 relocation — Deal Rooms › Portfolio. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/investor/deal-rooms/portfolio")({
  component: PortfolioPage,
});
