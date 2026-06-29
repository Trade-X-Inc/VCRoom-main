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
    const body = await req.json() as {
      startup_id: string;
      investor_id: string; // investor's auth user_id
      user_id: string;     // same as investor_id — used for rate limiting
    };

    const { startup_id, investor_id, user_id } = body;

    if (!startup_id || !investor_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "startup_id, investor_id, and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 1. Rate limit ──────────────────────────────────────────────────────────
    const { data: allowed, error: rateLimitErr } = await sb.rpc("check_ai_rate_limit", {
      p_user_id: user_id,
      p_feature: "deal_brief",
    });
    if (!rateLimitErr && allowed === false) {
      return new Response(
        JSON.stringify({ error: "Daily deal brief limit reached" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Fetch all context in parallel ──────────────────────────────────────
    const [startupRes, investorRes, verifRes, readinessRes, simRes, docsRes] = await Promise.all([
      sb.from("startups")
        .select("id, company_name, sector, stage, description, tagline, website, revenue, burn_rate, runway_months, traction, customer_count, team_size, founded_year, founder_name, founder_email, country, funding_target, publicly_discoverable")
        .eq("id", startup_id)
        .maybeSingle(),
      sb.from("investor_profiles")
        .select("id, fund_name, your_name, role, thesis, sectors, stages, check_size_min, check_size_max, geography, thesis_statement, thesis_bullets")
        .eq("user_id", investor_id)
        .maybeSingle(),
      sb.from("founder_verifications")
        .select("current_tier, tier1_passed, tier1_score, website_resolves, registry_confirmed, linkedin_valid, email_domain_matches")
        .eq("startup_id", startup_id)
        .maybeSingle(),
      sb.from("readiness_score_runs")
        .select("score, data_gaps, top_action, factor_breakdown")
        .eq("startup_id", startup_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb.from("investor_sim_runs")
        .select("red_flag, kill_risk, first_question")
        .eq("startup_id", startup_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb.from("founder_documents")
        .select("title, doc_type")
        .eq("startup_id", startup_id),
    ]);

    const startup = startupRes.data;
    const investor = investorRes.data;

    if (!startup) {
      return new Response(
        JSON.stringify({ error: "Startup not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const verif = verifRes.data;
    const readiness = readinessRes.data;
    const sim = simRes.data;
    const docs = docsRes.data ?? [];

    const topGap = Array.isArray(readiness?.data_gaps) && readiness.data_gaps.length > 0
      ? (readiness.data_gaps[0] as any)?.field ?? "none"
      : "none";

    const docTitles = docs.length > 0
      ? docs.map((d: any) => d.title ?? d.doc_type ?? "Untitled").join(", ")
      : "none uploaded";

    // ── 3. Build prompt ────────────────────────────────────────────────────────
    const systemPrompt = `You are a senior analyst at a VC firm preparing a pre-read brief for an investor before they open a deal room. You write with precision and honesty. You only state what is confirmed or clearly evidenced. You label self-reported data honestly. You match investment opportunities against the investor's stated thesis rigorously.`;

    const userPrompt = `Generate a deal brief for this investor reviewing this startup.
Return ONLY valid JSON matching this exact structure — no markdown:

Investor: ${val(investor?.fund_name)}, ${val(investor?.your_name)}
Thesis: ${val(investor?.thesis_statement ?? investor?.thesis)}
Sectors: ${val(investor?.sectors)} | Stages: ${val(investor?.stages)} | Geography: ${val(investor?.geography)}
Cheque: $${val(investor?.check_size_min)}–$${val(investor?.check_size_max)}

Startup: ${val(startup.company_name)}, Stage: ${val(startup.stage)}, Sector: ${val(startup.sector)}
Description: ${val(startup.description)}
Revenue: $${val(startup.revenue)} | Burn: $${val(startup.burn_rate)}/mo | Runway: ${val(startup.runway_months)} months
Traction: ${val(startup.traction)} | Customers: ${val(startup.customer_count)}
Team: ${val(startup.team_size)} people | Founded: ${val(startup.founded_year)}
Verification tier: ${verif?.current_tier ?? 0} / 4
Website: ${verif?.website_resolves ? "confirmed live" : "not verified"}
Registry: ${verif?.registry_confirmed ? "confirmed registered" : "not found"}
Readiness score: ${readiness?.score != null ? `${readiness.score}` : "not run"}/100
Top gap: ${topGap}
Documents: ${docTitles}
Investor red flag from sim: ${sim?.red_flag ?? "not run"}

{
  "headline": "<10-word max summary of the opportunity>",
  "match_score": <int 0-100, how well this startup matches investor thesis>,
  "investment_thesis": "<2-3 sentences: how this startup fits or misses the investor thesis. Be specific about sector, stage, geography match. If it misses on any dimension, say so.>",
  "key_metrics": {
    "stage": "<stage>",
    "revenue": "<$X or 'pre-revenue'>",
    "runway": "<X months>",
    "readiness_score": ${readiness?.score ?? null},
    "verification_tier": ${verif?.current_tier ?? 0},
    "team_size": ${startup.team_size ?? null}
  },
  "document_readiness": {
    "uploaded_count": ${docs.length},
    "docs_present": [${docs.map((d: any) => `"${d.title ?? d.doc_type ?? "Untitled"}"`).join(", ")}],
    "top_missing": "<most impactful missing doc or null>"
  },
  "strengths": ["<strength 1 — specific to this profile>", "<strength 2>"],
  "red_flags": ["<red flag 1 — specific, not generic>", "<red flag 2 if exists>"],
  "suggested_questions": [
    "<Question 1 — the first thing a serious investor would ask about this specific company>",
    "<Question 2>"
  ],
  "overall_verdict": "<2-3 sentences synthesising the opportunity. End with a recommended first action for the investor.>",
  "verdict_signal": "positive|neutral|negative"
}

RULES:
- Only reference verified fields as confirmed. Anything not in the verification data as verified must be labeled (self-reported) if mentioned
- If readiness score has not been run, say so in the verdict
- match_score: 80+ = strong thesis match, 50-79 = partial, below 50 = weak
- verdict_signal MUST be exactly one of: positive, neutral, negative`;

    // ── 4. Call OpenAI gpt-4o ─────────────────────────────────────────────────
    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[generate-deal-brief] OpenAI error:", errText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${aiResp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json() as any;
    const raw = aiJson.choices?.[0]?.message?.content ?? "";

    // ── 5. Parse JSON ──────────────────────────────────────────────────────────
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[generate-deal-brief] JSON parse failed:", cleaned.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", raw: cleaned.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalise verdict_signal — DB has CHECK constraint
    const rawSignal = (parsed.verdict_signal ?? "neutral").toLowerCase();
    const verdict_signal = ["positive", "neutral", "negative"].includes(rawSignal)
      ? rawSignal
      : "neutral";

    const now = new Date().toISOString();

    // ── 6. Upsert deal_briefs (unique on investor_id, startup_id) ─────────────
    const briefRow = {
      investor_id,
      startup_id,
      match_score: typeof parsed.match_score === "number" ? parsed.match_score : 0,
      headline: parsed.headline ?? null,
      investment_thesis: parsed.investment_thesis ?? null,
      key_metrics: parsed.key_metrics ?? null,
      document_readiness: parsed.document_readiness ?? null,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      suggested_questions: Array.isArray(parsed.suggested_questions) ? parsed.suggested_questions : [],
      overall_verdict: parsed.overall_verdict ?? null,
      verdict_signal,
      generated_at: now,
      viewed_at: null,
    };

    const { data: upserted, error: upsertErr } = await sb
      .from("deal_briefs")
      .upsert(briefRow, { onConflict: "investor_id,startup_id" })
      .select()
      .single();

    if (upsertErr) {
      console.error("[generate-deal-brief] upsert error:", upsertErr);
      return new Response(
        JSON.stringify({ error: "DB upsert failed", detail: upsertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 7. Increment usage (fire and forget) ──────────────────────────────────
    Promise.resolve(
      sb.rpc("check_and_increment_ai_usage", {
        p_user_id: user_id,
        p_feature: "deal_brief",
      })
    ).catch((e: any) => console.warn("[generate-deal-brief] usage increment failed:", e));

    console.log(
      `[generate-deal-brief] done: investor=${investor_id} startup=${startup_id} match_score=${briefRow.match_score} verdict=${verdict_signal}`
    );

    return new Response(
      JSON.stringify(upserted),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[generate-deal-brief] unexpected error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
