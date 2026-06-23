import { createServerFn } from "@tanstack/react-start";

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

function getSupabaseServiceKey(): string {
  const cfEnv = (globalThis as any).__cf_env || {};
  return (
    cfEnv.SUPABASE_SERVICE_ROLE_KEY ||
    (typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : "") ||
    ""
  ) as string;
}

function getSupabaseUrl(): string {
  const cfEnv = (globalThis as any).__cf_env || {};
  return (
    cfEnv.SUPABASE_URL ||
    cfEnv.VITE_SUPABASE_URL ||
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : "") ||
    "https://ldimninnjlvxozubheib.supabase.co"
  ) as string;
}

async function callOpenAI(systemPrompt: string, userMessage: string, maxTokens = 2000): Promise<string> {
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
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any;
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }
  const result = await response.json() as any;
  const content = result.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("AI returned empty response");
  return content;
}

function parseJSON(raw: string): unknown[] {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("AI did not return an array");
  return parsed;
}

async function dbGet(path: string, query: string): Promise<any> {
  const url = `${getSupabaseUrl()}/rest/v1/${path}?${query}`;
  const res = await fetch(url, {
    headers: {
      apikey: getSupabaseServiceKey(),
      Authorization: `Bearer ${getSupabaseServiceKey()}`,
    },
  });
  if (!res.ok) throw new Error(`DB fetch error ${res.status}`);
  return res.json();
}

async function dbInsertMany(table: string, rows: object[]): Promise<any> {
  const res = await fetch(`${getSupabaseUrl()}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: getSupabaseServiceKey(),
      Authorization: `Bearer ${getSupabaseServiceKey()}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err?.message || `DB insert error ${res.status}`);
  }
  return res.json();
}

