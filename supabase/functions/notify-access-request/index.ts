import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function emailHtml(opts: {
  investorName: string;
  firm: string | null;
  role: string | null;
  verified: boolean;
  companyName: string;
  dashboardUrl: string;
}): string {
  const { investorName, firm, role, verified, companyName, dashboardUrl } = opts;

  const investorMeta = [firm, role].filter(Boolean).join(" · ");
  const verifiedBadge = verified
    ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#dcfce7;color:#166534;border-radius:99px;font-size:12px;font-weight:600;padding:3px 10px;">
        <span style="width:7px;height:7px;border-radius:50%;background:#16a34a;display:inline-block;"></span>
        Hockystick Verified
       </span>`
    : `<span style="color:#a1a1aa;font-size:12px;">Unverified investor</span>`;

  const content = `
    <h1 style="font-size:24px;font-weight:700;color:#09090b;letter-spacing:-0.5px;margin-bottom:12px;line-height:1.3;">An investor wants in.</h1>

    <div style="background:#f8f7ff;border:1px solid #e0d9ff;border-radius:10px;padding:20px 24px;margin:24px 0;">
      <p style="font-size:16px;font-weight:700;color:#09090b;margin:0 0 4px;">${investorName}</p>
      ${investorMeta ? `<p style="font-size:13px;color:#71717a;margin:0 0 10px;">${investorMeta}</p>` : ""}
      <div>${verifiedBadge}</div>
    </div>

    <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin-bottom:16px;">
      <strong>${investorName}</strong> has requested access to your on-request profile sections on Hockystick.
    </p>
    <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin-bottom:16px;">
      They can see your public profile. They cannot see your business model, market, traction, or team details until you approve.
    </p>
    <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin-bottom:24px;">
      Review and approve or decline this request from your dashboard.
    </p>

    <div style="text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
        Review request →
      </a>
    </div>

    <div style="height:1px;background:#e4e4e7;margin:32px 0;"></div>
    <p style="color:#a1a1aa;font-size:12px;line-height:1.6;">
      You are receiving this because you have a published profile on Hockystick.
      Manage your notifications in <a href="https://hockystick.app/app/settings" style="color:#7c3aed;">settings</a>.
    </p>
  `;

  return buildLayout(content, `${investorName} has requested access to your ${companyName} profile`);
}

function buildLayout(content: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hockystick</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; color: #09090b; }
</style>
</head>
<body>
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ""}
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:#0a0a0b;padding:28px 32px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
        Hocky<span style="color:#7c3aed;">stick</span>
      </div>
      <div style="color:#a1a1aa;font-size:12px;margin-top:4px;">Where deals get done</div>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
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
    console.error("[notify-access-request] RESEND_API_KEY not set");
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
    console.error("[notify-access-request] Resend error:", res.status, body);
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { startup_id, investor_id } = await req.json();
    if (!startup_id || !investor_id) {
      return new Response(JSON.stringify({ error: "startup_id and investor_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch startup + founder email from auth.users
    const { data: startupRow, error: startupErr } = await admin
      .from("startups")
      .select("company_name, founder_id, profile_slug")
      .eq("id", startup_id)
      .maybeSingle();

    if (startupErr || !startupRow) {
      console.error("[notify-access-request] Startup lookup failed:", startupErr);
      return new Response(JSON.stringify({ error: "startup not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get founder email from auth.users via admin API
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(startupRow.founder_id);
    const founderEmail = authUser?.user?.email;
    if (!founderEmail) {
      console.error("[notify-access-request] Founder email not found:", authErr);
      return new Response(JSON.stringify({ error: "founder email not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch investor name + firm from investor_profiles (joined by user_id, not investor_id FK)
    const { data: investorProfile } = await admin
      .from("investor_profiles")
      .select("your_name, fund_name, role, verification_tier")
      .eq("user_id", investor_id)
      .maybeSingle();

    const investorName = investorProfile?.your_name ?? "An investor";
    const firm = investorProfile?.fund_name ?? null;
    const role = investorProfile?.role ?? null;
    const verified = ["verified", "checked"].includes(investorProfile?.verification_tier ?? "");

    // 3. Send email
    const subject = firm
      ? `${investorName} from ${firm} requested access to your profile`
      : `${investorName} requested access to your profile`;

    const html = emailHtml({
      investorName,
      firm,
      role,
      verified,
      companyName: startupRow.company_name ?? "your startup",
      dashboardUrl: "https://hockystick.app/app",
    });

    const sent = await sendEmail(founderEmail, subject, html);

    console.log(`[notify-access-request] Email ${sent ? "sent" : "failed"} → ${founderEmail}`);

    return new Response(JSON.stringify({ success: sent }), {
      status: sent ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-access-request] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
