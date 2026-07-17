import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "./app.audit";

// R9 relocation — Settings › Activity tab. Same component and behavior, new
// home; the old /app/audit route redirects here.
export const Route = createFileRoute("/app/settings/activity")({
  component: AuditPage,
});
