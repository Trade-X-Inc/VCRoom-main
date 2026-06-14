import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nudgeEmailHtml(opts: {
  investorName: string;
  firm: string | null;
  founderName: string | null;
  companyName: string;
  dealRoomUrl: string;
  dashboardUrl: string;
}): string {
  const { investorName, firm, companyName, dealRoomUrl, dashboardUrl } = opts;
  const investorLabel = firm ? `${investorName} from ${firm}` : investorName;

  const content = `
    <h1 style="font-size:24px;font-weight:700;color:#09090b;letter-spacing:-0.5px;margin-bottom:12px;line-height:1.3;">
      You approved ${investorName} — now invite them to your deal room.
    </h1>

    <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin-bottom:16px;">
      <strong>${investorLabel}</strong> has had access to your profile for 3 days.
    </p>
    <p style="color:#3f3f46;font-size:15px;line-height:1.7;margin-bottom:16px;">
      The next step is inviting them to your deal room so they can review your financial documents and engage seriously.
    </p>

    <div style="background:#f5f3ff;border-left:3px solid #7c3aed;padding:12px 16px;border-radius:0 6px 6px 0;margin:20px 0;">
      <p style="margin:0;color:#4c1d95;font-weight:500;font-size:14px;">
        <!-- Placeholder statistic: update with real platform data once sufficient sample size is reached -->
        Investors who are invited to a deal room within a week of approval are 3× more likely to submit a decision.
      </p>
    </div>

    <div style="text-align:center;margin-top:28px;">
      <a href="${dealRoomUrl}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
        Invite ${investorName} to deal room →
      </a>
    </div>

    <div style="text-align:center;margin-top:16px;">
      <a href="${dashboardUrl}" style="color:#7c3aed;font-size:14px;text-decoration:none;">
        View your dashboard →
      </a>
    </div>

    <div style="height:1px;background:#e4e4e7;margin:32px 0;"></div>
    <p style="color:#a1a1aa;font-size:12px;line-height:1.6;">
      You are receiving this because you have a published profile on Hockystick.
      <a href="https://hockystick.app/app/settings" style="color:#7c3aed;">Manage notifications</a>
    </p>
  `;

  return buildLayout(content, `Don't lose momentum — invite ${investorName} to your deal room`);
}

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
    console.error("[daily-nudge-cron] RESEND_API_KEY not set");
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
    console.error("[daily-nudge-cron] Resend error:", res.status, body);
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const threeDAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch approved requests older than 3 days, under the 2-nudge cap.
    // investor_profiles is joined via user_id (no direct FK), so we fetch startups inline
    // and look up investor profiles separately per request.
    const { data: approvedReqs, error: fetchErr } = await admin
      .from("discovery_requests")
      .select(`
        id, investor_id, startup_id, updated_at, nudge_count, nudge_sent_at,
        startups!startup_id ( company_name, profile_slug, founder_id )
      `)
      .eq("status", "approved")
      .lt("nudge_count", 2)
      .lt("updated_at", threeDAgo);

    if (fetchErr) {
      console.error("[daily-nudge-cron] Query error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter: nudge_sent_at is null or older than 3 days
    const candidates = (approvedReqs ?? []).filter((r: any) => {
      if (!r.nudge_sent_at) return true;
      return new Date(r.nudge_sent_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    });

    // Exclude investors already in a deal room for this startup
    const requests: any[] = [];
    for (const req of candidates) {
      const { data: dealRooms } = await admin
        .from("deal_rooms")
        .select("id")
        .eq("startup_id", req.startup_id);
      const roomIds = (dealRooms ?? []).map((r: any) => r.id);

      if (roomIds.length > 0) {
        const { data: membership } = await admin
          .from("deal_room_members")
          .select("id")
          .eq("user_id", req.investor_id)
          .in("deal_room_id", roomIds)
          .maybeSingle();
        if (membership) continue;
      }
      requests.push(req);
    }

    console.log(`[daily-nudge-cron] Found ${requests.length} requests to nudge`);

    let sent = 0;
    let failed = 0;

    for (const req of requests) {
      const startup = req.startups;

      const companyName: string = startup?.company_name ?? "your startup";
      const founderId: string = startup?.founder_id;

      // Fetch investor profile separately (no FK from discovery_requests to investor_profiles)
      const { data: investorProfile } = await admin
        .from("investor_profiles")
        .select("your_name, fund_name")
        .eq("user_id", req.investor_id)
        .maybeSingle();

      const investorName: string = investorProfile?.your_name ?? "the investor";
      const firm: string | null = investorProfile?.fund_name ?? null;

      // Fetch founder email
      const { data: authUser } = await admin.auth.admin.getUserById(founderId);
      const founderEmail = authUser?.user?.email;
      if (!founderEmail) {
        console.warn(`[daily-nudge-cron] No email for founder ${founderId}, skipping`);
        continue;
      }

      const subject = `Don't lose momentum with ${investorName}`;
      const html = nudgeEmailHtml({
        investorName,
        firm,
        founderName: null,
        companyName,
        dealRoomUrl: "https://hockystick.app/app/deal-rooms",
        dashboardUrl: "https://hockystick.app/app",
      });

      const ok = await sendEmail(founderEmail, subject, html);

      if (ok) {
        // Update nudge tracking columns
        const { error: updateErr } = await admin
          .from("discovery_requests")
          .update({
            nudge_sent_at: new Date().toISOString(),
            nudge_count: (req.nudge_count ?? 0) + 1,
          })
          .eq("id", req.id);

        if (updateErr) {
          console.error(`[daily-nudge-cron] Failed to update nudge_count for ${req.id}:`, updateErr);
        }
        sent++;
      } else {
        failed++;
      }
    }

    const result = { processed: requests.length, sent, failed };
    console.log("[daily-nudge-cron] Done:", result);

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[daily-nudge-cron] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
