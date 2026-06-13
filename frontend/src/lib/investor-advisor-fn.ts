import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

type InvestorAdvisorInput = {
  userId: string;
  message: string;
  history: Array<{ role: string; content: string }>;
};

type InvestorAdvisorResult = {
  reply: string;
  error: string | null;
};

export const getInvestorAdvice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): InvestorAdvisorInput => data as InvestorAdvisorInput)
  .handler(async ({ data }: { data: InvestorAdvisorInput }): Promise<InvestorAdvisorResult> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const apiKey = cfEnv.OPENAI_API_KEY || cfEnv.OPEN_AI_API_KEY || cfEnv["OPEN AI API KEY"] || "";
    if (!apiKey) {
      console.error("[investor-advisor-fn] No OpenAI key found in __cf_env");
      return { reply: "AI Advisor is temporarily unavailable. Please try again in a moment.", error: "no_key" };
    }
    const baseUrl = "https://api.openai.com/v1";
    const model = "gpt-4o-mini";
    const extraHeaders: Record<string, string> = {};

    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

    let profile: any = null;
    let watchlistCount = 0;
    let diligenceCount = 0;
    let dealRoomCount = 0;

    if (supabaseUrl && supabaseKey) {
      try {
        const admin = createClient(supabaseUrl, supabaseKey);
        const [profileRes, watchlistRes, dealRoomMembersRes] = await Promise.all([
          admin.from("investor_profiles").select("*").eq("user_id", data.userId).maybeSingle(),
          admin.from("investor_watchlist").select("status").eq("investor_id", data.userId),
          admin.from("deal_room_members").select("deal_room_id").eq("user_id", data.userId),
        ]);

        profile = profileRes.data;
        const watchlist = watchlistRes.data ?? [];
        watchlistCount = watchlist.filter((w: any) => w.status === "Reviewing" || w.status === "Sourcing").length;
        diligenceCount = watchlist.filter((w: any) => w.status === "Diligence").length;
        dealRoomCount = (dealRoomMembersRes.data ?? []).length;
      } catch (e) {
        console.error("Investor context fetch failed:", e);
      }
    }

    const systemPrompt = `You are an expert investment analyst assistant for ${profile?.fund_name || "this VC fund"}.

Fund details:
- Thesis: ${profile?.thesis || "Not set"}
- Sectors: ${profile?.sectors || "Not set"}
- Stages: ${profile?.stages || "Not set"}
- Check size: ${profile?.check_size_min || "?"} - ${profile?.check_size_max || "?"}

Current pipeline:
- Companies being reviewed: ${watchlistCount}
- In diligence: ${diligenceCount}
- Deal rooms active: ${dealRoomCount}

Help with:
- Evaluating startups against thesis
- Due diligence frameworks
- Term sheet analysis
- Portfolio strategy
- Market research

Format with markdown, bullet points, emojis.
Max 200 words. End with clear next action.`;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify({
          model,
          max_tokens: 500,
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
