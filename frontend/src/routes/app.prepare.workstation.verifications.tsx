import { createFileRoute } from "@tanstack/react-router";
import { VerificationPage } from "./app.verification";

// R9 relocation — Prepare › Workstation › Verifications. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/prepare/workstation/verifications")({
  component: VerificationPage,
});
