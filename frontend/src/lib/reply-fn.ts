import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type ReplyInput = { userId: string; leadId: string; investorReply: string };

export const generateReply = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): ReplyInput => data as ReplyInput)
  .handler(async ({ data }: { data: ReplyInput }) => {
    const supabaseUrl = process.env.SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (import.meta.env as any).VITE_SUPABASE_ANON_KEY;
    const adminClient = createClient(supabaseUrl!, serviceKey!);

    const { data: lead, error: leadErr } = await adminClient
      .from("vc_leads")
      .select("*")
      .eq("id", data.leadId)
      .single();
    if (leadErr || !lead) throw new Error("Lead not found");
    if (lead.founder_id !== data.userId) throw new Error("Unauthorized");

    const { data: startup } = await adminClient
      .from("startups")
      .select("company_name, sector, stage, funding_target, founder_name")
      .eq("founder_id", data.userId)
      .limit(1)
      .maybeSingle();

    const userPrompt = `The investor ${lead.investor_name}${lead.firm_name ? ` from ${lead.firm_name}` : ""} replied to the founder:

"${data.investorReply}"

Write a professional follow-up reply from ${startup?.founder_name ?? "the founder"} of ${startup?.company_name ?? "the startup"}.
Current lead status: ${lead.status}.
Keep it under 150 words. Be warm, professional, and move the conversation forward.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          { role: "system", content: "You write professional email replies for startup founders responding to investors. Return only the reply text, no subject line, no explanation." },
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
