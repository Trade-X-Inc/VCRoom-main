import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";
import { verifyAdminKey } from "@/lib/admin-auth";

// 11 Oct 2026 — ?key= query-string transport removed, replaced by the
// x-admin-key request header (see src/lib/admin-auth.ts's header
// comment for the full rationale). Zero programmatic callers of this
// route exist anywhere in this repo (confirmed by grep before this
// change) — it is operated manually by whoever holds ADMIN_SECRET_KEY,
// via a tool that can set request headers. The response body below
// deliberately names no auth mechanism. Cache-Control: no-store (+
// Pragma: no-cache) on every response — this route returns real
// production data (feedback/waitlist/email_events).
const getInternalData = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
  setResponseHeader("Pragma", "no-cache");

  const expected = getEnvVar("ADMIN_SECRET_KEY");
  if (!(await verifyAdminKey(expected))) {
    return { error: "unauthorized", authorized: false };
  }

  const url = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
  const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    return { authorized: true, error: "Supabase service role not configured" };
  }

  const sb = createClient(url, key);
  const [feedbackRes, waitlistRes, emailEventsRes] = await Promise.all([
    sb
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    sb
      .from("waitlist_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    sb
      .from("email_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return {
    authorized: true,
    counts: {
      feedback: feedbackRes.data?.length ?? 0,
      waitlist: waitlistRes.data?.length ?? 0,
      email_events: emailEventsRes.data?.length ?? 0,
    },
    feedback: feedbackRes.data ?? [],
    waitlist: waitlistRes.data ?? [],
    email_events: emailEventsRes.data ?? [],
  };
});

export const Route = createFileRoute("/api/internal/data")({
  loader: () => getInternalData(),
  component: function InternalDataPage() {
    const data = Route.useLoaderData();
    return (
      <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 14, background: "#0a0a0b", color: (data as any).authorized === false ? "#ef4444" : "#4ade80", minHeight: "100vh", margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  },
});
