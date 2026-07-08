import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This is unconditioned scheduled infrastructure (Supabase Edge Function
// cron), not an AI-agent-callable tool — same category as daily-nudge-cron.
// No confirm-first gate applies (see CLAUDE.md Section 3, which frames that
// rule around user/agent-initiated actions, not system-scheduled jobs).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Email helpers (mirror of daily-nudge-cron) ────────────────────────────────

function buildLayout(content: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hockystick</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;color:#09090b;margin:0;padding:0;">
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ""}
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:#0a0a0b;padding:28px 32px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
        Hocky<span style="color:#7c3aed;">stick</span>
      </div>
      <div style="color:#a1a1aa;font-size:12px;margin-top:4px;">Where deals get done</div>
    </div>
    <div style="padding:32px;">${content}</div>
    <div style="padding:24px 32px;text-align:center;background:#fafafa;border-top:1px solid #e4e4e7;">
      <p style="color:#71717a;font-size:12px;line-height:1.6;">
        Hockystick · <a href="https://hockystick.app" style="color:#7c3aed;">hockystick.app</a>
      </p>
    </div>
  </div>
</div>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("[profile-gate-nudge-cron] RESEND_API_KEY not set");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Hockystick <noreply@hockystick.app>",
      to: [to],
      subject,
      html,
      reply_to: "hello@hockystick.app",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[profile-gate-nudge-cron] Resend error:", res.status, body);
    return false;
  }
  return true;
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let nudge48hSent = 0;
    let nudge7dSent = 0;

    // ── Nudge A: 48h after signup, setup still incomplete ──────────────────────

    const { data: incomplete48h, error: err48h } = await admin
      .from("onboarding_progress")
      .select("id, user_id, current_step, steps, created_at")
      .eq("account_type", "founder")
      .neq("current_step", "done")
      .lt("created_at", fortyEightHoursAgo);

    if (err48h) {
      console.error("[profile-gate-nudge-cron] 48h query error:", err48h);
    }

    for (const row of incomplete48h ?? []) {
      const steps = (row.steps ?? {}) as Record<string, boolean>;
      if (steps.nudge_48h_sent) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const html = buildLayout(`
        <h1 style="font-size:24px;font-weight:700;color:#09090b;margin-bottom:12px;">
          Your Hockystick setup is incomplete
        </h1>
        <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin-bottom:16px;">
          You started setting up Hockystick but haven't finished. It takes 5 more minutes.
        </p>
        <div style="text-align:center;margin-top:24px;">
          <a href="https://hockystick.app/app" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
            Continue setup →
          </a>
        </div>
        <div style="height:1px;background:#e4e4e7;margin:32px 0;"></div>
        <p style="color:#a1a1aa;font-size:12px;line-height:1.6;">
          You are receiving this because you started setting up an account on Hockystick.
          <a href="https://hockystick.app/app/settings" style="color:#7c3aed;">Manage notifications</a>
        </p>
      `, "Your Hockystick setup is incomplete");

      const ok = await sendEmail(email, "Your Hockystick setup is incomplete", html);
      if (ok) {
        await admin
          .from("onboarding_progress")
          .update({ steps: { ...steps, nudge_48h_sent: true } })
          .eq("id", row.id);
        nudge48hSent++;
        console.log(`[profile-gate-nudge-cron] 48h nudge sent to founder ${row.user_id}`);
      }
    }

    // ── Nudge B: 7d after signup, zero documents uploaded ───────────────────────

    const { data: incomplete7d, error: err7d } = await admin
      .from("onboarding_progress")
      .select("id, user_id, created_at, steps")
      .eq("account_type", "founder")
      .lt("created_at", sevenDaysAgo);

    if (err7d) {
      console.error("[profile-gate-nudge-cron] 7d query error:", err7d);
    }

    for (const row of incomplete7d ?? []) {
      const steps = (row.steps ?? {}) as Record<string, boolean>;
      if (steps.nudge_7d_sent) continue;

      const { data: startup } = await admin
        .from("startups")
        .select("id")
        .eq("founder_id", row.user_id)
        .maybeSingle();

      if (!startup?.id) continue;

      const { count } = await admin
        .from("founder_documents")
        .select("id", { count: "exact", head: true })
        .eq("startup_id", startup.id);

      if ((count ?? 0) > 0) {
        // Has documents — mark as handled so we don't re-check indefinitely.
        await admin
          .from("onboarding_progress")
          .update({ steps: { ...steps, nudge_7d_sent: true } })
          .eq("id", row.id);
        continue;
      }

      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const html = buildLayout(`
        <h1 style="font-size:24px;font-weight:700;color:#09090b;margin-bottom:12px;">
          Investors can't evaluate your deal yet
        </h1>
        <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin-bottom:16px;">
          Your deal room has no documents. Investors need at least a pitch deck to take you seriously.
        </p>
        <div style="text-align:center;margin-top:24px;">
          <a href="https://hockystick.app/app/documents" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
            Upload now →
          </a>
        </div>
        <div style="height:1px;background:#e4e4e7;margin:32px 0;"></div>
        <p style="color:#a1a1aa;font-size:12px;line-height:1.6;">
          You are receiving this because you have an account on Hockystick.
          <a href="https://hockystick.app/app/settings" style="color:#7c3aed;">Manage notifications</a>
        </p>
      `, "Investors can't evaluate your deal yet");

      const ok = await sendEmail(email, "Investors can't evaluate your deal yet", html);
      if (ok) {
        await admin
          .from("onboarding_progress")
          .update({ steps: { ...steps, nudge_7d_sent: true } })
          .eq("id", row.id);
        nudge7dSent++;
        console.log(`[profile-gate-nudge-cron] 7d nudge sent to founder ${row.user_id}`);
      }
    }

    const result = { nudge48hSent, nudge7dSent };
    console.log("[profile-gate-nudge-cron] Done:", result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[profile-gate-nudge-cron] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