async function dbPatch(table: string, id: string, patch: object): Promise<void> {
  const res = await fetch(`${getSupabaseUrl()}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: getSupabaseServiceKey(),
      Authorization: `Bearer ${getSupabaseServiceKey()}`,
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err?.message || `DB patch error ${res.status}`);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type IntakeCandidate = {
  company_name: string | null;
  founder_name: string | null;
  contact_email: string | null;
  contact_link: string | null;
  raw_snippet: string | null;
  thesis_fit_score: number;
  thesis_fit_reasons: string[];
  matched_startup_id?: string | null;
  profile_slug?: string | null;
};

type ParseIntakeInput = {
  batchId: string;
  investorProfileId: string;
  rawInput: string;
};

export type ParseIntakeResult = {
  candidates: IntakeCandidate[];
  error: string | null;
};

// ── Main server function ───────────────────────────────────────────────────────

export const parseIntakeBatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ParseIntakeInput)
  .handler(async ({ data }): Promise<ParseIntakeResult> => {
    const { batchId, investorProfileId, rawInput } = data;

    // 1. Fetch investor thesis
    let thesis = "";
    let sectors = "";
    let stages = "";
    let geography = "";
    let checkMin = "";
    let checkMax = "";

    try {
      const profiles = await dbGet(
        "investor_profiles",
        `user_id=eq.${investorProfileId}&select=thesis,sectors,stages,geography,check_size_min,check_size_max&limit=1`
      );
      if (profiles?.length) {
        const p = profiles[0];
        thesis = p.thesis || "";
        sectors = p.sectors || "";
        stages = p.stages || "";
        geography = p.geography || "";
        checkMin = p.check_size_min || "";
        checkMax = p.check_size_max || "";
      }
    } catch {
      // Non-fatal — proceed without thesis context
    }

    const thesisBlock = [
      sectors ? `Sectors: ${sectors}` : "",
      stages ? `Stages: ${stages}` : "",
      geography ? `Geography: ${geography}` : "",
      checkMin || checkMax ? `Check size: $${checkMin}–$${checkMax}` : "",
      thesis ? `Thesis notes: ${thesis}` : "",
    ].filter(Boolean).join("\n");

    const systemPrompt = `You are helping a VC sort through unstructured notes to find founder leads.
Below is raw pasted text that may contain multiple founders, companies, contacts, or links mixed together with unrelated content.

Extract every distinct founder/company mention you can find. For each one return a JSON object with exactly these keys:
{
  "company_name": string or null,
  "founder_name": string or null,
  "contact_email": string or null,
  "contact_link": string or null,
  "raw_snippet": "the exact text this came from (max 300 chars)",
  "thesis_fit_score": integer 0-100 based on the investor thesis below,
  "thesis_fit_reasons": ["array of 1-3 short reasons for the score"]
}

Investor thesis:
${thesisBlock || "No thesis provided — score based on general VC quality signals."}

Scoring guide:
- 80-100: Strong match on sector, stage, AND geography
- 60-79: Matches 2 of the 3 criteria
- 40-59: Weak match or insufficient info
- 0-39: Clear mismatch or no relevant signals

Rules:
- Only extract founders/companies actually present in the text — do NOT fabricate.
- If the text contains no identifiable founders or companies, return an empty array [].
- Be conservative: a name alone without any business context does not count.
- thesis_fit_reasons must each be one short sentence.
- raw_snippet should be verbatim text, not a paraphrase.

Return ONLY a valid JSON array. No markdown, no explanation, no wrapper object.`;

    const userMessage = `Pasted text:\n\n${rawInput.slice(0, 14000)}`;

    let candidates: IntakeCandidate[] = [];
    let parseError: string | null = null;

    try {
      const raw = await callOpenAI(systemPrompt, userMessage, 2000);
      try {
        candidates = parseJSON(raw) as IntakeCandidate[];
      } catch {
        // Retry once with stricter instruction
        const raw2 = await callOpenAI(
          systemPrompt + "\n\nCRITICAL: Return ONLY the raw JSON array. No markdown, no backticks, no explanation. Start your response with [ and end with ].",
          userMessage,
          2000
        );
        candidates = parseJSON(raw2) as IntakeCandidate[];
      }
    } catch (err: any) {
      parseError = err.message;
      await dbPatch("investor_intake_batches", batchId, { status: "failed" });
      return { candidates: [], error: parseError };
    }

    // 2. For each candidate, try matching against existing startups
    const enriched: IntakeCandidate[] = [];
    for (const c of candidates) {
      let matchedId: string | null = null;
      let profileSlug: string | null = null;

      if (c.company_name) {
        try {
          const matches = await dbGet(
            "startups",
            `company_name=ilike.${encodeURIComponent(c.company_name)}&select=id,profile_slug&limit=1`
          );
          if (matches?.length) {
            matchedId = matches[0].id;
            profileSlug = matches[0].profile_slug ?? null;
          }
        } catch {
          // Non-fatal — leave unmatched
        }
      }

      enriched.push({
        ...c,
        matched_startup_id: matchedId,
        profile_slug: profileSlug,
        thesis_fit_score: Math.min(100, Math.max(0, Number(c.thesis_fit_score) || 0)),
        thesis_fit_reasons: Array.isArray(c.thesis_fit_reasons) ? c.thesis_fit_reasons.slice(0, 3) : [],
      });
    }

    // 3. Bulk insert candidates
    if (enriched.length > 0) {
      const rows = enriched.map((c) => ({
        batch_id: batchId,
        investor_profile_id: investorProfileId,
        company_name: c.company_name ?? null,
        founder_name: c.founder_name ?? null,
        contact_email: c.contact_email ?? null,
        contact_link: c.contact_link ?? null,
        raw_snippet: c.raw_snippet ?? null,
        thesis_fit_score: c.thesis_fit_score,
        thesis_fit_reasons: c.thesis_fit_reasons,
        matched_startup_id: c.matched_startup_id ?? null,
        status: "new",
      }));

      try {
        await dbInsertMany("investor_intake_candidates", rows);
      } catch (err: any) {
        await dbPatch("investor_intake_batches", batchId, { status: "failed" });
        return { candidates: [], error: `DB insert failed: ${err.message}` };
      }
    }

    // 4. Update batch status
    await dbPatch("investor_intake_batches", batchId, {
      status: "parsed",
      parsed_count: enriched.length,
      processed_at: new Date().toISOString(),
    });

    return { candidates: enriched, error: null };
  });
