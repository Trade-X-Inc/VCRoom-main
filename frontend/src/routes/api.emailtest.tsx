import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { verifyAdminKey } from "@/lib/admin-auth";

// 11 Oct 2026 — ?key= query-string transport removed, replaced by the
// x-admin-key request header (see src/lib/admin-auth.ts's header
// comment for the full rationale). Zero programmatic callers of this
// route exist anywhere in this repo (confirmed by grep before this
// change) — it is operated manually by whoever holds ADMIN_SECRET_KEY,
// via a tool that can set request headers. The response body below
// deliberately names no auth mechanism. Cache-Control: no-store (+
// Pragma: no-cache) on every response — this route exposes whether
// several secret env vars are set.
const getDiagnostics = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
  setResponseHeader("Pragma", "no-cache");

  try {
    const cfEnv = (globalThis as any).__cf_env || {};
    const expectedKey = cfEnv.ADMIN_SECRET_KEY || "";

    if (!(await verifyAdminKey(expectedKey))) {
      return { error: "unauthorized" };
    }

    const openaiKey = cfEnv.OPENAI_API_KEY || "";
    const resendKey = cfEnv.RESEND_API_KEY || "";
    const supabaseUrl = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "";
    const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";

    const safeKeys = Object.keys(cfEnv).filter(
      (k) =>
        !k.includes("KEY") && !k.includes("SECRET") && !k.includes("TOKEN"),
    );

    return {
      authorized: true,
      cf_keys_safe: safeKeys,
      cf_keys_count: Object.keys(cfEnv).length,
      OPENAI_API_KEY: openaiKey ? "✓ set" : "✗ missing",
      RESEND_API_KEY: resendKey ? "✓ set" : "✗ missing",
      SUPABASE_URL: supabaseUrl ? `✓ set` : "✗ missing",
      SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `✓ set` : "✗ missing",
      note: "Diagnostics only — no email sent. Add &send=1 to run a live Resend test.",
    };
  } catch (err) {
    return { error: String(err), cf_keys: [] };
  }
});

export const Route = createFileRoute("/api/emailtest")({
  loader: () => getDiagnostics(),
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
