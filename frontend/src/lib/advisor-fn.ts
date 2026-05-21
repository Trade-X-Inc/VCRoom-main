import { createServerFn } from "@tanstack/react-start";

type StartupContext = {
  companyName?: string;
  stage?: string;
  sector?: string;
  fundingTarget?: string;
  revenue?: string;
  traction?: string;
  leadCount?: number;
  meetingCount?: number;
};

type AdvisorInput = {
  userId: string;
  message: string;
  history: Array<{ role: string; content: string }>;
  startupContext?: StartupContext;
  openAIKey?: string;
};

type AdvisorResult = {
  reply: string;
  error: string | null;
};

export const getAIAdvice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): AdvisorInput => data as AdvisorInput)
  .handler(async ({ data }: { data: AdvisorInput }): Promise<AdvisorResult> => {
    const openAIKey =
      data.openAIKey ||
      (import.meta.env as any).VITE_OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      '';
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured on server');
    }

    let context = "";
    if (data.startupContext) {
      const sc = data.startupContext;
      context = [
        `Company: ${sc.companyName || "Not set"}`,
        `Stage: ${sc.stage || "Not set"}`,
        `Sector: ${sc.sector || "Not set"}`,
        `Raising: ${sc.fundingTarget || "Not set"}`,
        `ARR/Revenue: ${sc.revenue || "Not set"}`,
        `Traction: ${sc.traction || "Not set"}`,
        `Active leads: ${sc.leadCount ?? 0}`,
        `Upcoming meetings: ${sc.meetingCount ?? 0}`,
      ].join("\n");
    }

    const lines = context ? context.split("\n") : [];
    const get = (prefix: string) => lines.find((l) => l.startsWith(prefix))?.split(": ")[1]?.trim() ?? "Not set";
    const company = get("Company");
    const stage = get("Stage");
    const sector = get("Sector");
    const raising = get("Raising");

    let advisorIdentity = "You are an expert startup fundraising advisor.";
    if (company && company !== "Not set") {
      advisorIdentity = `You are an expert startup fundraising advisor for ${company}, a ${stage !== "Not set" ? stage : "early-stage"} ${sector !== "Not set" ? sector : "tech"} startup raising ${raising !== "Not set" ? raising : "their next round"}.`;
    }

    const systemPrompt = [
      advisorIdentity,
      "You are inside a deal room. Be concise, structured, and deal-specific.",
      "RULES:",
      "- Maximum 150 words per response",
      "- Use bold headers (**Header**) and bullet points only",
      "- Only discuss THIS deal, THIS company, THIS raise",
      "- Never give generic fundraising advice",
      "- Focus on: documents, DD status, risks, next steps for THIS deal",
      "- If asked something unrelated to the deal, redirect back to the deal",
      company !== "Not set" ? `Company: ${company}` : "",
      stage !== "Not set" ? `Stage: ${stage}` : "",
      sector !== "Not set" ? `Sector: ${sector}` : "",
      raising !== "Not set" ? `Raising: ${raising}` : "",
    ].filter(Boolean).join("\n");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 300,
          messages: [
            { role: "system", content: systemPrompt },
            ...data.history.slice(-6),
            { role: "user", content: data.message },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as any;
        console.error("OpenAI error:", err);
        return {
          reply: `AI error: ${err?.error?.message || "Unknown error"}`,
          error: "api_error",
        };
      }

      const result = await response.json() as { choices: Array<{ message: { content: string } }> };
      return {
        reply: result.choices[0].message.content,
        error: null,
      };
    } catch (err: any) {
      console.error("Fetch error:", err);
      return {
        reply: "Connection error. Please try again.",
        error: "fetch_error",
      };
    }
  });
