import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

const systemPrompt = `You are an expert fundraising advisor helping startup founders write concise, personalized investor outreach emails.
Respond ONLY with valid JSON. No markdown, no code fences, no explanation.
{"subject":"...","body":"..."}`;

type LeadData = {
  id: string;
  investor_name: string;
  firm_name?: string | null;
  sector?: string | null;
  stage?: string | null;
  status?: string | null;
  notes?: string | null;
};

type EmailInput = {
  leadData: LeadData;
  type: "cold" | "followup";
  userId: string;
  openAIKey?: string;
};

export const generateOutreachEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): EmailInput => data as EmailInput)
  .handler(async ({ data }: { data: EmailInput }) => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const serviceKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    const cfEnv = (globalThis as any).__cf_env || {};
    const openAIKey = cfEnv.OPENAI_API_KEY || getEnvVar("OPENAI_API_KEY");
    if (!supabaseUrl || !serviceKey) {
      return {
        subject: "Unable to generate",
        body: "AI service temporarily unavailable. Please try again later.",
      };
    }
    const adminClient = createClient(supabaseUrl, serviceKey);
    const lead = data.leadData;

    // 1. Rate limit: max 10 per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await adminClient
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.userId)
      .eq("action", "email_gen")
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 10) throw new Error("Rate limit exceeded");

    // 2. Fetch startup profile
    const { data: startup } = await adminClient
      .from("startups")
      .select("*")
      .eq("founder_id", data.userId)
      .limit(1)
      .maybeSingle();

    // 3. Build prompt
    const userPrompt =
      data.type === "cold"
        ? `Write a cold outreach email from ${startup?.company_name ?? "our startup"} founder to ${lead.investor_name} at ${lead.firm_name ?? "their firm"}.
Startup: ${startup?.sector ?? lead.sector ?? "tech"} sector, ${startup?.stage ?? lead.stage ?? "early"} stage, raising ${startup?.funding_target ?? "seed round"}.
Investor focus: ${lead.sector ?? "various"}, ${lead.stage ?? "early-stage"}.
Keep it under 120 words. Be specific, not generic.
Subject line should be intriguing, under 8 words.`
        : `Write a follow-up email. The founder previously contacted ${lead.investor_name} at ${lead.firm_name ?? "their firm"}.
Current status: ${lead.status}.
Notes context: ${lead.notes ?? "none"}.
Keep it under 80 words. Reference prior contact.
Be warm but direct.`;

    // 4. Call OpenAI
    if (!openAIKey) {
      return {
        subject: "Unable to generate",
        body: "AI service temporarily unavailable. Please configure OPENAI_API_KEY.",
      };
    }
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!resp.ok) throw new Error("OpenAI request failed");

    // 5. Parse response
    const json = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const raw = json.choices[0]?.message?.content ?? "";

    if (!raw.trim()) throw new Error("AI returned empty response");

    const cleaned = raw
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: { subject: string; body: string };
    try {
      parsed = JSON.parse(cleaned) as { subject: string; body: string };
    } catch {
      console.error("[ai-fn] JSON parse failed, raw:", cleaned.slice(0, 200));
      throw new Error("AI returned malformed JSON");
    }
    if (!parsed.subject || !parsed.body) throw new Error("Invalid AI response");

    // 6. Log usage
    const { error: usageErr } = await adminClient.from("ai_usage").insert({ user_id: data.userId, action: "email_gen" });
    if (usageErr) console.error("[ai-fn] usage log failed:", usageErr.message);

    // 7. Return
    return { subject: parsed.subject, body: parsed.body };
  });
