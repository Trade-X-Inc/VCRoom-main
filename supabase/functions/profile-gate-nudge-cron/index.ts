import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sourced from shared/investor-required-fields.json — single canonical list, do not add fields here.
const INVESTOR_REQUIRED_KEYS = [
  "fund_name", "your_name", "thesis", "sectors",
  "stages", "check_size_min", "check_size_max", "geography",
];

function isInvestorComplete(profile: Record<string, unknown>): boolean {
  return INVESTOR_REQUIRED_KEYS.every((k) => profile[k] && profile[k] !== "");
}

function investorPercent(profile: Record<string, unknown>): number {
  const filled = INVESTOR_REQUIRED_KEYS.filter((k) => profile[k] && profile[k] !== "").length;
  return Math.round((filled / INVESTOR_REQUIRED_KEYS.length) * 100);
}

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

    let foundersNudged = 0;
    let investorsNudged = 0;

    // ── FOUNDER SIDE ──────────────────────────────────────────────────────────

    const { data: incompleteFounders, error: founderErr } = await admin
      .from("profile_builder_sessions")
      .select(`
        id, startup_id, path, status, missing_fields,
        nudge_count, nudge_sent_at, last_active_at,
        startups!startup_id ( company_name, founder_id )
      `)
      .neq("status", "confirmed")
      .lt("last_active_at", fortyEightHoursAgo)
      .lt("nudge_count", 2);

    if (founderErr) {
      console.error("[profile-gate-nudge-cron] founder query error:", founderErr);
    }

    for (const session of incompleteFounders ?? []) {
      const founderId = (session.startups as any)?.founder_id;
      if (!founderId) continue;

      const lastActive = session.last_active_at
        ? new Date(session.last_active_at)
        : new Date(0);
      const hoursSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);
      const nudgeCount = session.nudge_count ?? 0;
      const companyName: string = (session.startups as any)?.company_name ?? "your startup";

      if (nudgeCount === 0 && hoursSinceActive >= 48) {
        // First nudge: in-app notification only
        await admin.from("notifications").insert({
          user_id: founderId,
          type: "profile_incomplete",
          title: "Finish your profile",
          body: "You left your profile partway through. Pick up where you stopped.",
          link: "/app/profile-builder",
        });
        await admin
          .from("profile_builder_sessions")
          .update({ nudge_count: 1, nudge_sent_at: new Date().toISOString() })
          .eq("id", session.id);
        foundersNudged++;
        console.log(`[profile-gate-nudge-cron] In-app nudge sent to founder ${founderId}`);

      } else if (
        nudgeCount === 1 &&
        hoursSinceActive >= 24 * 7 &&
        session.nudge_sent_at &&
        new Date(session.nudge_sent_at) < new Date(sevenDaysAgo)
      ) {
        // Second nudge: email
        const { data: authUser } = await admin.auth.admin.getUserById(founderId);
        const email = authUser?.user?.email;
        if (!email) continue;

        const pathLabel = session.path === "upload" ? "document upload" : "interview";

        const html = buildLayout(`
          <h1 style="font-size:24px;font-weight:700;color:#09090b;margin-bottom:12px;">
            Your profile is still waiting
          </h1>
          <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin-bottom:16px;">
            You started building your ${companyName} profile on Hockystick using the ${pathLabel} path, but didn't finish.
            It takes about 10 minutes and is the only thing standing between you and getting discovered by verified investors.
          </p>
          <div style="background:#f5f3ff;border-left:3px solid #7c3aed;padding:12px 16px;border-radius:0 6px 6px 0;margin:20px 0;">
            <p style="margin:0;color:#4c1d95;font-weight:500;font-size:14px;">
              Founders with complete profiles get 3× more investor discovery requests.
            </p>
          </div>
          <div style="text-align:center;margin-top:24px;">
            <a href="https://hockystick.app/app/profile-builder" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
              Finish my profile →
            </a>
          </div>
          <div style="height:1px;background:#e4e4e7;margin:32px 0;"></div>
          <p style="color:#a1a1aa;font-size:12px;line-height:1.6;">
            You are receiving this because you started a profile on Hockystick.
            <a href="https://hockystick.app/app/settings" style="color:#7c3aed;">Manage notifications</a>
          </p>
        `, "Your Hockystick profile is still incomplete");

        const ok = await sendEmail(email, "Your Hockystick profile is still incomplete", html);
        if (ok) {
          await admin
            .from("profile_builder_sessions")
            .update({ nudge_count: 2, nudge_sent_at: new Date().toISOString() })
            .eq("id", session.id);
          foundersNudged++;
          console.log(`[profile-gate-nudge-cron] Email nudge sent to founder ${founderId}`);
        }
      }
    }

    // ── INVESTOR SIDE ─────────────────────────────────────────────────────────

    const { data: incompleteInvestors, error: investorErr } = await admin
      .from("investor_profiles")
      .select("*")
      .lt("last_active_at", fortyEightHoursAgo)
      .lt("nudge_count", 2);

    if (investorErr) {
      console.error("[profile-gate-nudge-cron] investor query error:", investorErr);
    }

    for (const profile of incompleteInvestors ?? []) {
      if (isInvestorComplete(profile)) continue;

      const investorId: string = profile.user_id;
      if (!investorId) continue;

      const lastActive = profile.last_active_at
        ? new Date(profile.last_active_at)
        : new Date(0);
      const hoursSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);
      const nudgeCount = profile.nudge_count ?? 0;
      const percent = investorPercent(profile);

      if (nudgeCount === 0 && hoursSinceActive >= 48) {
        // First nudge: in-app notification only
        await admin.from("notifications").insert({
          user_id: investorId,
          type: "profile_incomplete",
          title: "Finish your investor profile",
          body: `Your profile is ${percent}% complete. Finish your thesis to start getting matched with founders.`,
          link: "/app/investor/profile",
        });
        await admin
          .from("investor_profiles")
          .update({ nudge_count: 1, nudge_sent_at: new Date().toISOString() })
          .eq("user_id", investorId);
        investorsNudged++;
        console.log(`[profile-gate-nudge-cron] In-app nudge sent to investor ${investorId}`);

      } else if (
        nudgeCount === 1 &&
        hoursSinceActive >= 24 * 7 &&
        profile.nudge_sent_at &&
        new Date(profile.nudge_sent_at) < new Date(sevenDaysAgo)
      ) {
        // Second nudge: email
        const { data: authUser } = await admin.auth.admin.getUserById(investorId);
        const email = authUser?.user?.email;
        if (!email) continue;

        const html = buildLayout(`
          <h1 style="font-size:24px;font-weight:700;color:#09090b;margin-bottom:12px;">
            Your investor profile is still incomplete
          </h1>
          <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin-bottom:16px;">
            You're ${percent}% done setting up your Hockystick investor profile. Finishing your thesis takes about 5 minutes and unlocks discovery, deal intake, and deal rooms.
          </p>
          <div style="background:#f5f3ff;border-left:3px solid #7c3aed;padding:12px 16px;border-radius:0 6px 6px 0;margin:20px 0;">
            <p style="margin:0;color:#4c1d95;font-weight:500;font-size:14px;">
              Investors with a complete thesis profile get matched with relevant founders automatically.
            </p>
          </div>
          <div style="text-align:center;margin-top:24px;">
            <a href="https://hockystick.app/app/investor/profile" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
              Complete my profile →
            </a>
          </div>
          <div style="height:1px;background:#e4e4e7;margin:32px 0;"></div>
          <p style="color:#a1a1aa;font-size:12px;line-height:1.6;">
            You are receiving this because you have an account on Hockystick.
            <a href="https://hockystick.app/app/investor/settings" style="color:#7c3aed;">Manage notifications</a>
          </p>
        `, "Your investor profile is still incomplete");

        const ok = await sendEmail(email, "Your Hockystick investor profile is still incomplete", html);
        if (ok) {
          await admin
            .from("investor_profiles")
            .update({ nudge_count: 2, nudge_sent_at: new Date().toISOString() })
            .eq("user_id", investorId);
          investorsNudged++;
          console.log(`[profile-gate-nudge-cron] Email nudge sent to investor ${investorId}`);
        }
      }
    }

    const result = { foundersNudged, investorsNudged };
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
