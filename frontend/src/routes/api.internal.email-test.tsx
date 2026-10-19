import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates";
import { verifyAdminKey } from "@/lib/admin-auth";

// 11 Oct 2026 — ?key= query-string transport removed, replaced by the
// x-admin-key request header (see src/lib/admin-auth.ts's header
// comment for the full rationale). Zero programmatic callers of this
// route exist anywhere in this repo (confirmed by grep before this
// change) — it is operated manually by whoever holds ADMIN_SECRET_KEY,
// via a tool that can set request headers. The response body below
// deliberately names no auth mechanism. Cache-Control: no-store (+
// Pragma: no-cache) on every response — this route triggers a real
// Resend send and must never be replayed from a cache.
const runEmailTest = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "no-store");
  setResponseHeader("Pragma", "no-cache");

  const expected = getEnvVar("ADMIN_SECRET_KEY");
  if (!(await verifyAdminKey(expected))) {
    return { error: "unauthorized", authorized: false };
  }

  const apiKey = getEnvVar("RESEND_API_KEY");
  const supabaseUrl =
    getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
  const hasServiceKey = !!getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey) {
    return {
      authorized: true,
      success: false,
      error: "RESEND_API_KEY not found",
      hint: "Add RESEND_API_KEY to Cloudflare Pages → Settings → Environment variables (Secret)",
      env: {
        RESEND_API_KEY: "✗ missing",
        SUPABASE_URL: supabaseUrl ? "✓ set" : "✗ missing",
        SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? "✓ set" : "✗ missing",
      },
    };
  }

  const { subject, html } = welcomeEmail({
    name: "Test User",
    role: "founder",
  });
  const result = await sendEmail({
    to: "hello@lengdon.com",
    subject: "[TEST] " + subject,
    html,
    tags: [{ name: "type", value: "test" }],
  });

  return {
    authorized: true,
    success: !!result,
    email_id: result?.id ?? null,
    env: {
      RESEND_API_KEY: "✓ set",
      SUPABASE_URL: supabaseUrl ? "✓ set" : "✗ missing",
      SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? "✓ set" : "✗ missing",
    },
  };
});

export const Route = createFileRoute("/api/internal/email-test")({
  loader: () => runEmailTest(),
  component: function InternalEmailTestPage() {
    const data = Route.useLoaderData();
    return (
      <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 14, background: "#0a0a0b", color: (data as any).authorized === false ? "#ef4444" : "#4ade80", minHeight: "100vh", margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  },
});
