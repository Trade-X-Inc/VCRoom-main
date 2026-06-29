import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY =
  Deno.env.get("OPENAI_API_KEY") ??
  Deno.env.get("OPEN_AI_API_KEY") ??
  "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function val(v: unknown): string {
  if (v == null || v === "") return "not provided";
  return String(v);
}

type TriggerType = "stage_change" | "rejection" | "manual" | "score_drop";

interface TriggerData {
  rejection_reason?: string;
  new_stage?: string;
  score_delta?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      startup_id: string;
      user_id: string;
      trigger_type: TriggerType;
      trigger_data?: TriggerData;
    };

    const { startup_id, user_id, trigger_type, trigger_data } = body;

    if (!startup_id || !user_id || !trigger_type) {
      return new Response(
        JSON.stringify({ error: "startup_id, user_id, and trigger_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. Rate limit ────────────────────────────────────────────────────────
    const { data: allowed, error: rateLimitErr } = await sb.rpc("check_ai_rate_limit", {
      p_user_id: user_id,
      p_feature: "founder_coaching",
    });
    if (!rateLimitErr && allowed === false) {
      return new Response(
        JSON.stringify({ error: "Daily coaching limit reached" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Fetch data in parallel ────────────────────────────────────────────
    const [startupRes, scoreRunRes, simRunRes] = await Promise.all([
      sb.from("startups")
        .select("company_name, stage, sector, description, burn_rate, runway_months, revenue")
        .eq("id", startup_id)
        .maybeSingle(),
      sb.from("readiness_score_runs")
        .select("score, factor_breakdown, data_gaps, top_action")
        .eq("startup_id", startup_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb.from("investor_sim_runs")
        .select("red_flag, kill_risk")
        .eq("startup_id", startup_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const startup = startupRes.data;
    if (!startup) {
      return new Response(
        JSON.stringify({ error: "Startup not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const scoreRun = scoreRunRes.data;
    const simRun = simRunRes.data;

    // ── 3. Fetch rejection context via deal_rooms join if rejection trigger ──
    let rejectionReason = trigger_data?.rejection_reason ?? null;

    if (trigger_type === "rejection" && !rejectionReason) {
      // Look up the most recent Pass decision for a deal room linked to this startup
      const dealRoomsRes = await sb
        .from("deal_rooms")
        .select("id")
        .eq("startup_id", startup_id)
        .limit(20);

      const dealRoomIds: string[] = (dealRoomsRes.data ?? []).map((r: any) => r.id);

      if (dealRoomIds.length > 0) {
        const decisionRes = await sb
          .from("decisions")
          .select("pass_reason_detail, pass_reason_category, notes")
          .in("deal_room_id", dealRoomIds)
          .eq("status", "passed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const dec = decisionRes.data;
        if (dec) {
          rejectionReason =
            dec.pass_reason_detail ??
            dec.pass_reason_category ??
            dec.notes ??
            "No specific reason provided";
        }
      }
    }

    // ── 4. Build prompt ──────────────────────────────────────────────────────
    const topGap = Array.isArray(scoreRun?.data_gaps) && scoreRun.data_gaps.length > 0
      ? (scoreRun.data_gaps[0] as any).field ?? "none"
      : "none";

    const systemPrompt = `You are a senior fundraising advisor. You are direct and honest — not a cheerleader. You give specific, actionable advice based on what investors at this stage actually look for. You reference actual data from the profile. You never give generic advice.

DIRECT LANGUAGE RULE:
- Never write 'consider' or 'you might want to' — write 'do this'
- Never soften a critical finding — state it plainly
- Every action item must be specific to this startup's actual data`;

    let triggerContext = "";
    if (trigger_type === "rejection" && rejectionReason) {
      triggerContext = `Rejection reason: ${rejectionReason}`;
    } else if (trigger_type === "stage_change" && trigger_data?.new_stage) {
      triggerContext = `New stage: ${trigger_data.new_stage}`;
    } else if (trigger_type === "score_drop" && trigger_data?.score_delta != null) {
      triggerContext = `Score dropped by ${trigger_data.score_delta} points`;
    }

    const userPrompt = `Coach this founder. Return ONLY valid JSON, no markdown:

Startup: ${val(startup.company_name)}, Stage: ${val(startup.stage)}, Sector: ${val(startup.sector)}
Burn: $${val(startup.burn_rate)}/mo, Runway: ${val(startup.runway_months)} months, Revenue: $${val(startup.revenue)}
Readiness score: ${scoreRun?.score != null ? `${scoreRun.score}/100` : "not run"}
Top score gap: ${topGap}
Investor simulation red flag: ${simRun?.red_flag ?? "not run"}
Investor kill risk: ${simRun?.kill_risk ?? "not run"}
Trigger: ${trigger_type}
${triggerContext ? triggerContext : ""}

{
  "stage_guide": "<What investors at ${val(startup.stage)} stage specifically expect. Concrete requirements: at Seed — sufficient runway, working MVP, 2-3 reference customers or LOIs, financial model. At Series A — $1M+ ARR or clear path to it, proven unit economics. Reference actual gaps in this profile.>",
  "financial": "<Financial readiness. Reference actual numbers: burn $${val(startup.burn_rate)}, runway ${val(startup.runway_months)} months. State the consequence if runway is under 12 months. Mention what is missing vs what is needed at this stage.>",
  "legal": "<Legal readiness. Reference what is uploaded vs missing. Ensure your legal entity is properly registered in your jurisdiction. Call out registration gap if present.>",
  "rejection_debrief": ${trigger_type === "rejection" ? `"<Must read the actual rejection reason and respond to it directly: (1) what this investor was looking for, (2) which specific element triggered the pass, (3) three specific fixes before approaching a similar investor. Rejection reason was: ${rejectionReason}>"` : "null"},
  "action_plan": [
    { "priority": 1, "action": "<specific action for THIS startup>", "why": "<investor impact>", "effort": "low|medium|high" },
    { "priority": 2, "action": "<specific action>", "why": "<investor impact>", "effort": "low|medium|high" },
    { "priority": 3, "action": "<specific action>", "why": "<investor impact>", "effort": "low|medium|high" }
  ]
}`;

    // ── 5. Call OpenAI ───────────────────────────────────────────────────────
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1800,
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[run-founder-coaching] OpenAI error:", errText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${aiResp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json() as any;
    const raw = aiJson.choices?.[0]?.message?.content ?? "";

    // ── 6. Parse JSON ────────────────────────────────────────────────────────
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[run-founder-coaching] JSON parse failed:", cleaned.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", raw: cleaned.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 7. Insert into coaching_sessions ────────────────────────────────────
    const { data: inserted, error: insertErr } = await sb
      .from("coaching_sessions")
      .insert({
        startup_id,
        trigger_type,
        trigger_data: trigger_data ?? null,
        stage: startup.stage ?? null,
        stage_guide: parsed.stage_guide,
        financial: parsed.financial,
        legal: parsed.legal,
        rejection_debrief: parsed.rejection_debrief ?? null,
        action_plan: parsed.action_plan ?? [],
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[run-founder-coaching] insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "DB insert failed", detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 8. Increment usage (fire and forget) ─────────────────────────────────
    Promise.resolve(
      sb.rpc("check_and_increment_ai_usage", {
        p_user_id: user_id,
        p_feature: "founder_coaching",
      })
    ).catch((e: any) => console.warn("[run-founder-coaching] usage increment failed:", e));

    console.log(
      `[run-founder-coaching] done: startup=${startup_id} trigger=${trigger_type} actions=${parsed.action_plan?.length}`
    );

    return new Response(
      JSON.stringify(inserted),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[run-founder-coaching] unexpected error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
