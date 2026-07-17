import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "./app.messages";

// R9 relocation — Team Chat (L2 leaf, shared both roles). Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/team-chat")({
  component: WorkspacePage,
});
