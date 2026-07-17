import { createFileRoute } from "@tanstack/react-router";
import { Directory } from "./app.directory";

// R9 relocation — Go Live › Directory Dashboard. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/go-live/directory")({
  component: Directory,
});
