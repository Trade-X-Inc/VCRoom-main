import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type AdvisorInput = {
  userId: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

type AdvisorResult = {
  reply: string;
  rateLimitRemaining: number;
};

export const sendAdvisorMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): AdvisorInput => data as AdvisorInput)
  .handler(async ({ data }: { data: AdvisorInput }): Promise<AdvisorResult> => {
    const supabaseUrl = process.env.SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (import.meta.env as any).VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      return {
        reply: "AI Advisor requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your server environment. Add them to your .env file in the project root.",
        rateLimitRemaining: 20,
      };
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Rate limit: 20 per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: usedToday } = await adminClient
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.userId)
      .eq("action", "advisor_message")
      .gte("created_at", todayStart.toISOString());
    const used = usedToday ?? 0;
    if (used >= 20) throw new Error("RATE_LIMIT: Daily limit of 20 messages reached. Resets tomorrow.");

    // Fetch full context
    const [startup, leads, meetings, dealRooms] = await Promise.all([
      adminClient.from("startups")
        .select("*")
        .eq("founder_id", data.userId)
        .maybeSingle()
        .then((r) => r.data),
      adminClient.from("vc_leads")
        .select("investor_name, firm_name, status, follow_up_date, email, next_action")
        .eq("founder_id", data.userId)
        .then((r) => r.data || []),
      adminClient.from("meetings")
        .select("title, scheduled_at, platform, prep_notes")
        .eq("created_by", data.userId)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5)
        .then((r) => r.data || []),
      adminClient.from("deal_rooms")
        .select("id, status, updated_at")
        .limit(20)
        .then((r) => r.data || []),
    ]);

    const statusCounts = [
      "New", "Shortlisted", "Contacted", "Replied",
      "Meeting Booked", "Interested",
      "Deal Room Created", "Rejected", "Follow Up",
    ].map((s) => ({
      status: s,
      count: (leads as any[]).filter((l) => l.status === s).length,
    })).filter((s) => s.count > 0);

    const overdueFollowUps = (leads as any[]).filter((l) =>
      l.follow_up_date && new Date(l.follow_up_date) < new Date()
    );

    const systemPrompt = `You are an expert fundraising advisor for ${(startup as any)?.company_name || "this startup"}.

COMPANY: ${(startup as any)?.company_name || "Not set"}
STAGE: ${(startup as any)?.stage || "Not set"}
SECTOR: ${(startup as any)?.sector || "Not set"}
RAISING: ${(startup as any)?.funding_target || "Not set"}
ARR: ${(startup as any)?.revenue || "Not set"}
TRACTION: ${(startup as any)?.traction || "Not set"}

PIPELINE SUMMARY (${(leads as any[]).length} total leads):
${statusCounts.map((s) => `  ${s.status}: ${s.count}`).join("\n") || "  No leads yet"}

${overdueFollowUps.length > 0
  ? `OVERDUE FOLLOW-UPS (${overdueFollowUps.length}):
${overdueFollowUps.slice(0, 5).map((l) => `  - ${(l as any).investor_name} at ${(l as any).firm_name || "unknown firm"} (due ${(l as any).follow_up_date})`).join("\n")}`
  : "No overdue follow-ups"}

${(meetings as any[]).length > 0
  ? `UPCOMING MEETINGS:\n${(meetings as any[]).map((m) => `  - ${m.title} on ${new Date(m.scheduled_at).toLocaleDateString()}`).join("\n")}`
  : "No upcoming meetings scheduled"}

DEAL ROOMS: ${(dealRooms as any[]).length} active

YOUR ROLE:
You are a senior fundraising advisor. Help the founder with:
- Pipeline analysis and prioritization
- Follow-up strategies for specific investors
- Meeting preparation
- Email and outreach advice
- Deal room strategy
- Investor objection handling
- Round strategy and timing

Always reference specific investors/meetings from the data above when relevant.
Be direct and actionable.
Max 150 words per response unless asked for more.
End every response with one clear next action.`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      await adminClient.from("ai_usage").insert({ user_id: data.userId, action: "advisor_message" });
      return {
        reply: (startup as any)?.company_name
          ? `Based on your pipeline (${(leads as any[]).length} leads, ${(dealRooms as any[]).length} deal rooms): Focus on converting meeting-stage leads first. Follow up within 48h of each meeting with a 3-bullet summary and a clear next step.`
          : "Complete your startup profile first — I'll give you much more specific advice once I can see your stage, sector, metrics, and fundraising target.",
        rateLimitRemaining: 20 - used - 1,
      };
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          ...data.messages,
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`OpenAI request failed (${resp.status}): ${errText}`);
    }
    const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    const reply = json.choices[0]?.message?.content ?? "No response generated.";

    await adminClient.from("ai_usage").insert({ user_id: data.userId, action: "advisor_message" });

    return { reply, rateLimitRemaining: 20 - used - 1 };
  });
