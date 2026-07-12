import { createServerFn } from "@tanstack/react-start";

// ─────────────────────────────────────────────────────────────────────────────
// Gap 1 — intelligent post-save fundraising readiness checklist.
// Reads the founder's actual profile, documents, verification and claims,
// and asks GPT-4o for stage- and sector-specific gaps. IMMEDIATE per the
// confirm-first rule: only touches the calling founder's own state.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChecklistGap {
  gap_id: string;
  title: string;
  why_it_matters: string;
  how_to_fix: string;
  urgency: "critical" | "important" | "nice_to_have";
  category: "financials" | "legal" | "team" | "product" | "market" | "traction" | "documents";
}

export interface ChecklistResult {
  ok: boolean;
  error?: string;
  readiness_score?: number;
  overall_readiness?: "not_ready" | "early" | "approaching" | "investor_ready";
  summary?: string;
  gaps?: ChecklistGap[];
  strengths?: string[];
  generated_at?: string;
}

type Input = { userAccessToken: string; startupId: string };

function getEnv() {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "";
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  const openaiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";
  return { url, key, openaiKey };
}

async function sbFetch(url: string, key: string, path: string, method = "GET", body?: unknown) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

async function verifyUser(url: string, key: string, accessToken: string): Promise<string | null> {
  if (!accessToken) return null;
  const resp = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return null;
  const user = (await resp.json()) as { id?: string };
  return user?.id ?? null;
}

const SYSTEM_PROMPT = `You are an experienced investment analyst reviewing a startup's fundraising readiness. You have access to their complete profile data. Your job is to identify the 5-7 most important gaps that would cause investors to pass or ask for more information before taking a meeting.

Be specific to their stage and sector. Do not give generic advice. Every item must reference something specific about their profile.

For each gap, provide:
- gap_id: short identifier (e.g. 'missing_mrr')
- title: what's missing (max 8 words)
- why_it_matters: what an investor thinks when this is missing (1 sentence, investor's perspective)
- how_to_fix: specific action to take (1 sentence)
- urgency: 'critical' | 'important' | 'nice_to_have'
- category: 'financials' | 'legal' | 'team' | 'product' | 'market' | 'traction' | 'documents'

STAGE-SPECIFIC RULES:
Pre-revenue: focus on team, problem validation, market size, IP/defensibility
Early revenue ($1K-$50K MRR): focus on growth rate, unit economics, customer proof, burn rate
Growing ($50K-$500K MRR): focus on retention, competitive moat, management accounts, cap table
Scaling ($500K+ MRR): focus on audited financials, corporate governance, board composition

SECTOR-SPECIFIC ADDITIONS:
Fintech: always flag if no regulatory status mentioned
DeepTech: always flag if no IP/patent status mentioned
HealthTech: always flag if no regulatory pathway mentioned
SaaS: always flag if no retention/churn data

Return JSON only:
{
  "overall_readiness": "not_ready" | "early" | "approaching" | "investor_ready",
  "readiness_score": 0-100,
  "summary": "one sentence honest assessment",
  "gaps": [array of gap objects above],
  "strengths": ["what is actually strong about this profile", max 3 items]
}`;

export const generateFounderChecklist = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Input)
  .handler(async ({ data }): Promise<ChecklistResult> => {
    const { url, key, openaiKey } = getEnv();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    if (!openaiKey) return { ok: false, error: "ai_unavailable" };

    const uid = await verifyUser(url, key, data.userAccessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };

    // 1. Full profile — verify ownership before anything else
    const startups: any[] = await sbFetch(url, key, `startups?id=eq.${data.startupId}&select=*`).catch(() => []);
    const s = startups?.[0];
    if (!s) return { ok: false, error: "startup_not_found" };
    if (s.founder_id !== uid) return { ok: false, error: "not_authorized" };

    // 2-4. Documents, verification, claims — in parallel
    const [docs, verifs, claims]: [any[], any[], any[]] = await Promise.all([
      sbFetch(url, key, `founder_documents?startup_id=eq.${data.startupId}&select=title,template_slug,status,file_name`).catch(() => []),
      sbFetch(url, key, `founder_verifications?startup_id=eq.${data.startupId}&select=tier1_passed,tier1_registry_match,tier1_email_match,tier1_website_match,tier1_checked_at`).catch(() => []),
      sbFetch(url, key, `startup_claims?startup_id=eq.${data.startupId}&select=claim_type,claim_label,claim_value,claim_category,ai_verdict,proof_status`).catch(() => []),
    ]);

    const profileForAI = {
      company_name: s.company_name, tagline: s.tagline, one_liner: s.one_liner,
      sector: s.sector, stage: s.stage, country: s.country, founded_year: s.founded_year,
      team_size: s.team_size, mrr_usd: s.mrr_usd, revenue: s.revenue,
      growth_rate: s.growth_rate, runway_months: s.runway_months, burn_rate: s.burn_rate,
      funding_target: s.funding_target, fundraising_instrument: s.fundraising_instrument,
      fundraising_committed_amount: s.fundraising_committed_amount,
      problem: s.problem, solution: s.solution, business_model: s.business_model,
      market_size: s.market_size, traction: s.traction,
      competitive_advantage: s.competitive_advantage, use_of_funds: s.use_of_funds,
      investor_narrative: s.investor_narrative,
      legal_entity_name: s.legal_entity_name, registration_number: s.registration_number,
      incorporated_in: s.incorporated_in,
      founder_ownership_pct: s.founder_ownership_pct, has_options_pool: s.has_options_pool,
    };

    const userMessage = [
      "STARTUP PROFILE (null = the founder has not provided this):",
      JSON.stringify(profileForAI, null, 1),
      "\nDOCUMENTS ON FILE:",
      docs?.length ? JSON.stringify(docs) : "None uploaded.",
      "\nIDENTITY VERIFICATION:",
      verifs?.length ? JSON.stringify(verifs[0]) : "Never run.",
      "\nCLAIMS (with AI verification verdicts):",
      claims?.length ? JSON.stringify(claims) : "No claims submitted.",
    ].join("\n");

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.3,
          max_tokens: 1600,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      });
      const dataJson: any = await resp.json();
      const raw = dataJson.choices?.[0]?.message?.content ?? "";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(cleaned);

      const readiness = ["not_ready", "early", "approaching", "investor_ready"].includes(parsed.overall_readiness)
        ? parsed.overall_readiness : "early";
      const score = Math.max(0, Math.min(100, Number(parsed.readiness_score) || 0));
      const gaps: ChecklistGap[] = Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 7) : [];
      const strengths: string[] = Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [];

      const inserted: any[] = await sbFetch(url, key, "profile_checklists", "POST", {
        startup_id: data.startupId,
        readiness_score: score,
        overall_readiness: readiness,
        summary: typeof parsed.summary === "string" ? parsed.summary : null,
        gaps,
        strengths,
        ai_model: "gpt-4o",
      });

      return {
        ok: true,
        readiness_score: score,
        overall_readiness: readiness,
        summary: parsed.summary,
        gaps,
        strengths,
        generated_at: inserted?.[0]?.generated_at ?? new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("[checklist] generation failed:", err?.message ?? err);
      return { ok: false, error: err?.message ?? "generation_failed" };
    }
  });
