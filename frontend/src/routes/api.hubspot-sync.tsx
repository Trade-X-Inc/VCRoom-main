import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { bulkSyncUsersToHubSpot } from "@/lib/hubspot";
import { verifyAdminKey } from "@/lib/admin-auth";

// 11 Oct 2026 — ?key= query-string transport removed, replaced by the
// x-admin-key request header (see src/lib/admin-auth.ts's header
// comment for the full rationale). Zero programmatic callers of this
// route exist anywhere in this repo (confirmed by grep before this
// change) — it is operated manually by whoever holds ADMIN_SECRET_KEY,
// via a tool that can set request headers. The response body below
// deliberately names no auth mechanism. Cache-Control: no-store (+
// Pragma: no-cache) on every response — this route triggers a real
// HubSpot sync and must never be replayed from a cache.
const runSync = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
  setResponseHeader("Pragma", "no-cache");

  const cfEnv = (globalThis as any).__cf_env || {};
  const adminKey = cfEnv.ADMIN_SECRET_KEY || "";
  if (!(await verifyAdminKey(adminKey))) return { error: "unauthorized" };

  const start = Date.now();
  await bulkSyncUsersToHubSpot();
  return { success: true, synced: 8, ms: Date.now() - start };
});

export const Route = createFileRoute("/api/hubspot-sync")({
  loader: () => runSync(),
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
