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

    let advisorIdentity = "You are an expert startup fundraising advisor.";
    if (context) {
      const lines = context.split("\n");
      const get = (prefix: string) => lines.find((l) => l.startsWith(prefix))?.split(": ")[1]?.trim() ?? "";
      const company = get("Company");
      const stage = get("Stage");
      const sector = get("Sector");
      const raising = get("Raising");
      if (company && company !== "Not set") {
        advisorIdentity = `You are an expert startup fundraising advisor for ${company}, a ${stage !== "Not set" ? stage : "early-stage"} ${sector !== "Not set" ? sector : "tech"} startup raising ${raising !== "Not set" ? raising : "their next round"}.`;
      }
    }

    const systemPrompt = [
      advisorIdentity,
      "\nYou have full context on this founder's pipeline, leads, and meetings.",
      "Give specific, actionable advice — not generic tips.",
      "Use bullet points and clear structure. Max 200 words.",
      "Never say you cannot access information — use the context provided to give real advice.",
      "End every response with one clear **Next action** the founder should take today.",
      context ? `\n\nFounder context:\n${context}` : "",
    ].join("");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 400,
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
