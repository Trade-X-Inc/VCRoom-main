import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { bulkSyncUsersToHubSpot } from "@/lib/hubspot";
import { parseBulkSyncInput } from "@/lib/email/policy";
import { verifyAdminKey } from "@/lib/admin-auth";

// Policy F (admin-key operator route). POST only: the x-admin-key request header AND a validated body are both
// required. The body is { users: [...] } with at most 50 rows and strict, validated fields (policy.ts
// parseBulkSyncInput). Nothing is hard-coded here: the 8-address list that used to be in lib/hubspot.ts is gone.
// Opening this URL in a browser does nothing (the page below only explains this). Cache-Control: no-store on every
// response; this triggers real HubSpot writes.
export const runHubspotBulkSync = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as unknown)
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "no-store");
    setResponseHeader("Pragma", "no-cache");

    const cfEnv = (globalThis as any).__cf_env || {};
    const adminKey = cfEnv.ADMIN_SECRET_KEY || "";
    if (!(await verifyAdminKey(adminKey))) return { error: "unauthorized" };

    const parsed = parseBulkSyncInput(data);
    if (!parsed.ok) return { error: "invalid_input" };

    const start = Date.now();
    await bulkSyncUsersToHubSpot(parsed.value.users);
    return { success: true, synced: parsed.value.users.length, ms: Date.now() - start };
  });

export const Route = createFileRoute("/api/hubspot-sync")({
  component: function HubSpotSyncPage() {
    return (
      <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 13, background: "#0a0a0b", color: "#71717a", minHeight: "100vh", margin: 0, whiteSpace: "pre-wrap" }}>
        {"{ \"info\": \"POST only\" }"}
      </pre>
    );
  },
});
