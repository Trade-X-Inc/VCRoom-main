import { createFileRoute } from "@tanstack/react-router";
import { InvestorChat } from "./app.investor.index";

// AI Advisor — the investor chat, relocated from /app/investor (P5).
export const Route = createFileRoute("/app/investor/assistant")({
  component: InvestorChat,
});
