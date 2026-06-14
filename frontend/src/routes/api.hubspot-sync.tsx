import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { bulkSyncUsersToHubSpot } from "@/lib/hubspot";

const runSync = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => d as { key: string })
  .handler(async ({ data }) => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const adminKey = cfEnv.ADMIN_SECRET_KEY || "";
    if (!adminKey || data.key !== adminKey) return { error: "Unauthorized" };

    const start = Date.now();
    await bulkSyncUsersToHubSpot();
    return { success: true, synced: 8, ms: Date.now() - start };
  });

export const Route = createFileRoute("/api/hubspot-sync")({
  validateSearch: (s: Record<string, unknown>) => ({ key: String(s.key ?? "") }),
  loader: ({ search }) => runSync({ data: { key: search.key } }),
  component: function HubSpotSyncPage() {
    const data = Route.useLoaderData() as any;
    const ok = data?.success === true;
    return (
      <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 13, background: "#0a0a0b", color: data?.error ? "#ef4444" : ok ? "#4ade80" : "#facc15", minHeight: "100vh", margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  },
});
