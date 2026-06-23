import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

// ── Types ──────────────────────────────────────────────────────────────────────

type BriefInput = {
  investorId: string;
  startupId: string;
  forceRefresh?: boolean;
};

export type InvestorDealBrief = {
  startupId: string;
  companyName: string;
  matchScore: number;
  headline: string;
  investmentThesis: string;
  keyMetrics: Record<string, string>;
  documentReadiness: { assessment: string; averageScore: number; documentsCompleted: number } | null;
  strengths: string[];
  redFlags: string[];
  suggestedQuestions: string[];
  overallVerdict: string;
  verdictSignal: "strong" | "neutral" | "weak" | string;
  generatedAt: string;
  fromCache: boolean;
};

// ── Server function ────────────────────────────────────────────────────────────

export const generateInvestorDealBrief = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): BriefInput => d as BriefInput)
  .handler(async ({ data }): Promise<InvestorDealBrief> => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const cfEnv = (globalThis as any).__cf_env || {};
    const apiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const admin = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // 1. Check cache (unless forceRefresh)
    if (!data.forceRefresh) {
      const { data: cached } = await admin
        .from("deal_briefs")
        .select("*, startups!startup_id(company_name)")
        .eq("investor_id", data.investorId)
        .eq("startup_id", data.startupId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached && cached.headline && cached.overall_verdict) {
        const c = cached as any;
        return {
          startupId: c.startup_id,
          companyName: c.startups?.company_name ?? "Unknown",
          matchScore: c.match_score ?? 0,
          headline: c.headline ?? "",
          investmentThesis: c.investment_thesis ?? "",
          keyMetrics: (c.key_metrics as Record<string, string>) ?? {},
          documentReadiness: c.document_readiness ?? null,
          strengths: Array.isArray(c.strengths) ? c.strengths : [],
          redFlags: Array.isArray(c.red_flags) ? c.red_flags : [],
          suggestedQuestions: Array.isArray(c.suggested_questions) ? c.suggested_questions : [],
          overallVerdict: c.overall_verdict ?? "",
          verdictSignal: c.verdict_signal ?? "neutral",
          generatedAt: c.generated_at,
          fromCache: true,
        };
      }
    }

    // 2. Fetch startup data
    const [startupRes, investorRes] = await Promise.all([
      admin.from("startups")
        .select("company_name, sector, stage, funding_target, traction, description, team_size, revenue, country")
        .eq("id", data.startupId)
        .maybeSingle(),
      admin.from("investor_profiles")
        .select("fund_name, thesis, sectors, stages, check_size_min, check_size_max, geography")
        .eq("user_id", data.investorId)
        .maybeSingle(),
    ]);

    const startup = startupRes.data;
    const investor = investorRes.data;

    if (!startup) throw new Error("Startup not found");
    if (!apiKey) throw new Error("AI unavailable — OpenAI key not configured");

    // 3. Build prompt
    const systemPrompt = `You are a senior investment analyst. Given a startup profile and an investor's thesis, produce a structured deal brief.
Respond ONLY with valid JSON matching this exact shape (no markdown, no explanation):
{
  "matchScore": <0-100 integer>,
  "headline": "<15-word summary of the opportunity>",
  "investment_thesis": "<2-3 sentence investment case>",
  "key_metrics": { "stage": "...", "sector": "...", "funding_ask": "...", "revenue": "...", "traction": "...", "team_size": "..." },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "red_flags": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "suggested_questions": ["<question 1>", "<question 2>", "<question 3>"],
  "overall_verdict": "<3-4 sentence balanced verdict>",
  "verdict_signal": "strong" | "neutral" | "weak"
}`;

    const userPrompt = `STARTUP:
Company: ${startup.company_name}
Sector: ${startup.sector ?? "Unknown"}
Stage: ${startup.stage ?? "Unknown"}
Funding ask: ${startup.funding_target ?? "Unknown"}
Revenue: ${startup.revenue ?? "Unknown"}
Traction: ${startup.traction ?? "Unknown"}
Team size: ${startup.team_size ?? "Unknown"}
Country: ${startup.country ?? "Unknown"}
Description: ${startup.description ?? "Not provided"}

INVESTOR THESIS:
Fund: ${investor?.fund_name ?? "Unknown"}
Thesis: ${investor?.thesis ?? "Not set"}
Sectors: ${investor?.sectors ?? "Not set"}
Stages: ${investor?.stages ?? "Not set"}
Check size: $${investor?.check_size_min ?? "?"} – $${investor?.check_size_max ?? "?"}
Geography: ${investor?.geography ?? "Not set"}

Rate the match score based on how well this startup aligns with the investor's stated thesis, sectors, stages, geography, and check size.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1200,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as any;
      throw new Error(`OpenAI error: ${err?.error?.message ?? "unknown"}`);
    }

    const aiJson = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = aiJson.choices[0]?.message?.content ?? "";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned malformed JSON");
    }

    const now = new Date().toISOString();

    // 4. Persist to deal_briefs (upsert by investor+startup)
    const briefRow = {
      investor_id: data.investorId,
      startup_id: data.startupId,
      match_score: parsed.matchScore ?? 0,
      headline: parsed.headline ?? null,
      investment_thesis: parsed.investment_thesis ?? null,
      key_metrics: parsed.key_metrics ?? null,
      document_readiness: null,
      strengths: parsed.strengths ?? [],
      red_flags: parsed.red_flags ?? [],
      suggested_questions: parsed.suggested_questions ?? [],
      overall_verdict: parsed.overall_verdict ?? null,
      verdict_signal: parsed.verdict_signal ?? "neutral",
      generated_at: now,
    };

    await admin.from("deal_briefs").upsert(briefRow, {
      onConflict: "investor_id,startup_id",
      ignoreDuplicates: false,
    });

    return {
      startupId: data.startupId,
      companyName: startup.company_name,
      matchScore: parsed.matchScore ?? 0,
      headline: parsed.headline ?? "",
      investmentThesis: parsed.investment_thesis ?? "",
      keyMetrics: parsed.key_metrics ?? {},
      documentReadiness: null,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      redFlags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      suggestedQuestions: Array.isArray(parsed.suggested_questions) ? parsed.suggested_questions : [],
      overallVerdict: parsed.overall_verdict ?? "",
      verdictSignal: parsed.verdict_signal ?? "neutral",
      generatedAt: now,
      fromCache: false,
    };
  });
