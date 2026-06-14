import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmail } from "@/lib/email/templates";

const runEmailTest = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => d as { key: string })
  .handler(async ({ data }) => {
    const expected = getEnvVar("ADMIN_SECRET_KEY");
    if (!expected || data.key !== expected) {
      return { error: "Unauthorized — pass ?key=YOUR_ADMIN_KEY", authorized: false };
    }

    const apiKey = getEnvVar("RESEND_API_KEY");
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
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

    const { subject, html } = welcomeEmail({ name: "Test User", role: "founder" });
    const result = await sendEmail({
      to: "hello@hockystick.app",
      subject: "[TEST] " + subject,
      html,
      tags: [{ name: "type", value: "test" }],
    });

    return {
      authorized: true,
      success: !!result,
      email_id: result?.id ?? null,
      key_prefix: apiKey.slice(0, 8) + "...",
      env: {
        RESEND_API_KEY: "✓ set (" + apiKey.slice(0, 8) + "...)",
        SUPABASE_URL: supabaseUrl ? "✓ set" : "✗ missing",
        SUPABASE_SERVICE_ROLE_KEY: hasServiceKey ? "✓ set" : "✗ missing",
      },
    };
  });

export const Route = createFileRoute("/api/internal/email-test")({
  validateSearch: (s: Record<string, unknown>) => ({ key: String(s.key ?? "") }),
  loader: ({ search }) => runEmailTest({ data: { key: search.key } }),
  component: function InternalEmailTestPage() {
    const data = Route.useLoaderData();
    return (
      <pre style={{ padding: 24, fontFamily: "monospace", fontSize: 14, background: "#0a0a0b", color: (data as any).authorized === false ? "#ef4444" : "#4ade80", minHeight: "100vh", margin: 0, whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  },
});
