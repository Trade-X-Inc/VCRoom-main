import { createServerFn } from "@tanstack/react-start";

type VisionInput = { base64Image: string; pageNum: number };
type VisionResult = { text: string | null };

export const visionExtractPage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as VisionInput)
  .handler(async ({ data }): Promise<VisionResult> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const apiKey =
      cfEnv.OPENAI_API_KEY ||
      cfEnv.OPEN_AI_API_KEY ||
      cfEnv["OPEN AI API KEY"] ||
      (typeof process !== "undefined" ? process.env.OPENAI_API_KEY : "") ||
      "";

    if (!apiKey) {
      console.error("[vision-extract-fn] No OpenAI key");
      return { text: null };
    }

    const { base64Image, pageNum } = data;

    const prompt =
      "This is a page from a startup pitch deck. Extract any of the following if present: " +
      "founder name, email address, company name, funding stage, sector/industry, " +
      "geography/location, funding amount being raised, website URL, LinkedIn URL. " +
      "Return as JSON with these keys: founder_name, email, company_name, funding_stage, " +
      "sector, geography, funding_amount, website, linkedin. " +
      "If this page contains none of these fields, return { \"found\": false }.";

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: "low" },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error(`[vision-extract-fn] page ${pageNum} API error ${response.status}`);
        return { text: null };
      }

      const result = (await response.json()) as any;
      const raw: string = result.choices?.[0]?.message?.content || "";
      if (!raw) return { text: null };

      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return { text: raw.slice(0, 500) };
      }

      if (parsed?.found === false) return { text: null };

      // Flatten extracted fields into a readable string for the intake pipeline
      const parts: string[] = [];
      if (parsed.company_name) parts.push(`Company: ${parsed.company_name}`);
      if (parsed.founder_name) parts.push(`Founder: ${parsed.founder_name}`);
      if (parsed.email) parts.push(`Email: ${parsed.email}`);
      if (parsed.funding_stage) parts.push(`Stage: ${parsed.funding_stage}`);
      if (parsed.sector) parts.push(`Sector: ${parsed.sector}`);
      if (parsed.geography) parts.push(`Location: ${parsed.geography}`);
      if (parsed.funding_amount) parts.push(`Raising: ${parsed.funding_amount}`);
      if (parsed.website) parts.push(`Website: ${parsed.website}`);
      if (parsed.linkedin) parts.push(`LinkedIn: ${parsed.linkedin}`);

      if (parts.length === 0) return { text: null };
      return { text: parts.join("\n") };
    } catch (err) {
      console.error(`[vision-extract-fn] page ${pageNum} error:`, err);
      return { text: null };
    }
  });
