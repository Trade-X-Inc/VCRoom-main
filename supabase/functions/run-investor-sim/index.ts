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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { startup_id, user_id } = await req.json() as {
      startup_id: string;
      user_id: string;
    };

    if (!startup_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "startup_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. Rate limit check ──────────────────────────────────────────────────
    const { data: allowed, error: rateLimitErr } = await sb.rpc("check_ai_rate_limit", {
      p_user_id: user_id,
      p_feature: "investor_sim",
    });
    if (!rateLimitErr && allowed === false) {
      return new Response(
        JSON.stringify({ error: "Daily investor simulation limit reached" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Fetch data in parallel ────────────────────────────────────────────
    const [startupRes, docsRes, scoreRunRes] = await Promise.all([
      sb.from("startups").select("*").eq("id", startup_id).maybeSingle(),
      sb.from("founder_documents").select("title, template_slug").eq("startup_id", startup_id),
      sb.from("readiness_score_runs")
        .select("id, score")
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

    const docs: Array<{ title: string; template_slug: string }> = docsRes.data ?? [];
    const latestScoreRun = scoreRunRes.data;

    const docList = docs.length > 0
      ? docs.map((d) => d.title || d.template_slug).join(", ")
      : "none";

    const readinessScore = latestScoreRun?.score != null
      ? String(latestScoreRun.score)
      : "not run";

    // ── 3. Build prompts ─────────────────────────────────────────────────────
    const systemPrompt = `You are a senior VC partner at a top-tier fund who has reviewed thousands of startup profiles. You are reviewing this founder's profile exactly as an investor would in a first pass. You are direct, honest, and specific. You never give generic feedback. Every observation references actual data from the profile.

HARDNESS RULE: Never soften output. If the cap table has a problem, name it. If there is no technical team, say it. If runway is below 12 months, say exactly that. Founders need to hear this before investors do.

BAD output (reject this): 'Your team looks weak'
GOOD output (required): 'No technical co-founder listed for a SaaS product targeting software teams — every Series A investor will ask who owns the roadmap'`;

    const userPrompt = `Review this startup profile and return ONLY valid JSON, no markdown:

Startup: ${val(startup.company_name)}, Stage: ${val(startup.stage)}, Sector: ${val(startup.sector)}
Founded: ${val(startup.founded_year)} | Team: ${val(startup.team_size)} people
Description: ${val(startup.description)}
Problem: ${val(startup.problem)} | Solution: ${val(startup.solution)}
Revenue: $${val(startup.revenue)} | Burn: $${val(startup.burn_rate)}/mo | Runway: ${val(startup.runway_months)} months
Traction: ${val(startup.traction)} | Customers: ${val(startup.customer_count)}
LinkedIn: ${startup.founder_linkedin ? "yes" : "missing"}
Website: ${startup.website ? "yes" : "missing"}
Registration: ${startup.registration_number ? "yes" : "missing"}
Documents uploaded: ${docList}
Readiness score: ${readinessScore}

{
  "first_question": "<The single most likely opening question a serious early-stage investor would ask — specific to this profile. Must reference what is most prominent or most unclear. Not 'tell me about your business.'>",
  "red_flag": "<The single biggest concern they would spot immediately. Must reference actual data or the absence of data. Never generic. Example: 'Runway of 14 months at Seed stage without a financial model uploaded means the investor cannot verify your burn trajectory — this stalls most conversations within 10 minutes'>",
  "strongest_point": "<What would make an investor lean forward. Must be genuine and specific. If nothing is strong: say 'No clear standout yet — [specific thing] would create a compelling hook'>",
  "kill_risk": "<The one thing that could end the deal unilaterally before term sheet. Example: 'No legal registration documented — regulated investors require entity confirmation before any capital can flow'>",
  "investor_persona_used": "<Brief: what type of investor this simulation represents, e.g. 'Early-stage Seed fund, $500K-$2M cheques, B2B SaaS focus'>"
}`;

    // ── 4. Call OpenAI gpt-4o ────────────────────────────────────────────────
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
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1200,
        temperature: 0.3,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[run-investor-sim] OpenAI error:", errText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${aiResp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json() as any;
    const raw = aiJson.choices?.[0]?.message?.content ?? "";

    // ── 5. Parse JSON ────────────────────────────────────────────────────────
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[run-investor-sim] JSON parse failed:", cleaned.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", raw: cleaned.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 6. Insert into investor_sim_runs ─────────────────────────────────────
    const { data: inserted, error: insertErr } = await sb
      .from("investor_sim_runs")
      .insert({
        startup_id,
        first_question: parsed.first_question,
        red_flag: parsed.red_flag,
        strongest_point: parsed.strongest_point,
        kill_risk: parsed.kill_risk,
        investor_persona_used: parsed.investor_persona_used ?? null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[run-investor-sim] insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "DB insert failed", detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 7. Update sim_preview in latest readiness_score_runs row ────────────
    if (latestScoreRun?.id) {
      const simPreview =
        parsed.first_question.slice(0, 200) +
        " / Red flag: " +
        parsed.red_flag.slice(0, 150);

      await Promise.resolve(
        sb
          .from("readiness_score_runs")
          .update({ sim_preview: simPreview })
          .eq("id", latestScoreRun.id)
      ).catch((e: any) =>
        console.warn("[run-investor-sim] sim_preview update failed:", e)
      );
    }

    // ── 8. Increment usage (fire and forget) ─────────────────────────────────
    Promise.resolve(
      sb.rpc("check_and_increment_ai_usage", {
        p_user_id: user_id,
        p_feature: "investor_sim",
      })
    ).catch((e: any) => console.warn("[run-investor-sim] usage increment failed:", e));

    console.log(
      `[run-investor-sim] done: startup=${startup_id} kill_risk_len=${parsed.kill_risk?.length}`
    );

    return new Response(
      JSON.stringify(inserted),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[run-investor-sim] unexpected error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
