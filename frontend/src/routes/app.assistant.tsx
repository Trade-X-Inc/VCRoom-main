import { createFileRoute } from "@tanstack/react-router";
import { FounderHome } from "./app.index";

// AI Advisor — the founder workstation (chat + readiness cards), moved
// here from /app when the root became the 4-step raise Home (P4).
export const Route = createFileRoute("/app/assistant")({
  component: FounderHome,
});
