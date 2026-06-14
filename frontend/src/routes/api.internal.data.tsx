import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

const getInternalData = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => d as { key: string })
  .handler(async ({ data }) => {
    const expected = getEnvVar("ADMIN_SECRET_KEY");
    if (!expected || data.key !== expected) {
      return { error: "Unauthorized — pass ?key=YOUR_ADMIN_KEY", authorized: false };
    }

    const url = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !key) {
      return { authorized: true, error: "Supabase service role not configured" };
    }

    const sb = createClient(url, key);
    const [feedbackRes, waitlistRes, emailEventsRes] = await Promise.all([
      sb.from("feedback").select("*").order("created_at", { ascending: false }).limit(100),
      sb.from("waitlist_entries").select("*").order("created_at", { ascending: false }).limit(100),
      sb.from("email_events").select("*").order("created_at", { ascending: false }).limit(50),
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
  validateSearch: (s: Record<string, unknown>) => ({ key: String(s.key ?? "") }),
  loader: ({ search }) => getInternalData({ data: { key: search.key } }),
  component: function InternalDataPage() {
    const data = Route.useLoaderData();
    return (
      <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 14, background: "#0a0a0b", color: (data as any).authorized === false ? "#ef4444" : "#4ade80", minHeight: "100vh", margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  },
});
