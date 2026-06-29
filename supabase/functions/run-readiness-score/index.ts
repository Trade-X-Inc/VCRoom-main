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
      p_feature: "readiness_score",
    });
    if (!rateLimitErr && allowed === false) {
      return new Response(
        JSON.stringify({ error: "Daily readiness score limit reached" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Fetch data in parallel ────────────────────────────────────────────
    const [startupRes, docsRes, prevRunRes] = await Promise.all([
      sb.from("startups").select("*").eq("id", startup_id).maybeSingle(),
      sb.from("founder_documents").select("title, template_slug").eq("startup_id", startup_id),
      sb.from("readiness_score_runs")
        .select("score")
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
    const prevScore: number | null = prevRunRes.data?.score ?? null;

    const docList = docs.length > 0
      ? docs.map((d) => d.title || d.template_slug).join(", ")
      : "none";

    // ── 3. Build prompt ──────────────────────────────────────────────────────
    const systemPrompt = `You are an investor readiness analyst for Hockystick, a global fundraising platform.
Score startup profiles on 0-100 based on what institutional investors expect at each stage.
Be specific — reference actual data from the profile. Never generic.`;

    const userPrompt = `Analyze this startup and return ONLY valid JSON, no markdown, no explanation:

Startup: ${val(startup.company_name)}, Stage: ${val(startup.stage)}, Sector: ${val(startup.sector)}, Country: ${val(startup.country)}
Description: ${val(startup.description)}
Problem: ${val(startup.problem)} | Solution: ${val(startup.solution)} | Business Model: ${val(startup.business_model)}
Revenue: ${val(startup.revenue)} | Burn Rate: ${val(startup.burn_rate)} | Runway: ${val(startup.runway_months)} months
Team size: ${val(startup.team_size)} | Founded: ${val(startup.founded_year)}
Market: TAM=${val(startup.tam)}, SAM=${val(startup.sam)}
Traction: ${val(startup.traction)} | Growth: ${val(startup.growth_rate)} | Customers: ${val(startup.customer_count)}
LinkedIn: ${startup.founder_linkedin ? "yes" : "missing"}
Website: ${startup.website ? "yes" : "missing"}
Registration: ${startup.registration_number ? "yes" : "missing"}
Documents uploaded: ${docList}

Return this exact JSON structure:
{
  "score": <int 0-100>,
  "confidence_lo": <int, score minus uncertainty>,
  "confidence_hi": <int, score plus uncertainty, max 100>,
  "factor_breakdown": {
    "team": { "score": <0-20>, "max": 20, "reasoning": "<1 specific sentence referencing actual data>" },
    "market": { "score": <0-15>, "max": 15, "reasoning": "<specific>" },
    "traction": { "score": <0-20>, "max": 20, "reasoning": "<specific>" },
    "financials": { "score": <0-20>, "max": 20, "reasoning": "<specific>" },
    "product": { "score": <0-15>, "max": 15, "reasoning": "<specific>" },
    "legal": { "score": <0-10>, "max": 10, "reasoning": "<specific>" }
  },
  "data_gaps": [
    { "field": "<field name>", "impact_points": <int>, "message": "<what is missing and why it matters to investors at this stage>" }
  ],
  "top_action": "<single most impactful action, 1-2 sentences, specific to this profile>",
  "sim_preview": "<The first question an investor would ask + the biggest red flag they would spot>"
}

DATA GAPS RULES — always check these and list any that are missing:
- No LinkedIn URL: impact 8, message 'Investors verify founder background before meetings. Missing LinkedIn creates friction.'
- No website: impact 6, message 'Website absence signals early stage — be specific about why in your description.'
- No registration: impact 10, message 'Legal registration is a prerequisite for due diligence at Seed+. Ensure your entity is properly registered in your jurisdiction.'
- No financial model doc: impact 15, message 'At Seed stage, investors expect to see burn rate, runway, and a financial projection.'
- No pitch deck doc: impact 12, message 'Pitch deck is the first document investors open. Its absence will delay any intro request.'
- runway_months < 12: impact 12, message 'Less than 12 months runway at Seed is a critical flag. Investors typically need sufficient runway for your stage before committing.'
- No traction/revenue data: impact 10, message 'No traction data means investors are evaluating the team only. Add any signal — even pre-revenue metrics.'

CONFIDENCE BAND: if >= 3 high-impact gaps: confidence_lo = score-20, confidence_hi = min(score+20, 100)
Otherwise: confidence_lo = score-8, confidence_hi = min(score+8, 100)`;

    // ── 4. Call OpenAI ───────────────────────────────────────────────────────
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
        temperature: 0.2,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[run-readiness-score] OpenAI error:", errText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${aiResp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json() as any;
    const raw = aiJson.choices?.[0]?.message?.content ?? "";

    // ── 5. Parse JSON (strip markdown fences if present) ─────────────────────
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[run-readiness-score] JSON parse failed:", cleaned.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", raw: cleaned.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 6. Insert into readiness_score_runs ──────────────────────────────────
    const { data: inserted, error: insertErr } = await sb
      .from("readiness_score_runs")
      .insert({
        startup_id,
        score: parsed.score,
        confidence_lo: parsed.confidence_lo,
        confidence_hi: parsed.confidence_hi,
        factor_breakdown: parsed.factor_breakdown,
        data_gaps: parsed.data_gaps ?? [],
        top_action: parsed.top_action,
        sim_preview: parsed.sim_preview ?? null,
        prev_score: prevScore,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[run-readiness-score] insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "DB insert failed", detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 7. Increment usage (fire and forget) ─────────────────────────────────
    Promise.resolve(
      sb.rpc("check_and_increment_ai_usage", {
        p_user_id: user_id,
        p_feature: "readiness_score",
      })
    ).catch((e: any) => console.warn("[run-readiness-score] usage increment failed:", e));

    console.log(`[run-readiness-score] done: startup=${startup_id} score=${parsed.score}`);

    return new Response(
      JSON.stringify(inserted),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[run-readiness-score] unexpected error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
