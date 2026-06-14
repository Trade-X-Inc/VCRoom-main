import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getDiagnostics = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => d as { key?: string })
  .handler(async ({ data }) => {
    try {
      const cfEnv = (globalThis as any).__cf_env || {};
      const expectedKey = cfEnv.ADMIN_SECRET_KEY || "";

      if (!expectedKey || data.key !== expectedKey) {
        return { error: "unauthorized", hint: "pass ?key=YOUR_ADMIN_KEY" };
      }

      const openaiKey = cfEnv.OPENAI_API_KEY || "";
      const resendKey = cfEnv.RESEND_API_KEY || "";
      const supabaseUrl = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "";
      const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";

      const safeKeys = Object.keys(cfEnv).filter(
        (k) => !k.includes("KEY") && !k.includes("SECRET") && !k.includes("TOKEN")
      );

      return {
        authorized: true,
        cf_keys_safe: safeKeys,
        cf_keys_count: Object.keys(cfEnv).length,
        OPENAI_API_KEY: openaiKey ? `✓ set (${openaiKey.slice(0, 8)}...)` : "✗ missing",
        RESEND_API_KEY: resendKey ? `✓ set (${resendKey.slice(0, 6)}...)` : "✗ missing",
        SUPABASE_URL: supabaseUrl ? `✓ set` : "✗ missing",
        SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `✓ set` : "✗ missing",
        note: "Diagnostics only — no email sent. Add &send=1 to run a live Resend test.",
      };
    } catch (err) {
      return { error: String(err), cf_keys: [] };
    }
  });

export const Route = createFileRoute("/api/emailtest")({
  validateSearch: (s: Record<string, unknown>) => ({ key: String(s.key ?? "") }),
  loader: ({ search }) => getDiagnostics({ data: { key: search.key } }),
  component: function EmailTestPage() {
    const data = Route.useLoaderData() as any;
    const isUnauth = data.error === "unauthorized";
    const hasError = !!data.error;
    const color = isUnauth ? "#ef4444" : hasError ? "#facc15" : "#4ade80";
    return (
      <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 13, background: "#0a0a0b", color, minHeight: "100vh", margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  },
});
