import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

type MemoInput = {
  dealRoomId: string;
  accessToken: string;
  supabaseUrl?: string;
};

export const generateInvestorMemo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): MemoInput => data as MemoInput)
  .handler(async ({ data }: { data: MemoInput }): Promise<{ memo: string }> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const openAIKey = cfEnv.OPENAI_API_KEY || getEnvVar("OPENAI_API_KEY");
    if (!openAIKey) {
      console.error("[investor-memo-fn] OPENAI_API_KEY not found in __cf_env");
      throw new Error('OpenAI API key not configured on server');
    }

    const supabaseUrl = data.supabaseUrl || getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    // Always the anon key here — never the service-role key. RLS must apply
    // under the caller's own forwarded token; there is no fallback path that
    // silently escalates to a full bypass. See CLAUDE.md §51.
    const supabaseAnonKey = getEnvVar("SUPABASE_ANON_KEY") || getEnvVar("VITE_SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing on server');
    }
    if (!data.accessToken) throw new Error('not_authenticated');

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    // Explicit membership check as a backstop — RLS should already scope
    // every query below, but verifying membership directly fails closed
    // with a clear error instead of silently returning empty/null fields.
    const { data: userData } = await client.auth.getUser(data.accessToken);
    const uid = userData?.user?.id;
    if (!uid) throw new Error('not_authenticated');
    const { data: member } = await client
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", uid)
      .maybeSingle();
    if (!member) throw new Error('not_authorized');

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

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({})) as any;
      throw new Error(`OpenAI error ${resp.status}: ${err?.error?.message ?? 'unknown'}`);
    }
    const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    return { memo: json.choices[0]?.message?.content ?? "" };
  });
