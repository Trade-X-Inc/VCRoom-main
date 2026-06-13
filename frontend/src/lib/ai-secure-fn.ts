import { createServerFn } from "@tanstack/react-start";

// ── getEnvVar: reads from server env only (never exposed to browser) ──
function getEnvVar(key: string): string {
  return (
    (typeof process !== "undefined" && process.env[key] ? process.env[key] : "") ||
    (import.meta.env as any)[key] ||
    (import.meta.env as any)[`VITE_${key}`] ||
    ""
  ) as string;
}

// ── Types ──
type ThesisInput = {
  userId: string;
  investorThesis: string;
  documentContext: string;
  fileName: string;
};

type SummaryInput = {
  userId: string;
  documentContent: string;
  fileName: string;
  category?: string;
};

type GenericAIInput = {
  userId: string;
  systemPrompt: string;
  userMessage: string;
  history?: Array<{ role: string; content: string }>;
  maxTokens?: number;
};

type AIResult = {
  reply: string;
  error: string | null;
};

// ── Check AI usage cap via Supabase RPC ──
async function checkUsageCap(userId: string, feature: string): Promise<{ allowed: boolean; message?: string; used?: number; limit?: number }> {
  if (!userId) return { allowed: true }; // no user = server-side call, allow
  try {
    const supabaseUrl = getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL");
    const supabaseKey = getEnvVar("VITE_SUPABASE_ANON_KEY") || getEnvVar("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) return { allowed: true };
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_ai_usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ p_user_id: userId, p_feature: feature }),
    });
    if (!resp.ok) return { allowed: true }; // fail open — don't block on infra error
    const result = await resp.json() as any;
    return {
      allowed: result.allowed ?? true,
      message: result.message,
      used: result.used,
      limit: result.limit,
    };
  } catch {
    return { allowed: true }; // fail open
  }
}

async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = [],
  maxTokens = 400
): Promise<string> {
  // __cf_env is injected at request time by patch-wrangler.mjs — always check it first
  const cfEnv = (globalThis as any).__cf_env || {};
  const apiKey =
    cfEnv.OPENAI_API_KEY ||
    cfEnv.OPEN_AI_API_KEY ||
    cfEnv["OPEN AI API KEY"] ||
    getEnvVar("OPENAI_API_KEY") ||
    "";

  console.log("[AI] callOpenAI — key exists:", !!apiKey, "prefix:", apiKey ? apiKey.slice(0, 8) : "MISSING");

  if (!apiKey) throw new Error("OpenAI API key not configured on server");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-6),
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any;
    console.error("[AI] OpenAI error:", response.status, err?.error?.message);
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }
  const result = await response.json() as any;
  const content = result.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("AI returned empty response");
  return content;
}

// ── Thesis Alignment — replaces direct browser call in DDWorkstation ──
export const analyzeThesisAlignment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): ThesisInput => data as ThesisInput)
  .handler(async ({ data }): Promise<AIResult> => {
    const usageCheck = await checkUsageCap(data.userId, "thesis");
    if (!usageCheck.allowed) {
      return { reply: usageCheck.message || "Daily AI limit reached.", error: "usage_limit" };
    }
    try {
      const systemPrompt = `You are a senior VC analyst. Analyze how a startup document aligns with an investor's thesis.
CRITICAL RULES:
- Quote SPECIFIC numbers from the document (e.g. "$0.6M pre-seed", "$20T market", "8% CAGR")
- Do NOT confuse example use-cases with the company sector (a trade-tech platform using rice as an example is NOT agriculture)
- If round stage mismatches investor preference, flag it as a hard ❌
- Use ✅ strong match, ⚠️ concern, ❌ red flag. Max 5 bullets.
- End with: **Overall Verdict**: one sentence`;
      const userMessage = `INVESTOR THESIS:\n${data.investorThesis}\n\n${data.documentContext}`;
      const reply = await callOpenAI(systemPrompt, userMessage, [], 400);
      return { reply, error: null };
    } catch (err: any) {
      return { reply: `Analysis failed: ${err.message}`, error: err.message };
    }
  });

// ── Document AI Summary — replaces direct browser call in deal-room ──
export const generateDocSummary = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): SummaryInput => data as SummaryInput)
  .handler(async ({ data }): Promise<AIResult> => {
    const usageCheck = await checkUsageCap(data.userId, "summary");
    if (!usageCheck.allowed) {
      return { reply: usageCheck.message || "Daily AI limit reached.", error: "usage_limit" };
    }
    try {
      const systemPrompt = `You are a VC analyst reviewing startup documents. Write a concise document summary in 4-6 bullet points. Each bullet starts with ✦. Be specific — extract real numbers, percentages, and facts from the content. Cover: business model, market size/opportunity, traction or revenue metrics, and key risks or highlights. If the document is a financial model, focus on unit economics and projections. If it's a pitch deck, focus on the problem, solution, and go-to-market. Never invent data not present in the text.`;
      const userMessage = `Document: ${data.fileName}\nCategory: ${data.category || "Other"}\n\nExtracted content:\n${data.documentContent}`;
      const reply = await callOpenAI(systemPrompt, userMessage, [], 400);
      return { reply, error: null };
    } catch (err: any) {
      return { reply: `Summary failed: ${err.message}`, error: err.message };
    }
  });

// ── Generic AI call — secure server-side proxy ──
export const secureAICall = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): GenericAIInput => data as GenericAIInput)
  .handler(async ({ data }): Promise<AIResult> => {
    const usageCheck = await checkUsageCap(data.userId, "qa_draft");
    if (!usageCheck.allowed) {
      return { reply: usageCheck.message || "Daily AI limit reached.", error: "usage_limit" };
    }
    try {
      const reply = await callOpenAI(
        data.systemPrompt,
        data.userMessage,
        data.history,
        data.maxTokens ?? 400
      );
      return { reply, error: null };
    } catch (err: any) {
      return { reply: `Request failed: ${err.message}`, error: err.message };
    }
  });