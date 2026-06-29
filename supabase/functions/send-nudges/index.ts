import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY =
  Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OPEN_AI_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("[send-nudges] RESEND_API_KEY not set");
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
    console.error("[send-nudges] Resend error:", res.status, body.slice(0, 200));
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({})) as { deal_room_id?: string };
    const singleRoomId = body.deal_room_id ?? null;

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. Find stale deal rooms ───────────────────────────────────────────────
    let query = sb
      .from("deal_rooms")
      .select("id, startup_id, investor_email, investor_decision, decision, workflow_stage, updated_at, last_nudge_sent_at")
      .eq("status", "active")
      .is("decision", null)
      .is("investor_decision", null)
      .lt("updated_at", new Date(Date.now() - 3 * 86400000).toISOString());

    // 72-hour guard: last_nudge_sent_at IS NULL OR last_nudge_sent_at < now()-72h
    // PostgREST: use or() filter via raw approach — use two queries ORed in JS
    // Instead filter in JS after fetch (simpler, safe for small result sets)
    if (singleRoomId) {
      query = query.eq("id", singleRoomId);
    }

    const { data: rooms, error: roomsErr } = await query;
    if (roomsErr) {
      console.error("[send-nudges] room query error:", roomsErr);
      return new Response(JSON.stringify({ error: roomsErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const staleRooms = (rooms ?? []).filter((r) => {
      if (!r.last_nudge_sent_at) return true;
      return now - new Date(r.last_nudge_sent_at).getTime() > 72 * 3600000;
    });

    console.log(`[send-nudges] ${staleRooms.length} stale rooms out of ${(rooms ?? []).length} checked`);

    const results: { id: string; company_name: string; days_stale: number }[] = [];

    for (const room of staleRooms) {
      // ── 2a. Fetch last activity log entry ───────────────────────────────────
      const [activityRes, startupRes] = await Promise.all([
        sb.from("activity_log")
          .select("action_type, actor_name, target_label, detail, created_at")
          .or(`target_id.eq.${room.id},account_id.eq.${room.startup_id}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb.from("startups")
          .select("company_name, founder_id")
          .eq("id", room.startup_id)
          .maybeSingle(),
      ]);

      const lastActivity = activityRes.data;
      const startup = startupRes.data;
      const companyName = startup?.company_name ?? "Unknown startup";
      const founderId = startup?.founder_id ?? null;

      // ── 2d. Days stale ────────────────────────────────────────────────────
      const days_stale = Math.floor((now - new Date(room.updated_at).getTime()) / 86400000);

      const lastActionDesc = lastActivity
        ? `${lastActivity.action_type}${lastActivity.detail ? ": " + lastActivity.detail : ""}`
        : "No activity recorded";

      // ── 2e. GPT-4o-mini nudge generation ────────────────────────────────────
      let nudgeSubject = `Your ${companyName} deal room needs attention`;
      let nudgeBody = `It has been ${days_stale} days since any activity in your deal room with ${companyName}. Consider reviewing the documents or sending a follow-up.`;

      if (OPENAI_API_KEY) {
        try {
          const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              max_tokens: 200,
              temperature: 0.4,
              messages: [
                {
                  role: "system",
                  content: "You write short, specific nudge messages for a B2B fundraising platform. Maximum 2 sentences. Reference the actual situation. No fluff. No emoji.",
                },
                {
                  role: "user",
                  content: `Write a nudge for this stale deal room:
Startup: ${companyName}
Investor email: ${room.investor_email}
Days since last activity: ${days_stale}
Last recorded action: ${lastActionDesc}
Workflow stage: ${room.workflow_stage ?? "unknown"}

Return JSON: {
  "subject": "<email subject, max 8 words>",
  "body": "<1-2 sentences, specific to the situation>",
  "recipient": "investor"
}`,
                },
              ],
            }),
          });

          if (aiResp.ok) {
            const aiJson = await aiResp.json() as any;
            const raw = aiJson.choices?.[0]?.message?.content ?? "";
            const cleaned = raw
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.subject) nudgeSubject = parsed.subject;
            if (parsed.body) nudgeBody = parsed.body;
          }
        } catch (e: any) {
          console.warn("[send-nudges] AI nudge generation failed:", e?.message ?? e);
        }
      }

      // ── 2g. In-app notification for founder ──────────────────────────────────
      if (founderId) {
        await Promise.resolve(
          sb.from("notifications").insert({
            user_id: founderId,
            kind: "ai_operator",
            title: nudgeSubject,
            body: nudgeBody + " — " + companyName + " deal room",
            read: false,
            meta: { deal_room_id: room.id, days_stale, workflow_stage: room.workflow_stage },
            action_url: `/app/deal-room/${room.id}`,
          })
        ).catch((e: any) => console.warn("[send-nudges] notification insert failed:", e?.message ?? e));
      }

      // ── 2h. Send email via Resend ─────────────────────────────────────────────
      if (room.investor_email) {
        const html = `<p>${nudgeBody}</p>
<p><a href="https://hockystick.app/app/deal-room/${room.id}" style="color:#7C3AED;font-weight:600;">Open deal room →</a></p>
<p style="color:#999;font-size:12px;">You're receiving this because you have an active deal room on Hockystick.</p>`;

        await sendEmail(room.investor_email, nudgeSubject, html);
      }

      // ── 2i. Update last_nudge_sent_at ─────────────────────────────────────────
      await Promise.resolve(
        sb.from("deal_rooms").update({ last_nudge_sent_at: new Date().toISOString() }).eq("id", room.id)
      ).catch((e: any) => console.warn("[send-nudges] update last_nudge_sent_at failed:", e?.message ?? e));

      results.push({ id: room.id, company_name: companyName, days_stale });
      console.log(`[send-nudges] nudge sent: room=${room.id} company=${companyName} days_stale=${days_stale}`);
    }

    return new Response(
      JSON.stringify({ nudges_sent: results.length, rooms_checked: (rooms ?? []).length, rooms: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[send-nudges] unexpected error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
