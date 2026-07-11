import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

type LeadData = {
  id: string;
  investor_name: string;
  firm_name?: string | null;
  sector?: string | null;
  stage?: string | null;
};

type LinkedInInput = { userId: string; leadData: LeadData; openAIKey?: string };

export const generateLinkedInMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): LinkedInInput => data as LinkedInInput)
  .handler(async ({ data }: { data: LinkedInInput }) => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const serviceKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const cfEnv = (globalThis as any).__cf_env || {};
    const openAIKey = cfEnv.OPENAI_API_KEY || getEnvVar("OPENAI_API_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase not configured");
    const adminClient = createClient(supabaseUrl, serviceKey);
    const lead = data.leadData;

    const { data: startup } = await adminClient
      .from("startups")
      .select("company_name, sector, stage, funding_target, founder_name")
      .eq("founder_id", data.userId)
      .limit(1)
      .maybeSingle();

    const userPrompt = `Write a LinkedIn connection request from ${startup?.founder_name ?? "a founder"} of ${startup?.company_name ?? "a startup"} to ${lead.investor_name}${lead.firm_name ? ` at ${lead.firm_name}` : ""}.
Startup: ${startup?.sector ?? lead.sector ?? "tech"} sector, ${startup?.stage ?? lead.stage ?? "early"} stage, raising ${startup?.funding_target ?? "seed round"}.
Keep the message under 300 characters. Be genuine and specific, not salesy. Just ask to connect.`;

    if (!openAIKey) throw new Error("OpenAI not configured");
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 150,
        temperature: 0.7,
        messages: [
          { role: "system", content: "You write short LinkedIn connection request messages. Return only the message text, no quotes, no explanation." },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!resp.ok) throw new Error("OpenAI request failed");

    const json = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const message = (json.choices[0]?.message?.content ?? "").trim();
    if (!message) throw new Error("Invalid AI response");

    const { error: usageErr } = await adminClient.from("ai_usage").insert({ user_id: data.userId, action: "linkedin_gen" });
    if (usageErr) console.error("[linkedin-fn] usage log failed:", usageErr.message);
    return { message };
  });
