import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type LinkedInInput = { userId: string; leadId: string; openAIKey?: string };

export const generateLinkedInMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): LinkedInInput => data as LinkedInInput)
  .handler(async ({ data }: { data: LinkedInInput }) => {
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

    const { data: lead } = await adminClient
      .from("vc_leads")
      .select("*")
      .eq("id", data.leadId)
      .eq("founder_id", data.userId)
      .maybeSingle();
    if (!lead) throw new Error("Lead not found");

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

    await adminClient.from("ai_usage").insert({ user_id: data.userId, action: "linkedin_gen" });
    return { message };
  });
