import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type MemoInput = {
  dealRoomId: string;
  userId: string;
  openAIKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  userAccessToken?: string;
};

export const generateInvestorMemo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): MemoInput => data as MemoInput)
  .handler(async ({ data }: { data: MemoInput }): Promise<{ memo: string }> => {
    console.log('Memo fn called');
    const supabaseUrl =
      data.supabaseUrl ||
      process.env.VITE_SUPABASE_URL ||
      (globalThis as any).VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      (globalThis as any).SUPABASE_URL ||
      "";
    const supabaseKey =
      data.supabaseAnonKey ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      (globalThis as any).VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      (globalThis as any).SUPABASE_ANON_KEY ||
      "";
    const openAIKey =
      data.openAIKey ||
      (globalThis as any).VITE_OPENAI_API_KEY ||
      (globalThis as any).OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    console.log('OpenAI key present:', !!openAIKey);

    if (!supabaseUrl || !supabaseKey || !openAIKey) {
      return {
        memo: `## Investment Memo\n\n*AI analysis requires OpenAI and Supabase configuration.*`,
      };
    }

    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${data.userAccessToken ?? ""}` } },
    });

    // 1. Fetch deal room + startup
    const { data: room } = await client
      .from("deal_rooms")
      .select("startup_id")
      .eq("id", data.dealRoomId)
      .single();

    const { data: startup } = room?.startup_id
      ? await client
          .from("startups")
          .select("company_name, sector, stage, funding_target, traction, description, revenue, founder_name, team_size")
          .eq("id", room.startup_id)
          .maybeSingle()
      : { data: null };

    console.log('Startup data:', { name: startup?.company_name, sector: startup?.sector, stage: startup?.stage });

    // 2. Fetch documents list
    const { data: docs } = await client
      .from("documents")
      .select("name, category")
      .eq("deal_room_id", data.dealRoomId);

    // 3. Fetch Q&A messages
    const { data: messages } = await client
      .from("messages")
      .select("body, metadata, is_qa")
      .eq("deal_room_id", data.dealRoomId)
      .order("created_at", { ascending: false })
      .limit(20);

    // 4. Fetch task completion
    const { data: tasks } = await client
      .from("deal_tasks")
      .select("completed")
      .eq("deal_room_id", data.dealRoomId);

    const totalTasks = tasks?.length ?? 0;
    const doneTasks = tasks?.filter((t) => t.completed).length ?? 0;
    const taskCompletion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const docList =
      (docs ?? []).map((d) => `${d.name}${d.category ? ` (${d.category})` : ""}`).join(", ") ||
      "None uploaded";
    const qaSummary =
      (messages ?? [])
        .filter((m) => m.is_qa)
        .slice(0, 8)
        .map(
          (m) =>
            `Q: ${m.body}${m.metadata?.answer ? `\nA: ${m.metadata.answer}` : " [unanswered]"}`,
        )
        .join("\n\n") || "No Q&A yet";

    const prompt = `Generate an investment memo for this startup:

Company: ${startup?.company_name ?? "Unknown"}
Sector: ${startup?.sector ?? "Unknown"}
Stage: ${startup?.stage ?? "Unknown"}
Raising: ${startup?.funding_target ?? "Unknown"}
Revenue: ${startup?.revenue ?? "Not disclosed"}
Traction: ${startup?.traction ?? "Not provided"}
Team size: ${startup?.team_size ?? "Unknown"}

Documents in data room: ${docList}
Q&A exchanges:
${qaSummary}
Diligence completion: ${taskCompletion}%

Generate a memo with EXACTLY this structure:

## Executive Summary
[2-3 sentences on the opportunity]

## Market Opportunity
Rating: X/10
[Assessment of market size and timing]

## Team Assessment
Rating: X/10
[Assessment of founding team]

## Traction & Metrics
[Key numbers and growth indicators]

## Key Risks
- [Risk 1]
- [Risk 2]
- [Risk 3]

## Red Flags
[Any concerning issues, or 'None identified']

## Investment Recommendation
Verdict: [STRONG BUY / BUY / HOLD / PASS]
[2-3 sentence rationale]`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1600,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a senior VC analyst with 15 years of experience. Generate structured investment memos.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) throw new Error("OpenAI request failed");
    const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    return { memo: json.choices[0]?.message?.content ?? "" };
  });
