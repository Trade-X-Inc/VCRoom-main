import { createServerFn } from "@tanstack/react-start";

type SuggestionsInput = {
  question: string;
  startupName: string;
  sector: string;
  previousQuestions: string[];
  openAIKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export const getQASuggestions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): SuggestionsInput => data as SuggestionsInput)
  .handler(async ({ data }: { data: SuggestionsInput }): Promise<{ suggestions: string[] }> => {
    const openAIKey =
      data.openAIKey ||
      (globalThis as any).VITE_OPENAI_API_KEY ||
      (globalThis as any).OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    if (!openAIKey) return { suggestions: [] };

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
      // silently fail
    }
    return { suggestions: [] };
  });
