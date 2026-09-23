import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "@/lib/env";
import { requireUser } from "@/lib/require-user-fn";

type SuggestionsInput = {
  userAccessToken: string;
  question: string;
  startupName: string;
  sector: string;
  previousQuestions: string[];
};

// Reuses the same rate-limit RPC as every other AI feature (CLAUDE.md: do not rebuild).
async function checkUsageCap(userId: string, feature: string): Promise<{ allowed: boolean; message?: string }> {
  if (!userId) return { allowed: true };
  try {
    const supabaseUrl = getEnvVar("VITE_SUPABASE_URL") || getEnvVar("SUPABASE_URL");
    const supabaseKey = getEnvVar("VITE_SUPABASE_ANON_KEY") || getEnvVar("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) return { allowed: true };
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_and_increment_ai_usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify({ p_user_id: userId, p_feature: feature }),
    });
    if (!resp.ok) return { allowed: true };
    const result = await resp.json() as any;
    return { allowed: result.allowed ?? true, message: result.message };
  } catch {
    return { allowed: true };
  }
}

export const getQASuggestions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): SuggestionsInput => data as SuggestionsInput)
  .handler(async ({ data }: { data: SuggestionsInput }): Promise<{ suggestions: string[] }> => {
    // Identity is derived from the caller's own session token, never a
    // client-supplied id — see CLAUDE.md §51.
    const auth = await requireUser(data.userAccessToken);
    if (!auth.ok) return { suggestions: [] };
    const usageCheck = await checkUsageCap(auth.uid, "qa_suggestions");
    if (!usageCheck.allowed) return { suggestions: [] };

    const cfEnv = (globalThis as any).__cf_env || {};
    const openAIKey = cfEnv.OPENAI_API_KEY || getEnvVar("OPENAI_API_KEY");
    if (!openAIKey) {
      console.error("[qa-suggestions-fn] OPENAI_API_KEY not found in __cf_env");
      throw new Error('OpenAI API key not configured on server');
    }

    const prev =
      data.previousQuestions.length > 0
        ? data.previousQuestions.slice(-5).join("\n- ")
        : "None yet";

    const prompt = `You are a VC analyst. An investor just asked:
"${data.question}"

About startup: ${data.startupName} in ${data.sector}

Previous questions asked:
- ${prev}

Suggest 3 follow-up due diligence questions that a VC would ask next.
Return ONLY a JSON array of 3 strings. No explanation, no markdown, just the array:
["question1", "question2", "question3"]`;

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 200,
          temperature: 0.4,
          messages: [
            { role: "system", content: "You are a VC analyst. Return only valid JSON arrays." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!resp.ok) return { suggestions: [] };
      const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
      const content = (json.choices[0]?.message?.content ?? "").trim();
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
        return { suggestions: parsed.slice(0, 3) };
      }
    } catch {
      // silently fail — suggestions are non-critical
    }
    return { suggestions: [] };
  });
