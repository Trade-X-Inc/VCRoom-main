import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type AdvisorInput = {
  userId: string;
  message: string;
  history: Array<{ role: string; content: string }>;
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
      process.env.OPENAI_API_KEY ||
      (globalThis as any).OPENAI_API_KEY || "";

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      (globalThis as any).SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_URL || "";

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      (globalThis as any).SUPABASE_SERVICE_ROLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY || "";

    if (!openAIKey) {
      return {
        reply: "AI Advisor is not configured yet. Please add your OpenAI API key to get started.",
        error: "missing_key",
      };
    }

    let context = "";
    if (supabaseUrl && supabaseKey) {
      try {
        const admin = createClient(supabaseUrl, supabaseKey);

        const [{ data: startup }, { data: leads }, { data: meetings }] = await Promise.all([
          admin.from("startups")
            .select("company_name, stage, sector, funding_target, revenue, traction")
            .eq("founder_id", data.userId)
            .maybeSingle(),
          admin.from("vc_leads")
            .select("investor_name, firm_name, status, follow_up_date")
            .eq("founder_id", data.userId),
          admin.from("meetings")
            .select("title, scheduled_at")
            .eq("created_by", data.userId)
            .gte("scheduled_at", new Date().toISOString())
            .limit(3),
        ]);

        if (startup) {
          context = [
            `Company: ${startup.company_name || "Not set"}`,
            `Stage: ${startup.stage || "Not set"}`,
            `Sector: ${startup.sector || "Not set"}`,
            `Raising: ${startup.funding_target || "Not set"}`,
            `ARR/Revenue: ${startup.revenue || "Not set"}`,
            `Traction: ${startup.traction || "Not set"}`,
            `Active leads: ${leads?.length || 0}`,
            `Upcoming meetings: ${meetings?.length || 0}`,
          ].join("\n");
        }
      } catch (e) {
        console.error("Context fetch failed:", e);
      }
    }

    // Build personalized identity from fetched startup data
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
