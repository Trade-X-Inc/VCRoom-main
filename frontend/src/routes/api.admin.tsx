import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const fetchAdminData = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => d as { key?: string })
  .handler(async ({ data }) => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const expectedKey = cfEnv.ADMIN_SECRET_KEY || "";

    if (!expectedKey || data.key !== expectedKey) {
      return { error: "unauthorized", hint: "pass ?key=YOUR_ADMIN_KEY" };
    }

    const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "";
    const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!url || !serviceKey) {
      return { error: "Supabase service role not configured", url: !!url, serviceKey: !!serviceKey };
    }

    const sb = createClient(url, serviceKey);
    const [feedbackRes, waitlistRes, emailEventsRes] = await Promise.all([
      sb.from("feedback").select("*").order("created_at", { ascending: false }).limit(100),
      sb.from("waitlist_entries").select("*").order("created_at", { ascending: false }).limit(100),
      sb.from("email_events").select("*").order("created_at", { ascending: false }).limit(50),
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
  validateSearch: (s: Record<string, unknown>) => ({ key: String(s.key ?? "") }),
  loader: ({ search }) => fetchAdminData({ data: { key: search.key } }),
  component: function AdminPage() {
    const data = Route.useLoaderData() as any;
    return (
      <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 13, background: "#0a0a0b", color: data.error === "unauthorized" ? "#ef4444" : "#4ade80", minHeight: "100vh", margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  },
});
