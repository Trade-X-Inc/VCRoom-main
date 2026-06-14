import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { upsertHubSpotContact } from "@/lib/hubspot";

const handleNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { email: string })
  .handler(async ({ data }) => {
    if (!data.email) return { error: "No email" };
    console.log("[HubSpot Newsletter] called for:", data.email);
    await upsertHubSpotContact(data.email.trim().toLowerCase(), {
      lifecyclestage: "subscriber",
      hs_lead_status: "NEW",
    });
    return { ok: true };
  });

export const Route = createFileRoute("/api/hubspot-newsletter")({
  component: () => null,
});

export { handleNewsletter };
