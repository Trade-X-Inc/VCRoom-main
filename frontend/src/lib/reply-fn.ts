import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type LeadData = {
  id: string;
  investor_name: string;
  firm_name?: string | null;
  sector?: string | null;
  stage?: string | null;
  status?: string | null;
};

type ReplyInput = {
  userId: string;
  leadData: LeadData;
  investorReply: string;
  tone?: string;
  openAIKey?: string;
};

export const generateReply = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): ReplyInput => data as ReplyInput)
  .handler(async ({ data }: { data: ReplyInput }) => {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      (globalThis as any).SUPABASE_URL ||
      (import.meta.env as any).VITE_SUPABASE_URL || "";
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      (globalThis as any).SUPABASE_SERVICE_ROLE_KEY ||
      (import.meta.env as any).VITE_SUPABASE_ANON_KEY || "";
    const openAIKey =
      data.openAIKey ||
      process.env.OPENAI_API_KEY ||
      (globalThis as any).OPENAI_API_KEY ||
      import.meta.env.VITE_OPENAI_API_KEY || "";
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase not configured");
    const adminClient = createClient(supabaseUrl, serviceKey);
    const lead = data.leadData;
    const tone = data.tone ?? "Professional";

    const { data: startup } = await adminClient
      .from("startups")
      .select("company_name, sector, stage, funding_target, founder_name")
      .eq("founder_id", data.userId)
      .limit(1)
      .maybeSingle();

    const userPrompt = `The investor ${lead.investor_name}${lead.firm_name ? ` from ${lead.firm_name}` : ""} replied to the founder:

"${data.investorReply}"

Write a ${tone.toLowerCase()} reply from ${startup?.founder_name ?? "the founder"} of ${startup?.company_name ?? "the startup"}.
Current lead status: ${lead.status ?? "active"}.
Startup: ${startup?.sector ?? lead.sector ?? "tech"} sector, ${startup?.stage ?? lead.stage ?? "early"} stage.
Keep it under 150 words. Use plain text with natural paragraph breaks. No ** or markdown symbols.`;

    if (!openAIKey) throw new Error("OpenAI not configured");
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are a startup founder assistant. Generate a ${tone.toLowerCase()} reply to an investor message. Return only the reply text, no subject line, no explanation, no markdown symbols.`,
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!resp.ok) throw new Error("OpenAI request failed");

    const json = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const reply = (json.choices[0]?.message?.content ?? "").trim();
    if (!reply) throw new Error("Invalid AI response");

    await adminClient.from("ai_usage").insert({ user_id: data.userId, action: "reply_gen" });
    return { reply };
  });
