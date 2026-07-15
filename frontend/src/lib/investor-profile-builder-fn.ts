import { createServerFn } from "@tanstack/react-start";

// ── AI extraction for "upload fund deck → prefill profile" (R4B). ──────────
// Mirrors src/lib/profile-builder-fn.ts's extraction pattern exactly (same
// gpt-4o-mini call shape, same JSON-cleanup, same retry-once-on-parse-failure)
// and reuses ai-secure-fn.ts's rate-limit convention rather than inventing a
// new one — this is the "prefill" pass; extracted values always land as
// draft form state the investor must explicitly confirm before saving.

function getOpenAIKey(): string {
  const cfEnv = (globalThis as any).__cf_env || {};
  return (
    cfEnv.OPENAI_API_KEY ||
    cfEnv.OPEN_AI_API_KEY ||
    cfEnv["OPEN AI API KEY"] ||
    (typeof process !== "undefined" ? process.env.OPENAI_API_KEY : "") ||
    ""
  ) as string;
}

function getEnvVar(key: string): string {
  const cfEnv = (globalThis as any).__cf_env || {};
  return (cfEnv[key] || (typeof process !== "undefined" ? process.env[key] : "") || "") as string;
}

async function checkUsageCap(userId: string, feature: string): Promise<{ allowed: boolean; message?: string }> {
  if (!userId) return { allowed: true };
  try {
    const supabaseUrl = getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL");
    const supabaseKey = getEnvVar("VITE_SUPABASE_ANON_KEY") || getEnvVar("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) return { allowed: true };
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_ai_usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ p_user_id: userId, p_feature: feature }),
    });
    if (!resp.ok) return { allowed: true };
    const result = (await resp.json()) as any;
    return { allowed: result.allowed ?? true, message: result.message };
  } catch {
    return { allowed: true };
  }
}

const FUND_DECK_SCHEMA = `{
  "fund_name": "string or null",
  "your_name": "string or null",
  "role": "string or null",
  "fund_size": "string or null",
  "thesis_statement": "string or null",
  "sectors": "string or null (comma-separated)",
  "stages": ["array of stage strings, e.g. Seed, Series A"],
  "check_size_min": "string or null",
  "check_size_max": "string or null",
  "geography": "string or null",
  "track_record": [{"label": "string, e.g. company name or exit", "detail": "string, e.g. round led and outcome"}],
  "missing_fields": ["array of field names not found"]
}`;

async function callOpenAI(systemPrompt: string, userMessage: string, maxTokens = 1200): Promise<string> {
  const apiKey = getOpenAIKey();
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
        { role: "user", content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as any;
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }
  const result = (await response.json()) as any;
  const content = result.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("AI returned empty response");
  return content;
}

function parseExtractionJSON(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

type FundDeckExtractInput = {
  userId: string;
  documentText: string;
  fileName: string;
};

type FundDeckExtractResult = {
  data: Record<string, unknown> | null;
  missing_fields: string[];
  error: string | null;
};

export const extractInvestorProfileFromDeck = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as FundDeckExtractInput)
  .handler(async ({ data }): Promise<FundDeckExtractResult> => {
    const usage = await checkUsageCap(data.userId, "investor_profile_extract");
    if (!usage.allowed) {
      return { data: null, missing_fields: [], error: usage.message || "Daily AI limit reached" };
    }

    const systemPrompt = `You are an expert at extracting structured venture fund data from fund decks and one-pagers.
Return ONLY valid JSON — no markdown, no explanation, no extra text.
The JSON must exactly match this schema:
${FUND_DECK_SCHEMA}

Rules:
- Only fill a field if there is clear textual evidence in the document.
- Do NOT guess, invent, or fabricate any data — this is a draft prefill the investor must confirm, never publish unverified numbers as fact.
- track_record is an array of {label, detail} for named portfolio companies, exits, or notable investments explicitly mentioned. If none found, set to [].
- missing_fields must list every top-level key that is null, empty string, or empty array.`;

    const userMessage = `Extract structured fund profile data from this document (file: ${data.fileName}):

${data.documentText.slice(0, 12000)}`;

    try {
      const raw = await callOpenAI(systemPrompt, userMessage, 1200);
      try {
        const parsed = parseExtractionJSON(raw);
        const missing = Array.isArray(parsed.missing_fields) ? (parsed.missing_fields as string[]) : [];
        return { data: parsed, missing_fields: missing, error: null };
      } catch {
        const raw2 = await callOpenAI(
          systemPrompt + "\n\nCRITICAL: Return ONLY the raw JSON object. No markdown, no backticks, no explanation whatsoever.",
          userMessage,
          1200,
        );
        const parsed = parseExtractionJSON(raw2);
        const missing = Array.isArray(parsed.missing_fields) ? (parsed.missing_fields as string[]) : [];
        return { data: parsed, missing_fields: missing, error: null };
      }
    } catch (err: any) {
      return { data: null, missing_fields: [], error: err.message };
    }
  });
