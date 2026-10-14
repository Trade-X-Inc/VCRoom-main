import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminKey } from "@/lib/admin-auth";

// 11 Oct 2026 — ?key= query-string transport removed, replaced by the
// x-admin-key request header (see src/lib/admin-auth.ts's header
// comment for the full rationale). Zero programmatic callers of this
// route exist anywhere in this repo (confirmed by grep before this
// change) — it is operated manually by whoever holds ADMIN_SECRET_KEY,
// via a tool that can set request headers. The response body below
// deliberately names no auth mechanism — an unauthorized caller should
// learn nothing about how this route is gated, only that it is.
// Cache-Control: no-store (+ Pragma: no-cache for older HTTP/1.0
// intermediaries) on every response, success or not, since this route
// returns real production data (feedback/waitlist/email_events) that
// must never be served from a shared/edge cache.
const fetchAdminData = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
  setResponseHeader("Pragma", "no-cache");

  const cfEnv = (globalThis as any).__cf_env || {};
  const expectedKey = cfEnv.ADMIN_SECRET_KEY || "";

  if (!(await verifyAdminKey(expectedKey))) {
    return { error: "unauthorized" };
  }

  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "";
  const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceKey) {
    return {
      error: "Supabase service role not configured",
      url: !!url,
      serviceKey: !!serviceKey,
    };
  }

  const sb = createClient(url, serviceKey);
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

export const Route = createFileRoute("/api/admin")({
  loader: () => fetchAdminData(),
  component: function AdminPage() {
    const data = Route.useLoaderData() as any;
    return (
      <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 13, background: "#0a0a0b", color: data.error === "unauthorized" ? "#ef4444" : "#4ade80", minHeight: "100vh", margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  },
});
