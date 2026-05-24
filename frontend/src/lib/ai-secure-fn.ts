import { createServerFn } from "@tanstack/react-start";

// ── getEnvVar: reads from server env only (never exposed to browser) ──
function getEnvVar(key: string): string {
  return (
    (import.meta.env as any)[key] ||
    (typeof process !== "undefined" ? process.env[key] : "") ||
    ""
  );
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

async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = [],
  maxTokens = 400
): Promise<string> {
  const apiKey = getEnvVar("OPENAI_API_KEY");
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
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }
  const result = await response.json() as any;
  return result.choices[0].message.content;
}

// ── Thesis Alignment — replaces direct browser call in DDWorkstation ──
export const analyzeThesisAlignment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): ThesisInput => data as ThesisInput)
  .handler(async ({ data }): Promise<AIResult> => {
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
    try {
      const systemPrompt = `You are a VC analyst reading startup documents. Extract key facts in exactly 4 concise bullet points. Each bullet: one sentence, start with a ✦ symbol. Focus on: business model, market size, traction/revenue, team or product highlights. No fluff.`;
      const userMessage = `Document: ${data.fileName}\nCategory: ${data.category || "Other"}\n\nContent:\n${data.documentContent}`;
      const reply = await callOpenAI(systemPrompt, userMessage, [], 300);
      return { reply, error: null };
    } catch (err: any) {
      return { reply: `Summary failed: ${err.message}`, error: err.message };
    }
  });

// ── Generic AI call — secure server-side proxy ──
export const secureAICall = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): GenericAIInput => data as GenericAIInput)
  .handler(async ({ data }): Promise<AIResult> => {
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